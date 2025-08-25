// Background Location Service Worker
// This service worker handles background location tracking and sync

const LOCATION_CACHE_NAME = 'location-cache-v1';
const API_BASE_URL = 'https://endpoints-mxr2iyiuca-uc.a.run.app';

// Listen for background sync events
self.addEventListener('sync', event => {
  console.log('[Background Sync] Event received:', event.tag);
  
  if (event.tag === 'background-location-sync') {
    event.waitUntil(syncLocationData());
  }
});

// Listen for periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  console.log('[Periodic Sync] Event received:', event.tag);
  
  if (event.tag === 'location-update') {
    event.waitUntil(performPeriodicLocationUpdate());
  }
});

// Handle location data sync
async function syncLocationData() {
  try {
    console.log('[Background Sync] Syncing location data...');
    
    // Get queued location data from IndexedDB
    const queuedLocations = await getQueuedLocationData();
    
    if (queuedLocations.length === 0) {
      console.log('[Background Sync] No queued location data found');
      return;
    }

    // Send each location to the API
    for (const location of queuedLocations) {
      try {
        await sendLocationToAPI(location);
        await removeLocationFromQueue(location.id);
        console.log('[Background Sync] Location sent successfully:', location.id);
      } catch (error) {
        console.error('[Background Sync] Failed to send location:', location.id, error);
        // Keep failed locations in queue for retry
      }
    }

    console.log('[Background Sync] Location sync completed');
  } catch (error) {
    console.error('[Background Sync] Location sync failed:', error);
  }
}

// Perform periodic location update (when supported by browser)
async function performPeriodicLocationUpdate() {
  try {
    console.log('[Periodic Sync] Performing periodic location update...');
    
    // Check if location services are enabled
    const locationSettings = await getLocationSettings();
    if (!locationSettings || !locationSettings.enabled) {
      console.log('[Periodic Sync] Location tracking disabled');
      return;
    }

    // Get current location (if available from browser)
    if ('geolocation' in navigator) {
      const position = await getCurrentPosition();
      const locationData = {
        id: Date.now().toString(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        source: 'background'
      };

      // Queue the location for sending
      await queueLocationData(locationData);
      
      // Try to send immediately
      await sendLocationToAPI(locationData);
      await removeLocationFromQueue(locationData.id);
      
      console.log('[Periodic Sync] Location updated successfully');
    }
  } catch (error) {
    console.error('[Periodic Sync] Failed to update location:', error);
  }
}

// Send location data to the API
async function sendLocationToAPI(locationData) {
  try {
    // Use the new location-update endpoint directly
    const response = await fetch(`${API_BASE_URL}/location-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
        source: locationData.source || 'service-worker'
      })
    });

    if (!response.ok) {
      throw new Error(`Location update API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[API] Location sent successfully:', result);
    
    return result;
  } catch (error) {
    console.error('[API] Failed to send location:', error);
    throw error;
  }
}

// IndexedDB operations for location queue
async function openLocationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LocationDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create location queue store
      if (!db.objectStoreNames.contains('locationQueue')) {
        const store = db.createObjectStore('locationQueue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
      
      // Create settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function queueLocationData(locationData) {
  const db = await openLocationDB();
  const transaction = db.transaction(['locationQueue'], 'readwrite');
  const store = transaction.objectStore('locationQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.add(locationData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getQueuedLocationData() {
  const db = await openLocationDB();
  const transaction = db.transaction(['locationQueue'], 'readonly');
  const store = transaction.objectStore('locationQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeLocationFromQueue(locationId) {
  const db = await openLocationDB();
  const transaction = db.transaction(['locationQueue'], 'readwrite');
  const store = transaction.objectStore('locationQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(locationId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getLocationSettings() {
  try {
    const db = await openLocationDB();
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    
    return new Promise((resolve, reject) => {
      const request = store.get('locationSettings');
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[Settings] Could not get location settings:', error);
    return null;
  }
}

// Helper function to get current position
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: false, // Use low accuracy for background to save battery
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

// Listen for messages from the main app
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'QUEUE_LOCATION') {
    event.waitUntil(
      queueLocationData(event.data.location)
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch(error => {
          console.error('[Service Worker] Failed to queue location:', error);
          event.ports[0].postMessage({ success: false, error: error.message });
        })
    );
  }
  
  if (event.data.type === 'SYNC_LOCATIONS') {
    event.waitUntil(
      syncLocationData()
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch(error => {
          console.error('[Service Worker] Failed to sync locations:', error);
          event.ports[0].postMessage({ success: false, error: error.message });
        })
    );
  }
});

console.log('[Background Location SW] Service worker loaded');