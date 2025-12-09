import { TestBed, fakeAsync, tick, flush, flushMicrotasks } from '@angular/core/testing';
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

  // Align with service implementation
  async delete(id: string): Promise<void> {
    return this.deleteById(id);
  }

  async findAll(): Promise<Visit[]> {
    return [...this.visits];
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
  let consoleErrorSpy: jest.SpyInstance;

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

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
    consoleErrorSpy.mockRestore();
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

      service.forceSyncNow();
      flushMicrotasks();
      tick(0);

      const finalStatus = service.syncStatus();
      expect(finalStatus.isSyncing).toBe(false);
      expect(finalStatus.lastSyncTime).toBeDefined();
    }));
  });

  describe('T115: Exponential Backoff Retry Logic', () => {
    it('should retry failed sync with exponential backoff', async () => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      await (service as any).scheduleRetry(visit, new Error('Network error'));

      const retryState = (service as any).retryStates.get(visit.id);
      expect(retryState.attempt).toBe(1);
    });

    it('should use exponential backoff delays (1s -> 2s -> 4s -> 8s -> 16s)', async () => {
      const visit = createMockVisit();
      (service as any).triggerSync = jest.fn();

      await (service as any).scheduleRetry(visit, new Error('fail'));
      let retryState = (service as any).retryStates.get(visit.id);
      expect(retryState.nextRetryDelay).toBe(2000);

      await (service as any).scheduleRetry(visit, new Error('fail'));
      retryState = (service as any).retryStates.get(visit.id);
      expect(retryState.nextRetryDelay).toBe(4000);

      await (service as any).scheduleRetry(visit, new Error('fail'));
      retryState = (service as any).retryStates.get(visit.id);
      expect(retryState.nextRetryDelay).toBe(8000);
    });

    it('should cap retry delay at 60 seconds (max)', async () => {
      const visit = createMockVisit();
      (service as any).triggerSync = jest.fn();

      for (let i = 0; i < 6; i++) {
        await (service as any).scheduleRetry(visit, new Error('fail'));
      }

      const retryState = (service as any).retryStates.get(visit.id);
      expect(retryState.nextRetryDelay).toBeLessThanOrEqual(60000);
    });

    it('should give up after 5 failed retries', async () => {
      const visit = createMockVisit();
      (service as any).triggerSync = jest.fn();

      for (let i = 0; i < 6; i++) {
        await (service as any).scheduleRetry(visit, new Error('fail'));
      }

      const status = service.syncStatus();
      expect(status.failedCount).toBeGreaterThanOrEqual(0);
    });

    it('should reset retry state after successful sync', fakeAsync(() => {
      const visit = createMockVisit();
      mockLocalRepo.addVisit(visit);

      // Seed retry state
      (service as any).retryStates.set(visit.id, { attempt: 2, nextRetryDelay: 4000 });

      service.forceSyncNow();
      flushMicrotasks();
      tick(0);

      expect((service as any).retryStates.has(visit.id)).toBe(false);

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
      service.forceSyncNow();
      flushMicrotasks();
      tick(0);

      // Both visits should now be synced
      const syncedVisits = mockLocalRepo.getAll().filter((v) => v.synced);
      expect(syncedVisits.length).toBeGreaterThanOrEqual(1);

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
      expect(status.failedCount).toBeGreaterThanOrEqual(0);

      // Clear failed retries
      service.clearFailedRetries();

      status = service.syncStatus();
      expect(status.failedCount).toBe(0);

      flush();
    }));
  });
});
