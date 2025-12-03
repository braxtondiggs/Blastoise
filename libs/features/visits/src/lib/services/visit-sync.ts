import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '@blastoise/features-auth';
import { VisitsApiService } from '@blastoise/data';
import { VisitsLocalRepository } from '@blastoise/data';
import { Visit, BatchVisitSyncDto } from '@blastoise/shared';
import { BehaviorSubject, interval, fromEvent } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';

// Exponential backoff configuration
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 60000; // 1 minute
const MAX_RETRIES = 5;
const BACKOFF_MULTIPLIER = 2;

// Sync intervals
const SYNC_INTERVAL_MS = 60000; // 1 minute
const SYNC_DEBOUNCE_MS = 5000; // 5 seconds after last change

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: Date;
  pendingCount: number;
  failedCount: number;
  lastError?: string;
}

interface RetryState {
  attempt: number;
  nextRetryDelay: number;
}

@Injectable({
  providedIn: 'root',
})
export class VisitSyncService {
  private readonly authService = inject(AuthService);
  private readonly visitsApi = inject(VisitsApiService);
  private readonly localRepository = inject(VisitsLocalRepository);

  // Sync state
  private readonly syncStatusSignal = signal<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
  });

  readonly syncStatus = this.syncStatusSignal.asReadonly();

  // Retry state per visit
  private retryStates = new Map<string, RetryState>();

  // Sync queue
  private syncQueue: Set<string> = new Set();
  private isSyncInProgress = false;

  // Observable streams
  private readonly syncTrigger$ = new BehaviorSubject<void>(undefined);
  private syncIntervalSubscription: any = null;

  constructor() {
    this.initializeSyncListeners();
  }

  /**
   * Initialize sync listeners (online/offline events, periodic sync)
   */
  private initializeSyncListeners(): void {
    // Listen for online/offline events
    const online$ = fromEvent(window, 'online');
    const offline$ = fromEvent(window, 'offline');

    // Trigger sync when coming online
    online$.subscribe(() => {
      console.log('Network online - triggering sync');
      this.triggerSync();
    });

    offline$.subscribe(() => {
      console.log('Network offline - pausing sync');
      this.stopPeriodicSync();
    });

    // Periodic sync interval
    this.startPeriodicSync();

    // Debounced sync on trigger
    this.syncTrigger$
      .pipe(
        debounceTime(SYNC_DEBOUNCE_MS),
        switchMap(() => this.performSync())
      )
      .subscribe();
  }

  /**
   * Start periodic sync (every 1 minute)
   */
  private startPeriodicSync(): void {
    if (this.syncIntervalSubscription) {
      return; // Already running
    }

    this.syncIntervalSubscription = interval(SYNC_INTERVAL_MS).subscribe(() => {
      if (navigator.onLine) {
        this.triggerSync();
      }
    });
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncIntervalSubscription) {
      this.syncIntervalSubscription.unsubscribe();
      this.syncIntervalSubscription = null;
    }
  }

  /**
   * Trigger a sync (debounced)
   */
  triggerSync(): void {
    this.syncTrigger$.next();
  }

  /**
   * Add a visit to the sync queue
   */
  async queueVisitForSync(visit: Visit): Promise<void> {
    // Save to local storage first
    await this.localRepository.save(visit);

    // Add to sync queue
    this.syncQueue.add(visit.id);

    // Update pending count
    this.updatePendingCount();

    // Trigger sync
    this.triggerSync();
  }

  /**
   * Perform sync operation
   */
  private async performSync(): Promise<void> {
    if (this.isSyncInProgress || !navigator.onLine) {
      return;
    }

    const user = this.authService.currentUser();
    const isAnon = this.authService.isAnonymous();

    if (!user || isAnon) {
      return;
    }

    this.isSyncInProgress = true;
    this.syncStatusSignal.update((status) => ({
      ...status,
      isSyncing: true,
    }));

    try {
      // Get all unsynced visits from local storage
      const unsyncedVisits = await this.localRepository.findUnsynced();

      if (unsyncedVisits.length === 0) {
        this.syncStatusSignal.update((status) => ({
          ...status,
          isSyncing: false,
          pendingCount: 0,
        }));
        this.isSyncInProgress = false;
        return;
      }

      // Batch sync to API
      await this.syncBatch(unsyncedVisits);

      this.syncStatusSignal.update((status) => ({
        ...status,
        isSyncing: false,
        lastSyncTime: new Date(),
        pendingCount: 0,
        failedCount: 0,
        lastError: undefined,
      }));
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncStatusSignal.update((status) => ({
        ...status,
        isSyncing: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      this.isSyncInProgress = false;
    }
  }

  /**
   * Sync a batch of visits with exponential backoff retry
   */
  private async syncBatch(visits: Visit[]): Promise<void> {
    // Dedupe visits by (user_id, venue_id, arrival_time) - keep the latest one
    const deduped = this.dedupeVisits(visits);

    if (deduped.length === 0) {
      return;
    }

    const batch: BatchVisitSyncDto = {
      // Note: user_id is NOT sent - server gets it from authenticated user token
      visits: deduped.map((v) => ({
        venue_id: v.venue_id,
        arrival_time: v.arrival_time,
        departure_time: v.departure_time,
        is_active: v.is_active,
        detection_method: v.detection_method,
      })),
    };

    try {
      const result = await this.visitsApi.batchSync(batch).toPromise();

      if (result?.data) {
        // Mark local visits as synced
        // The deduped array matches the order of result.data
        for (let i = 0; i < deduped.length; i++) {
          const localVisit = deduped[i];
          const serverVisit = result.data[i];

          // Delete the old local record first (it has the client-generated ID)
          await this.localRepository.delete(localVisit.id);

          // Save with server ID and mark as synced
          const syncedVisit: Visit = {
            ...localVisit,
            id: serverVisit.id, // Use server ID
            synced: true,
            updated_at: new Date().toISOString(),
          };

          await this.localRepository.save(syncedVisit);

          // Remove from retry state and sync queue
          this.retryStates.delete(localVisit.id);
          this.syncQueue.delete(localVisit.id);
        }
      }
    } catch (error: any) {
      console.error('[VisitSync] Batch sync failed:', error?.message || 'Unknown error');

      // Implement exponential backoff retry for each visit
      for (const visit of visits) {
        await this.scheduleRetry(visit, error);
      }

      throw error;
    }
  }

  /**
   * Schedule retry with exponential backoff (T090)
   */
  private async scheduleRetry(visit: Visit, _error: unknown): Promise<void> {
    let retryState = this.retryStates.get(visit.id);

    if (!retryState) {
      retryState = {
        attempt: 0,
        nextRetryDelay: INITIAL_RETRY_DELAY_MS,
      };
    }

    retryState.attempt++;

    if (retryState.attempt > MAX_RETRIES) {
      console.error(
        `Visit ${visit.id} failed after ${MAX_RETRIES} retries, giving up`
      );
      this.syncStatusSignal.update((status) => ({
        ...status,
        failedCount: status.failedCount + 1,
      }));
      return;
    }

    // Calculate next retry delay with exponential backoff
    const delay = Math.min(
      retryState.nextRetryDelay,
      MAX_RETRY_DELAY_MS
    );

    retryState.nextRetryDelay = Math.min(
      retryState.nextRetryDelay * BACKOFF_MULTIPLIER,
      MAX_RETRY_DELAY_MS
    );

    this.retryStates.set(visit.id, retryState);

    // Schedule retry
    setTimeout(() => {
      this.triggerSync();
    }, delay);
  }

  /**
   * Update pending count from local storage
   */
  private async updatePendingCount(): Promise<void> {
    try {
      const unsyncedVisits = await this.localRepository.findUnsynced();
      this.syncStatusSignal.update((status) => ({
        ...status,
        pendingCount: unsyncedVisits.length,
      }));
    } catch (error) {
      console.error('Error updating pending count:', error);
    }
  }

  /**
   * Force immediate sync (for manual trigger)
   */
  async forceSyncNow(): Promise<void> {
    await this.performSync();
  }

  /**
   * Clear failed visits from retry queue
   */
  clearFailedRetries(): void {
    this.retryStates.clear();
    this.syncStatusSignal.update((status) => ({
      ...status,
      failedCount: 0,
    }));
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatusSignal();
  }

  /**
   * Check if sync is needed
   */
  async needsSync(): Promise<boolean> {
    const unsyncedVisits = await this.localRepository.findUnsynced();
    return unsyncedVisits.length > 0;
  }

  /**
   * Dedupe visits by (user_id, venue_id, arrival_time)
   * Keep the visit with the most recent updated_at timestamp
   */
  private dedupeVisits(visits: Visit[]): Visit[] {
    const visitMap = new Map<string, Visit>();

    for (const visit of visits) {
      const key = `${visit.user_id}:${visit.venue_id}:${visit.arrival_time}`;
      const existing = visitMap.get(key);

      if (!existing) {
        visitMap.set(key, visit);
      } else {
        // Keep the one with the later updated_at or the one with departure_time
        const existingUpdated = new Date(existing.updated_at || 0).getTime();
        const visitUpdated = new Date(visit.updated_at || 0).getTime();

        if (visitUpdated > existingUpdated || (visit.departure_time && !existing.departure_time)) {
          visitMap.set(key, visit);
        }
      }
    }

    return Array.from(visitMap.values());
  }
}
