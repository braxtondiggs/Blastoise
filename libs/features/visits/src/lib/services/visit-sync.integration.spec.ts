import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { VisitSyncService } from './visit-sync';
import { VisitTrackerService } from './visit-tracker';
import { GeofenceService } from './geofence';
import { AuthService } from '@blastoise/features-auth';
import { VisitsApiService } from '@blastoise/data';
import { VisitsLocalRepository } from '@blastoise/data';
import {
  Visit,
  Venue,
  GeofenceEvent,
  GeofenceTransition,
  ApiResponse,
  BatchVisitSyncDto,
} from '@blastoise/shared';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { delay, filter } from 'rxjs/operators';

/**
 * Tests the complete offline-to-online synchronization workflow:
 * 1. User visits venue (offline)
 * 2. Visit stored locally in IndexedDB
 * 3. Network comes back online
 * 4. Visit synced to server via batch endpoint
 * 5. Local visit updated with server ID
 */

// Mock Services
class MockAuthService {
  private user = { id: 'test-user-123', email: 'test@example.com' };
  private anonymous = false;

  currentUser() {
    return this.user;
  }

  getUserId(): string {
    return this.user.id;
  }

  isAnonymous(): boolean {
    return this.anonymous;
  }

  setAnonymous(value: boolean): void {
    this.anonymous = value;
  }
}

class MockGeofenceService {
  private transitionsSubject = new BehaviorSubject<GeofenceTransition | null>(
    null
  );

  async startTracking(): Promise<void> {
    // Mock implementation
  }

  async stopTracking(): Promise<void> {
    // Mock implementation
  }

  getGeofenceTransitions() {
    return this.transitionsSubject.asObservable().pipe(
      filter((transition): transition is GeofenceTransition => transition !== null)
    );
  }

  emitTransition(transition: GeofenceTransition): void {
    this.transitionsSubject.next(transition);
  }
}

class MockVisitsApiService {
  private networkOnline = true;
  private callCount = 0;

  setNetworkOnline(online: boolean): void {
    this.networkOnline = online;
  }

  getCallCount(): number {
    return this.callCount;
  }

  resetCallCount(): void {
    this.callCount = 0;
  }

  batchSync(dto: BatchVisitSyncDto) {
    this.callCount++;

    if (!this.networkOnline) {
      return throwError(() => new Error('Network error: offline'));
    }

    // Simulate server processing with delay
    const serverVisits: Visit[] = dto.visits.map((v, index) => ({
      id: `server-id-${Date.now()}-${index}`,
      user_id: v.user_id!,
      venue_id: v.venue_id,
      arrival_time: v.arrival_time,
      departure_time: v.departure_time,
      duration_minutes: v.duration_minutes,
      is_active: v.is_active,
      detection_method: v.detection_method,
      synced: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const response: ApiResponse<Visit[]> = {
      success: true,
      data: serverVisits,
    };

    return of(response).pipe(delay(100)); // Simulate network latency
  }
}

class MockVisitsLocalRepository {
  private visits: Visit[] = [];

  async save(visit: Visit): Promise<Visit> {
    const index = this.visits.findIndex((v) => v.id === visit.id);
    if (index >= 0) {
      this.visits[index] = visit;
    } else {
      this.visits.push(visit);
    }
    return visit;
  }

  async findUnsynced(): Promise<Visit[]> {
    return this.visits.filter((v) => !v.synced);
  }

  async findById(id: string): Promise<Visit | null> {
    return this.visits.find((v) => v.id === id) || null;
  }

  async deleteById(id: string): Promise<void> {
    this.visits = this.visits.filter((v) => v.id !== id);
  }

  getAll(): Visit[] {
    return [...this.visits];
  }

  clear(): void {
    this.visits = [];
  }
}

describe('T118: Offline Sync Flow Integration Test', () => {
  let visitTrackerService: VisitTrackerService;
  let visitSyncService: VisitSyncService;
  let mockAuthService: MockAuthService;
  let mockGeofenceService: MockGeofenceService;
  let mockApiService: MockVisitsApiService;
  let mockLocalRepo: MockVisitsLocalRepository;

  const mockVenue: Venue = {
    id: 'venue-1',
    name: 'Test Brewery',
    venue_type: 'brewery',
    source: 'manual',
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockAuthService = new MockAuthService();
    mockGeofenceService = new MockGeofenceService();
    mockApiService = new MockVisitsApiService();
    mockLocalRepo = new MockVisitsLocalRepository();

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [
        VisitTrackerService,
        VisitSyncService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: GeofenceService, useValue: mockGeofenceService },
        { provide: VisitsApiService, useValue: mockApiService },
        { provide: VisitsLocalRepository, useValue: mockLocalRepo },
      ],
    }).compileComponents();

    visitTrackerService = TestBed.inject(VisitTrackerService);
    visitSyncService = TestBed.inject(VisitSyncService);
  });

  afterEach(() => {
    visitTrackerService.stopTracking();
    mockLocalRepo.clear();
    mockApiService.resetCallCount();
  });

  describe('Complete Offline-to-Online Sync Flow', () => {
    it('should queue visit locally when offline and sync when online', fakeAsync(async () => {
      // STEP 1: Simulate offline state
      mockApiService.setNetworkOnline(false);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // STEP 2: Start tracking
      await visitTrackerService.startTracking([mockVenue]);
      tick(100);

      // STEP 3: User enters venue (offline)
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);
      tick(200);

      // STEP 4: Verify visit is stored locally but not synced
      const unsyncedVisits = await mockLocalRepo.findUnsynced();
      expect(unsyncedVisits.length).toBe(1);
      expect(unsyncedVisits[0].venue_id).toBe(mockVenue.id);
      expect(unsyncedVisits[0].synced).toBe(false);

      // STEP 5: Verify no API calls were made (offline)
      expect(mockApiService.getCallCount()).toBe(0);

      // STEP 6: Simulate network coming back online
      mockApiService.setNetworkOnline(true);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // STEP 7: Trigger sync manually (simulating online event)
      visitSyncService.triggerSync();
      tick(6000); // Wait for debounce + processing

      // STEP 8: Verify API was called
      expect(mockApiService.getCallCount()).toBeGreaterThan(0);

      // STEP 9: Verify visit is now synced with server ID
      const allVisits = mockLocalRepo.getAll();
      expect(allVisits.length).toBe(1);
      expect(allVisits[0].synced).toBe(true);
      expect(allVisits[0].id).toContain('server-id'); // Server-assigned ID

      flush();
    }));

    it('should sync multiple visits accumulated offline', fakeAsync(async () => {
      // Start offline
      mockApiService.setNetworkOnline(false);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await visitTrackerService.startTracking([mockVenue]);
      tick(100);

      // Visit 1: Enter venue
      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      // Visit 1: Exit venue (after 1 hour)
      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.EXIT,
        timestamp: '2025-01-15T15:30:00.000Z',
        location: { latitude: 37.776, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      // Visit 2: Enter different venue
      const mockVenue2: Venue = {
        ...mockVenue,
        id: 'venue-2',
        name: 'Another Brewery',
      };
      await visitTrackerService.startTracking([mockVenue, mockVenue2]);
      tick(100);

      mockGeofenceService.emitTransition({
        venue_id: mockVenue2.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T16:00:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      // Verify 2 unsynced visits stored locally
      const unsyncedVisits = await mockLocalRepo.findUnsynced();
      expect(unsyncedVisits.length).toBe(2);

      // Go online
      mockApiService.setNetworkOnline(true);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Trigger sync
      visitSyncService.triggerSync();
      tick(6000);

      // Verify both visits synced
      const allVisits = mockLocalRepo.getAll();
      const syncedVisits = allVisits.filter((v) => v.synced);
      expect(syncedVisits.length).toBe(2);

      flush();
    }));

    it('should handle sync failure with offline retry when network drops', fakeAsync(async () => {
      // Start online
      mockApiService.setNetworkOnline(true);
      await visitTrackerService.startTracking([mockVenue]);
      tick(100);

      // Create visit while online
      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      // Network drops before sync completes
      mockApiService.setNetworkOnline(false);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Trigger sync (will fail)
      visitSyncService.triggerSync();
      tick(6000);

      // Verify visit is still unsynced
      const unsyncedVisits = await mockLocalRepo.findUnsynced();
      expect(unsyncedVisits.length).toBe(1);

      // Network comes back
      mockApiService.setNetworkOnline(true);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Trigger retry
      visitSyncService.triggerSync();
      tick(6000);

      // Verify visit is now synced
      const allVisits = mockLocalRepo.getAll();
      expect(allVisits[0].synced).toBe(true);

      flush();
    }));

    it('should preserve local visit data during sync', fakeAsync(async () => {
      mockApiService.setNetworkOnline(false);

      await visitTrackerService.startTracking([mockVenue]);
      tick(100);

      // Create visit offline
      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      const unsyncedVisits = await mockLocalRepo.findUnsynced();
      const originalVisit = unsyncedVisits[0];

      // Go online and sync
      mockApiService.setNetworkOnline(true);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      visitSyncService.triggerSync();
      tick(6000);

      // Verify data is preserved
      const syncedVisit = mockLocalRepo.getAll()[0];
      expect(syncedVisit.venue_id).toBe(originalVisit.venue_id);
      expect(syncedVisit.arrival_time).toBe(originalVisit.arrival_time);
      expect(syncedVisit.detection_method).toBe(originalVisit.detection_method);
      expect(syncedVisit.synced).toBe(true);
      expect(syncedVisit.id).toContain('server-id'); // Server ID assigned

      flush();
    }));

    it('should update sync status throughout the flow', fakeAsync(async () => {
      mockApiService.setNetworkOnline(false);

      await visitTrackerService.startTracking([mockVenue]);
      tick(100);

      // Create visit
      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      // Check pending count
      let status = visitSyncService.syncStatus();
      expect(status.pendingCount).toBeGreaterThan(0);
      expect(status.isSyncing).toBe(false);

      // Go online
      mockApiService.setNetworkOnline(true);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      visitSyncService.triggerSync();
      tick(100);

      // Check syncing status
      status = visitSyncService.syncStatus();
      expect(status.isSyncing).toBe(true);

      tick(6000);

      // Check completed status
      status = visitSyncService.syncStatus();
      expect(status.isSyncing).toBe(false);
      expect(status.pendingCount).toBe(0);
      expect(status.lastSyncTime).toBeDefined();

      flush();
    }));
  });

  describe('Edge Cases', () => {
    it('should not sync if user is anonymous', fakeAsync(async () => {
      mockAuthService.setAnonymous(true);

      await visitTrackerService.startTracking([mockVenue]);
      tick(100);

      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      // Trigger sync
      visitSyncService.triggerSync();
      tick(6000);

      // Verify no API call
      expect(mockApiService.getCallCount()).toBe(0);

      flush();
    }));

    it('should handle visit updates (departure) offline and sync', fakeAsync(async () => {
      mockApiService.setNetworkOnline(false);

      await visitTrackerService.startTracking([mockVenue]);
      tick(100);

      // Enter
      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      // Exit (update visit)
      mockGeofenceService.emitTransition({
        venue_id: mockVenue.id,
        event: GeofenceEvent.EXIT,
        timestamp: '2025-01-15T15:45:00.000Z',
        location: { latitude: 37.776, longitude: -122.4194 },
        accuracy: 10,
      });
      tick(200);

      const unsyncedVisits = await mockLocalRepo.findUnsynced();
      expect(unsyncedVisits.length).toBe(1);
      expect(unsyncedVisits[0].departure_time).toBeDefined();
      expect(unsyncedVisits[0].is_active).toBe(false);

      // Go online and sync
      mockApiService.setNetworkOnline(true);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      visitSyncService.triggerSync();
      tick(6000);

      // Verify complete visit synced
      const syncedVisit = mockLocalRepo.getAll()[0];
      expect(syncedVisit.synced).toBe(true);
      expect(syncedVisit.departure_time).toBeDefined();
      expect(syncedVisit.duration_minutes).toBeGreaterThan(0);

      flush();
    }));
  });
});
