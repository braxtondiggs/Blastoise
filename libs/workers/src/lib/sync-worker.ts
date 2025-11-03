/**
 * Sync Worker - Background synchronization for visits
 *
 * This worker handles:
 * - Background sync using Service Worker Background Sync API
 * - Periodic sync when app is in background
 * - Network connectivity monitoring
 * - Retry queue management
 *
 * Used by PWA (web) for background visit synchronization
 */

// Type declarations for Background Sync API
declare global {
  interface ServiceWorkerRegistration {
    sync?: SyncManager;
  }

  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }
}

const SYNC_TAG = 'visit-sync';
const SYNC_INTERVAL_MS = 60000; // 1 minute

interface SyncMessage {
  type: 'SYNC_VISITS' | 'FORCE_SYNC' | 'ONLINE' | 'OFFLINE';
  payload?: any;
}

/**
 * Register background sync for visit synchronization
 */
export function registerBackgroundSync(): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    if (!registration.sync) {
      console.warn('Background Sync API not supported');
      return;
    }
    return registration.sync.register(SYNC_TAG);
  }).catch((error) => {
    console.error('Failed to register background sync:', error);
  });
}

/**
 * Trigger immediate sync (from service worker)
 */
export async function triggerSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn('Service Worker not ready');
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'SYNC_VISITS',
  } as SyncMessage);
}

/**
 * Listen for online/offline events and trigger sync
 */
export function monitorConnectivity(): void {
  window.addEventListener('online', () => {
    console.log('Network online - triggering sync');
    triggerSync();

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ONLINE',
      } as SyncMessage);
    }
  });

  window.addEventListener('offline', () => {
    console.log('Network offline - pausing sync');

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'OFFLINE',
      } as SyncMessage);
    }
  });

  // Initial status check
  if (navigator.onLine) {
    triggerSync();
  }
}

/**
 * Setup periodic sync (fallback for browsers without Background Sync API)
 */
export function setupPeriodicSync(): void {
  // Always use Background Sync API if available
  registerBackgroundSync();

  // Also setup interval fallback for browsers without Background Sync
  setInterval(() => {
    if (navigator.onLine) {
      triggerSync();
    }
  }, SYNC_INTERVAL_MS);
}

/**
 * Initialize sync worker
 */
export function initializeSyncWorker(): void {
  if ('serviceWorker' in navigator) {
    // Monitor connectivity changes
    monitorConnectivity();

    // Setup periodic sync
    setupPeriodicSync();

    console.log('Sync worker initialized');
  } else {
    console.warn('Service Worker not supported - sync disabled');
  }
}

/**
 * Service Worker sync event handler (to be used in service-worker.js)
 * This function should be called from the service worker's sync event
 */
export async function handleSyncEvent(event: any): Promise<void> {
  if (event.tag === SYNC_TAG) {
    // Notify all clients to perform sync
    const clients = await (self as any).clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    });

    clients.forEach((client: any) => {
      client.postMessage({
        type: 'SYNC_VISITS',
      } as SyncMessage);
    });
  }
}
