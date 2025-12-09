import { TestBed } from '@angular/core/testing';
import { VisitTrackerService } from './visit-tracker';
import { GeofenceService } from './geofence';
import { VisitSyncService } from './visit-sync';
import { AuthService } from '@blastoise/features-auth';
import { NotificationService, VisitsLocalRepository } from '@blastoise/data-frontend';
import {
  Venue,
  GeofenceEvent,
  GeofenceTransition,
  Visit,
} from '@blastoise/shared';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { take, filter, skip } from 'rxjs/operators';

// Mock Services
class MockGeofenceService {
  private transitionsSubject = new BehaviorSubject<GeofenceTransition | null>(null);

  async startTracking(): Promise<void> {
    // Mock implementation
  }

  async stopTracking(): Promise<void> {
    // Mock implementation
  }

  getGeofenceTransitions(): Observable<GeofenceTransition> {
    return this.transitionsSubject.asObservable().pipe(
      filter((transition): transition is GeofenceTransition => transition !== null)
    );
  }

  // Test helper to emit transitions
  emitTransition(transition: GeofenceTransition): void {
    this.transitionsSubject.next(transition);
  }
}

class MockVisitSyncService {
  queuedVisits: Visit[] = [];

  async queueVisitForSync(visit: Visit): Promise<void> {
    this.queuedVisits.push(visit);
  }
}

class MockAuthService {
  private userId = 'test-user-123';
  private anonymous = false;

  getUserId(): string | null {
    return this.userId;
  }

  setUserId(id: string | null): void {
    this.userId = id as string;
  }

  isAnonymous(): boolean {
    return this.anonymous;
  }

  setAnonymous(value: boolean): void {
    this.anonymous = value;
  }

  currentUser() {
    return this.userId ? { id: this.userId } : null;
  }
}

class MockNotificationService {
  async notifyVisitDetected(_venueName: string, _venueId: string): Promise<void> {
    // Mock - do nothing
  }

  async notifyVisitEnded(_venueName: string, _durationMinutes: number, _visitId: string): Promise<void> {
    // Mock - do nothing
  }
}

class MockVisitsLocalRepository {
  private visits: Visit[] = [];

  async save(visit: Visit): Promise<void> {
    const index = this.visits.findIndex(v => v.id === visit.id);
    if (index >= 0) {
      this.visits[index] = visit;
    } else {
      this.visits.push(visit);
    }
  }

  async findActiveVisits(_userId: string): Promise<Visit[]> {
    return this.visits.filter(v => v.is_active === true && !v.departure_time);
  }

  async findActiveVisitByVenue(_userId: string, venueId: string): Promise<Visit | null> {
    return this.visits.find(
      v => v.venue_id === venueId && v.is_active === true && !v.departure_time
    ) || null;
  }

  async findByUserId(_userId: string): Promise<Visit[]> {
    return this.visits;
  }

  // Test helper to add visits
  addVisit(visit: Visit): void {
    this.visits.push(visit);
  }

  // Test helper to clear visits
  clear(): void {
    this.visits = [];
  }
}

describe('VisitTrackerService', () => {
  let service: VisitTrackerService;
  let mockGeofenceService: MockGeofenceService;
  let mockVisitSyncService: MockVisitSyncService;
  let mockAuthService: MockAuthService;
  let mockNotificationService: MockNotificationService;
  let mockLocalRepository: MockVisitsLocalRepository;

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
    mockGeofenceService = new MockGeofenceService();
    mockVisitSyncService = new MockVisitSyncService();
    mockAuthService = new MockAuthService();
    mockNotificationService = new MockNotificationService();
    mockLocalRepository = new MockVisitsLocalRepository();

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [
        VisitTrackerService,
        { provide: GeofenceService, useValue: mockGeofenceService },
        { provide: VisitSyncService, useValue: mockVisitSyncService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: VisitsLocalRepository, useValue: mockLocalRepository },
      ],
    }).compileComponents();

    service = TestBed.inject(VisitTrackerService);
  });

  afterEach(() => {
    if (service) {
      service.stopTracking();
    }
  });

  describe('T114: Arrival/Departure Detection Logic', () => {
    it('should create visit on ENTER event (arrival detection)', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      // Set up listener for visit events
      const visitEventPromise = firstValueFrom(service.getVisitEvents());

      // Emit ENTER transition
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:37:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);

      // Wait for visit event
      const visitEvent = await visitEventPromise;

      expect(visitEvent.type).toBe('arrival');
      expect(visitEvent.visit.venue_id).toBe(mockVenue.id);
      expect(visitEvent.visit.user_id).toBe('test-user-123');
      expect(visitEvent.visit.is_active).toBe(true);
      expect(visitEvent.visit.source).toBe('auto_detect');
      expect(visitEvent.visit.departure_time).toBeUndefined();
    });

    it('should store exact arrival timestamp without rounding', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      const visitEventPromise = firstValueFrom(service.getVisitEvents());

      // Emit ENTER with precise timestamp (14:37:23)
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:37:23.456Z', // Precise timestamp
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);

      const visitEvent = await visitEventPromise;

      // Arrival time should match the provided timestamp (no rounding)
      const arrivalTime = new Date(visitEvent.visit.arrival_time);
      expect(arrivalTime.getMinutes()).toBe(37);
      expect(arrivalTime.getSeconds()).toBe(23);
      expect(arrivalTime.getMilliseconds()).toBe(456);
    });

    it('should add visit to active visits map on arrival', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      expect(service.hasActiveVisits()).toBe(false);

      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);

      // Wait a bit for the transition to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(service.hasActiveVisits()).toBe(true);
      expect(service.getAllActiveVisits().length).toBe(1);
      expect(service.getActiveVisit(mockVenue.id)).toBeDefined();
    });

    it('should queue visit for sync on arrival', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockVisitSyncService.queuedVisits.length).toBeGreaterThan(0);
      const queuedVisit = mockVisitSyncService.queuedVisits[0];
      expect(queuedVisit.venue_id).toBe(mockVenue.id);
      expect(queuedVisit.is_active).toBe(true);
    });

    it('should update visit on EXIT event (departure detection)', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      // First, create an arrival
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);
      await firstValueFrom(service.getVisitEvents());

      // Now emit EXIT
      const exitEventPromise = firstValueFrom(
        service.getVisitEvents().pipe(skip(1), take(1))
      );

      const exitTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.EXIT,
        timestamp: '2025-01-15T15:45:00.000Z', // 1h 15m later
        location: { latitude: 37.776, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(exitTransition);

      const exitEvent = await exitEventPromise;

      expect(exitEvent.type).toBe('departure');
      expect(exitEvent.visit.venue_id).toBe(mockVenue.id);
      expect(exitEvent.visit.is_active).toBe(false);
      expect(exitEvent.visit.departure_time).toBeDefined();
      expect(exitEvent.visit.duration_minutes).toBeDefined();
    });

    it('should use exact departure timestamp without rounding', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      // Create arrival
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);
      await firstValueFrom(service.getVisitEvents());

      // Emit EXIT with precise timestamp
      const exitEventPromise = firstValueFrom(
        service.getVisitEvents().pipe(skip(1), take(1))
      );

      const exitTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.EXIT,
        timestamp: '2025-01-15T15:52:47.789Z', // Precise timestamp
        location: { latitude: 37.776, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(exitTransition);

      const exitEvent = await exitEventPromise;

      // Departure time should match the provided timestamp (no rounding)
      const departureTime = new Date(exitEvent.visit.departure_time!);
      expect(departureTime.toISOString()).toBe('2025-01-15T15:52:47.789Z');
    });

    it('should calculate duration correctly on departure', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      // Arrival at 14:30
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      const enterEventPromise = firstValueFrom(service.getVisitEvents());
      mockGeofenceService.emitTransition(enterTransition);
      // Allow async handlers to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      await enterEventPromise;

      // Departure at 15:45 (1h 15m later)
      const exitEventPromise = firstValueFrom(
        service.getVisitEvents().pipe(skip(1), take(1))
      );

      const exitTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.EXIT,
        timestamp: '2025-01-15T15:45:00.000Z',
        location: { latitude: 37.776, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(exitTransition);
      // Allow async handlers to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      const exitEvent = await exitEventPromise;

      // Duration should be 75 minutes (1h 15m)
      expect(exitEvent.visit.duration_minutes).toBe(75);
    });

    it('should remove visit from active visits on departure', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      // Create arrival
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      const enterEventPromise = firstValueFrom(service.getVisitEvents());
      mockGeofenceService.emitTransition(enterTransition);
      await new Promise(resolve => setTimeout(resolve, 0));
      await enterEventPromise;

      expect(service.hasActiveVisits()).toBe(true);

      // Emit EXIT
      const exitEventPromise = firstValueFrom(
        service.getVisitEvents().pipe(skip(1), take(1))
      );
      const exitTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.EXIT,
        timestamp: '2025-01-15T15:45:00.000Z',
        location: { latitude: 37.776, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(exitTransition);
      await new Promise(resolve => setTimeout(resolve, 0));
      await exitEventPromise;

      expect(service.hasActiveVisits()).toBe(false);
      expect(service.getActiveVisit(mockVenue.id)).toBeUndefined();
    });

    it('should not create visit if user is not authenticated', async () => {
      mockAuthService.setUserId(null); // No user

      await service.startTracking([mockVenue]);

      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(service.hasActiveVisits()).toBe(false);
      expect(mockVisitSyncService.queuedVisits.length).toBe(0);
    });

    it('should not create duplicate active visit for same venue', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      // Emit first ENTER
      const enterTransition1: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition1);
      await firstValueFrom(service.getVisitEvents());

      const activeVisitsCount1 = service.getAllActiveVisits().length;

      // Emit second ENTER for same venue (should be ignored)
      const enterTransition2: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:45:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      mockGeofenceService.emitTransition(enterTransition2);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const activeVisitsCount2 = service.getAllActiveVisits().length;

      expect(activeVisitsCount2).toBe(activeVisitsCount1);
      expect(activeVisitsCount2).toBe(1);
    });
  });

  describe('Manual Visit Management', () => {
    it('should allow manually creating a visit', async () => {
      mockAuthService.setUserId('test-user-123');

      // Need to start tracking to register venues
      await service.startTracking([mockVenue]);

      const visit = service.createManualVisit(mockVenue.id);

      expect(visit).toBeDefined();
      expect(visit?.venue_id).toBe(mockVenue.id);
      expect(visit?.source).toBe('manual');
      expect(visit?.is_active).toBe(true);
    });

    it('should allow manually ending a visit', async () => {
      mockAuthService.setUserId('test-user-123');

      await service.startTracking([mockVenue]);

      // Create arrival
      const enterTransition: GeofenceTransition = {
        venue_id: mockVenue.id,
        event: GeofenceEvent.ENTER,
        timestamp: '2025-01-15T14:30:00.000Z',
        location: { latitude: 37.7751, longitude: -122.4194 },
        accuracy: 10,
      };

      const enterEventPromise = firstValueFrom(service.getVisitEvents());
      mockGeofenceService.emitTransition(enterTransition);
      await new Promise(resolve => setTimeout(resolve, 0));
      await enterEventPromise;

      expect(service.hasActiveVisits()).toBe(true);

      // Manually end visit
      const endedVisit = await service.endVisit(mockVenue.id);

      expect(endedVisit).toBeDefined();
      expect(endedVisit?.is_active).toBe(false);
      expect(endedVisit?.departure_time).toBeDefined();
      expect(service.hasActiveVisits()).toBe(false);
    });
  });

  describe('Tracking Lifecycle', () => {
    it('should start and stop tracking correctly', async () => {
      await service.startTracking([mockVenue]);
      // Tracking is managed by geofence service

      await service.stopTracking();
      expect(service.hasActiveVisits()).toBe(false);
    });
  });
});
