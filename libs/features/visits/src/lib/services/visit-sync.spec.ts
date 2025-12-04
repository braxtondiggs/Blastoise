import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { VisitSyncService } from './visit-sync';
import { AuthService } from '@blastoise/features-auth';
import { VisitsApiService } from '@blastoise/data';
import { VisitsLocalRepository } from '@blastoise/data';
import { Visit, ApiResponse, BatchVisitSyncDto } from '@blastoise/shared';
import { of, throwError } from 'rxjs';

// Mock Services
class MockAuthService {
  private user = { id: 'test-user-123' };
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

class MockVisitsApiService {
  private shouldFail = false;
  private callCount = 0;

  batchSync(dto: BatchVisitSyncDto) {
    this.callCount++;

    if (this.shouldFail) {
      return throwError(() => new Error('Network error'));
    }

    // Convert visits to server response format
    const serverVisits: Visit[] = dto.visits.map((v, index) => ({
      id: `server-id-${index}`,
      user_id: v.user_id!,
      venue_id: v.venue_id,
      arrival_time: v.arrival_time,
      departure_time: v.departure_time,
      duration_minutes: v.duration_minutes,
      is_active: v.is_active,
      source: v.source,
      synced: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const response: ApiResponse<Visit[]> = {
      success: true,
      data: serverVisits,
    };

    return of(response);
  }

  setShouldFail(value: boolean): void {
    this.shouldFail = value;
  }

  getCallCount(): number {
    return this.callCount;
  }

  resetCallCount(): void {
    this.callCount = 0;
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

  // Test helpers
  addVisit(visit: Visit): void {
    this.visits.push(visit);
  }

  clear(): void {
    this.visits = [];
  }

  getAll(): Visit[] {
    return [...this.visits];
  }
}

describe('VisitSyncService', () => {
  let service: VisitSyncService;
  let mockAuthService: MockAuthService;
  let mockApiService: MockVisitsApiService;
  let mockLocalRepo: MockVisitsLocalRepository;

  const createMockVisit = (overrides?: Partial<Visit>): Visit => ({
    id: 'local-visit-1',
    user_id: 'test-user-123',
    venue_id: 'venue-1',
    arrival_time: '2025-01-15T14:30:00.000Z',
    departure_time: '2025-01-15T15:45:00.000Z',
    duration_minutes: 75,
    is_active: false,
    source: 'auto_detect',
    synced: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    mockAuthService = new MockAuthService();
    mockApiService = new MockVisitsApiService();
    mockLocalRepo = new MockVisitsLocalRepository();

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [
        VisitSyncService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: VisitsApiService, useValue: mockApiService },
        { provide: VisitsLocalRepository, useValue: mockLocalRepo },
      ],
    }).compileComponents();

    service = TestBed.inject(VisitSyncService);
  });

  afterEach(() => {
    mockLocalRepo.clear();
    mockApiService.resetCallCount();
  });

  describe('Basic Sync Operations', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should queue visit for sync and save to local storage', async () => {
      const visit = createMockVisit();

      await service.queueVisitForSync(visit);

      const localVisits = mockLocalRepo.getAll();
      expect(localVisits.length).toBe(1);
      expect(localVisits[0].id).toBe(visit.id);
    });

    it('should sync unsynced visits to API', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      service.forceSyncNow();
      tick(6000); // Wait for debounce (5s + buffer)

      const syncedVisit = mockLocalRepo.getAll()[0];
      expect(syncedVisit.synced).toBe(true);
      expect(mockApiService.getCallCount()).toBe(1);
    }));

    it('should not sync if user is anonymous', fakeAsync(() => {
      mockAuthService.setAnonymous(true);
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      service.forceSyncNow();
      tick(6000);

      expect(mockApiService.getCallCount()).toBe(0);
      expect(mockLocalRepo.getAll()[0].synced).toBe(false);
    }));

    it('should update sync status signal during sync', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      const initialStatus = service.syncStatus();
      expect(initialStatus.isSyncing).toBe(false);

      service.forceSyncNow();
      tick(100); // Small tick to start sync

      // During sync, isSyncing should be true
      const duringSyncStatus = service.syncStatus();
      expect(duringSyncStatus.isSyncing).toBe(true);

      tick(6000); // Complete sync

      const finalStatus = service.syncStatus();
      expect(finalStatus.isSyncing).toBe(false);
      expect(finalStatus.lastSyncTime).toBeDefined();
    }));
  });

  describe('T115: Exponential Backoff Retry Logic', () => {
    it('should retry failed sync with exponential backoff', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      // Fail the first API call
      mockApiService.setShouldFail(true);

      service.forceSyncNow();
      tick(6000); // Initial sync attempt fails

      expect(mockApiService.getCallCount()).toBe(1);

      // After 1st failure, should retry after 1 second
      mockApiService.setShouldFail(false); // Make next call succeed
      tick(1000);
      tick(6000); // Process retry

      expect(mockApiService.getCallCount()).toBeGreaterThan(1);
      flush();
    }));

    it('should use exponential backoff delays (1s -> 2s -> 4s -> 8s -> 16s)', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      mockApiService.setShouldFail(true);

      // Initial attempt
      service.forceSyncNow();
      tick(6000);
      expect(mockApiService.getCallCount()).toBe(1);

      // 1st retry after 1s
      tick(1000 + 6000);
      expect(mockApiService.getCallCount()).toBe(2);

      // 2nd retry after 2s
      tick(2000 + 6000);
      expect(mockApiService.getCallCount()).toBe(3);

      // 3rd retry after 4s
      tick(4000 + 6000);
      expect(mockApiService.getCallCount()).toBe(4);

      // 4th retry after 8s
      tick(8000 + 6000);
      expect(mockApiService.getCallCount()).toBe(5);

      flush();
    }));

    it('should cap retry delay at 60 seconds (max)', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      mockApiService.setShouldFail(true);

      // Trigger initial sync
      service.forceSyncNow();
      tick(6000);

      // Fast-forward through multiple retries
      // 1s -> 2s -> 4s -> 8s -> 16s -> should cap at 60s
      tick(1000 + 6000); // 1st retry
      tick(2000 + 6000); // 2nd retry
      tick(4000 + 6000); // 3rd retry
      tick(8000 + 6000); // 4th retry
      tick(16000 + 6000); // 5th retry

      // Next retry should be capped at 60s, not 32s
      const callsBeforeMax = mockApiService.getCallCount();
      tick(60000 + 6000); // Should retry at max delay
      const callsAfterMax = mockApiService.getCallCount();

      expect(callsAfterMax).toBeGreaterThan(callsBeforeMax);

      flush();
    }));

    it('should give up after 5 failed retries', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      mockApiService.setShouldFail(true);

      // Initial attempt
      service.forceSyncNow();
      tick(6000);
      expect(mockApiService.getCallCount()).toBe(1);

      // 5 retries with exponential backoff
      tick(1000 + 6000); // 1st retry
      tick(2000 + 6000); // 2nd retry
      tick(4000 + 6000); // 3rd retry
      tick(8000 + 6000); // 4th retry
      tick(16000 + 6000); // 5th retry

      const callsAfter5Retries = mockApiService.getCallCount();
      expect(callsAfter5Retries).toBe(6); // Initial + 5 retries

      // Wait for another potential retry - should NOT happen
      tick(60000 + 6000);
      const callsAfterWaiting = mockApiService.getCallCount();
      expect(callsAfterWaiting).toBe(callsAfter5Retries); // No additional calls

      // Check that failed count increased
      const status = service.syncStatus();
      expect(status.failedCount).toBeGreaterThan(0);

      flush();
    }));

    it('should reset retry state after successful sync', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      // Fail first attempt
      mockApiService.setShouldFail(true);
      service.forceSyncNow();
      tick(6000);

      expect(mockApiService.getCallCount()).toBe(1);

      // Succeed on retry
      mockApiService.setShouldFail(false);
      tick(1000 + 6000);

      expect(mockApiService.getCallCount()).toBe(2);

      // Verify visit is synced
      const syncedVisit = mockLocalRepo.getAll()[0];
      expect(syncedVisit.synced).toBe(true);

      // Add another visit - should sync immediately without backoff
      const visit2 = createMockVisit({ id: 'local-visit-2', synced: false });
      mockLocalRepo.addVisit(visit2);

      mockApiService.resetCallCount();
      service.forceSyncNow();
      tick(6000);

      expect(mockApiService.getCallCount()).toBe(1); // Immediate, no backoff

      flush();
    }));

    it('should track pending count correctly', fakeAsync(() => {
      const visit1 = createMockVisit({ id: 'visit-1' });
      const visit2 = createMockVisit({ id: 'visit-2' });

      service.queueVisitForSync(visit1);
      tick(100);

      service.queueVisitForSync(visit2);
      tick(100);

      const status = service.syncStatus();
      expect(status.pendingCount).toBe(2);

      // Sync all visits
      service.forceSyncNow();
      tick(6000);

      const finalStatus = service.syncStatus();
      expect(finalStatus.pendingCount).toBe(0);

      flush();
    }));

    it('should handle partial sync failures gracefully', fakeAsync(() => {
      // Add multiple visits
      mockLocalRepo.addVisit(createMockVisit({ id: 'visit-1', synced: false }));
      mockLocalRepo.addVisit(createMockVisit({ id: 'visit-2', synced: false }));

      // First sync attempt fails
      mockApiService.setShouldFail(true);
      service.forceSyncNow();
      tick(6000);

      expect(mockApiService.getCallCount()).toBe(1);

      // Second attempt succeeds
      mockApiService.setShouldFail(false);
      tick(1000 + 6000);

      // Both visits should now be synced
      const syncedVisits = mockLocalRepo.getAll().filter((v) => v.synced);
      expect(syncedVisits.length).toBe(2);

      flush();
    }));
  });

  describe('Network Monitoring', () => {
    it('should not attempt sync when offline', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      service.forceSyncNow();
      tick(6000);

      expect(mockApiService.getCallCount()).toBe(0);

      // Restore online status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      flush();
    }));
  });

  describe('Sync Status and Observability', () => {
    it('should provide current sync status', () => {
      const status = service.getSyncStatus();

      expect(status).toBeDefined();
      expect(status.isSyncing).toBe(false);
      expect(status.pendingCount).toBe(0);
      expect(status.failedCount).toBe(0);
    });

    it('should detect if sync is needed', async () => {
      // No unsynced visits
      let needsSync = await service.needsSync();
      expect(needsSync).toBe(false);

      // Add unsynced visit
      mockLocalRepo.addVisit(createMockVisit({ synced: false }));
      needsSync = await service.needsSync();
      expect(needsSync).toBe(true);
    });

    it('should clear failed retries', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      // Cause failures
      mockApiService.setShouldFail(true);
      service.forceSyncNow();
      tick(6000);
      tick(1000 + 6000);
      tick(2000 + 6000);
      tick(4000 + 6000);
      tick(8000 + 6000);
      tick(16000 + 6000);

      let status = service.syncStatus();
      expect(status.failedCount).toBeGreaterThan(0);

      // Clear failed retries
      service.clearFailedRetries();

      status = service.syncStatus();
      expect(status.failedCount).toBe(0);

      flush();
    }));
  });
});
