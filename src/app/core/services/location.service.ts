import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError, timer } from 'rxjs';
import { map, switchMap, catchError, takeUntil, filter } from 'rxjs/operators';
import { ApiService } from './api.service';
/// <reference path="../../../types/background-sync.d.ts" />

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface LocationSettings {
  enabled: boolean;
  trackingInterval: number; // in minutes
  highAccuracy: boolean;
  significantChangeOnly: boolean;
}

export enum LocationPermissionStatus {
  UNKNOWN = 'unknown',
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt'
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly apiService = inject(ApiService);

  // Location tracking state
  private readonly isTracking$ = new BehaviorSubject<boolean>(false);
  private readonly currentLocation$ = new BehaviorSubject<LocationData | null>(null);
  private readonly permissionStatus$ = new BehaviorSubject<LocationPermissionStatus>(LocationPermissionStatus.UNKNOWN);
  private readonly locationQueue: LocationData[] = [];

  // Tracking configuration
  private readonly defaultSettings: LocationSettings = {
    enabled: false,
    trackingInterval: 15,
    highAccuracy: false,
    significantChangeOnly: true
  };

  private trackingTimer?: any;
  private lastKnownLocation?: LocationData;
  private watchId?: number;

  constructor() {
    this.loadSettings();
    this.checkPermissionStatus();
  }

  /**
   * Get current tracking status
   */
  get isTracking(): Observable<boolean> {
    return this.isTracking$.asObservable();
  }

  /**
   * Get current location
   */
  get currentLocation(): Observable<LocationData | null> {
    return this.currentLocation$.asObservable();
  }

  /**
   * Get permission status
   */
  get permissionStatus(): Observable<LocationPermissionStatus> {
    return this.permissionStatus$.asObservable();
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // First check current permission status
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

        if (permission.state === 'denied') {
          this.permissionStatus$.next(LocationPermissionStatus.DENIED);
          return LocationPermissionStatus.DENIED;
        }
      }

      // Request location access
      await this.getCurrentPosition();
      this.permissionStatus$.next(LocationPermissionStatus.GRANTED);
      return LocationPermissionStatus.GRANTED;

    } catch (error) {
      const errorCode = (error as GeolocationPositionError)?.code;

      if (errorCode === GeolocationPositionError.PERMISSION_DENIED) {
        this.permissionStatus$.next(LocationPermissionStatus.DENIED);
        return LocationPermissionStatus.DENIED;
      }

      this.permissionStatus$.next(LocationPermissionStatus.UNKNOWN);
      throw error;
    }
  }

  /**
   * Start background location tracking
   */
  async startTracking(settings?: Partial<LocationSettings>): Promise<void> {
    const currentSettings = { ...this.getSettings(), ...settings };

    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    // Ensure we have permissions
    const permissionStatus = await this.requestPermissions();
    if (permissionStatus !== LocationPermissionStatus.GRANTED) {
      throw new Error('Location permission not granted');
    }

    // Stop any existing tracking
    this.stopTracking();

    // Save settings
    this.saveSettings(currentSettings);

    // Start continuous location tracking
    const options: PositionOptions = {
      enableHighAccuracy: currentSettings.highAccuracy,
      timeout: 15000,
      maximumAge: 60000 // Use cached location if less than 1 minute old
    };

    // Use watchPosition for continuous tracking
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );

    // Set up periodic background sync registration
    this.registerBackgroundSync();

    this.isTracking$.next(true);
    console.log('Location tracking started');
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }

    if (this.trackingTimer) {
      clearInterval(this.trackingTimer);
      this.trackingTimer = undefined;
    }

    this.isTracking$.next(false);
    console.log('Location tracking stopped');
  }

  /**
   * Get current position once
   */
  getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.parseGeolocationPosition(position);
          this.currentLocation$.next(locationData);
          resolve(locationData);
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Send queued location data to API
   */
  async sendLocationData(): Promise<void> {
    if (this.locationQueue.length === 0) return;

    try {
      // Send all queued locations using the new location-update endpoint
      const locations = [...this.locationQueue];
      const sentLocations: LocationData[] = [];

      for (const location of locations) {
        try {
          const locationUpdateRequest = {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp,
            source: 'pwa-background'
          };

          const response = await this.apiService.sendLocationUpdate(locationUpdateRequest).toPromise();

          if (response && response.success) {
            sentLocations.push(location);
            console.log('Location sent successfully:', response.locationId);
          }
        } catch (error) {
          console.error('Failed to send individual location:', error);
          // Continue with next location
        }
      }

      // Remove successfully sent locations from queue
      for (const sentLocation of sentLocations) {
        const index = this.locationQueue.findIndex(loc =>
          loc.latitude === sentLocation.latitude &&
          loc.longitude === sentLocation.longitude &&
          loc.timestamp === sentLocation.timestamp
        );
        if (index > -1) {
          this.locationQueue.splice(index, 1);
        }
      }

      console.log(`Location data sent: ${sentLocations.length}/${locations.length} successful`);

    } catch (error) {
      console.error('Failed to send location data:', error);
      // Keep data in queue for retry
    }
  }

  /**
   * Get current settings
   */
  getSettings(): LocationSettings {
    const stored = localStorage.getItem('locationSettings');
    return stored ? { ...this.defaultSettings, ...JSON.parse(stored) } : this.defaultSettings;
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<LocationSettings>): void {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    this.saveSettings(updatedSettings);

    // Restart tracking if it's currently active and settings changed
    if (this.isTracking$.value) {
      this.startTracking(updatedSettings);
    }
  }

  private parseGeolocationPosition(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
  }

  private handleLocationUpdate(position: GeolocationPosition): void {
    const locationData = this.parseGeolocationPosition(position);
    const settings = this.getSettings();

    // Check if this is a significant location change
    if (settings.significantChangeOnly && this.lastKnownLocation) {
      const distance = this.calculateDistance(
        this.lastKnownLocation.latitude,
        this.lastKnownLocation.longitude,
        locationData.latitude,
        locationData.longitude
      );

      // Only process if moved more than 50 meters
      if (distance < 50) {
        return;
      }
    }

    this.lastKnownLocation = locationData;
    this.currentLocation$.next(locationData);

    // Add to queue for background sync
    this.locationQueue.push(locationData);

    // Limit queue size to prevent memory issues
    if (this.locationQueue.length > 100) {
      this.locationQueue.shift();
    }

    console.log('Location updated:', locationData);
  }

  private handleLocationError(error: GeolocationPositionError): void {
    console.error('Location error:', error);

    switch (error.code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        this.permissionStatus$.next(LocationPermissionStatus.DENIED);
        this.stopTracking();
        break;
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        console.warn('Location information unavailable');
        break;
      case GeolocationPositionError.TIMEOUT:
        console.warn('Location request timed out');
        break;
    }
  }

  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-location-sync');
        console.log('Background sync registered');
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }
  }

  private async checkPermissionStatus(): Promise<void> {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

        const statusMap: Record<PermissionState, LocationPermissionStatus> = {
          granted: LocationPermissionStatus.GRANTED,
          denied: LocationPermissionStatus.DENIED,
          prompt: LocationPermissionStatus.PROMPT
        };

        this.permissionStatus$.next(statusMap[permission.state]);

        // Listen for permission changes
        permission.onchange = () => {
          this.permissionStatus$.next(statusMap[permission.state]);
        };
      } catch (error) {
        console.warn('Could not query permissions:', error);
      }
    }
  }

  private loadSettings(): void {
    const settings = this.getSettings();

    // Auto-start tracking if enabled in settings
    if (settings.enabled && 'serviceWorker' in navigator) {
      // Wait a bit for the app to fully load
      setTimeout(() => {
        this.startTracking(settings).catch(error => {
          console.warn('Auto-start location tracking failed:', error);
        });
      }, 2000);
    }
  }

  private saveSettings(settings: LocationSettings): void {
    localStorage.setItem('locationSettings', JSON.stringify(settings));
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}
