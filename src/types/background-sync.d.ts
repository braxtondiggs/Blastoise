/**
 * Background Sync API type definitions
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API
 */

interface SyncManager {
  /**
   * Register a sync event
   */
  register(tag: string): Promise<void>;

  /**
   * Get tags of pending sync events
   */
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  /**
   * Provides access to the SyncManager interface
   */
  readonly sync: SyncManager;
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

interface ServiceWorkerGlobalScopeEventMap {
  'sync': SyncEvent;
}

interface ServiceWorkerGlobalScope {
  addEventListener<K extends keyof ServiceWorkerGlobalScopeEventMap>(
    type: K,
    listener: (this: ServiceWorkerGlobalScope, ev: ServiceWorkerGlobalScopeEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}
