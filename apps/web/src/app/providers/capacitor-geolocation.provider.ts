/**
 * Capacitor Geolocation Provider for Web PWA
 *
 * Uses Capacitor Geolocation plugin which works on:
 * - Web (uses browser Geolocation API)
 * - Progressive Web Apps (PWA)
 *
 * This file lives in apps/web because Capacitor is PWA-specific
 */

import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  GeolocationProvider,
  GeolocationPosition,
  WatchPositionOptions,
  LocationPermission,
} from '@blastoise/shared';

@Injectable({
  providedIn: 'root',
})
export class CapacitorGeolocationProvider extends GeolocationProvider {
  private isNative = Capacitor.isNativePlatform();

  async requestPermissions(): Promise<LocationPermission> {
    // On web, requestPermissions is not implemented in Capacitor
    // The browser will prompt for permission when getCurrentPosition is called
    if (!this.isNative) {
      // Check if permissions API is available (modern browsers)
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          return this.mapBrowserPermissionStatus(result.state);
        } catch {
          // Permissions API query failed, return prompt to indicate we need to try
          return LocationPermission.PROMPT;
        }
      }
      // Older browsers - assume prompt, the actual permission will be requested on getCurrentPosition
      return LocationPermission.PROMPT;
    }

    // Native platform - use Capacitor
    try {
      const permission = await Geolocation.requestPermissions();
      return this.mapPermissionStatus(permission.location);
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return LocationPermission.DENIED;
    }
  }

  async checkPermissions(): Promise<LocationPermission> {
    // On web, use the Permissions API if available
    if (!this.isNative) {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          return this.mapBrowserPermissionStatus(result.state);
        } catch {
          return LocationPermission.NOT_DETERMINED;
        }
      }
      return LocationPermission.NOT_DETERMINED;
    }

    // Native platform - use Capacitor
    try {
      const permission = await Geolocation.checkPermissions();
      return this.mapPermissionStatus(permission.location);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return LocationPermission.NOT_DETERMINED;
    }
  }

  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    // On web, use browser's native Geolocation API for better compatibility
    if (!this.isNative && 'geolocation' in navigator) {
      // Try high accuracy first, fallback to low accuracy if it times out
      const tryGetPosition = (highAccuracy: boolean, timeout: number): Promise<GeolocationPosition | null> => {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                coords: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
                timestamp: position.timestamp,
                accuracy: position.coords.accuracy,
              });
            },
            (error) => {
              console.warn(`Browser geolocation error (highAccuracy=${highAccuracy}):`, error.message);
              resolve(null);
            },
            {
              enableHighAccuracy: highAccuracy,
              timeout: timeout,
              maximumAge: 60000, // Accept cached position up to 1 minute old
            }
          );
        });
      };

      // Try high accuracy with longer timeout first
      let position = await tryGetPosition(true, 15000);

      // If that fails, try low accuracy (uses WiFi/cell towers, much faster)
      if (!position) {
        console.log('High accuracy failed, trying low accuracy...');
        position = await tryGetPosition(false, 10000);
      }

      return position;
    }

    // Native platform - use Capacitor
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
      };
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  }

  // Track browser watch IDs for web platform
  private browserWatchIds = new Map<string, number>();
  private watchIdCounter = 0;

  async watchPosition(
    callback: (position: GeolocationPosition | null, error?: Error) => void,
    options?: WatchPositionOptions
  ): Promise<string> {
    // On web, use browser's native Geolocation API
    if (!this.isNative && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            timestamp: position.timestamp,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          callback(null, new Error(error.message));
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0,
        }
      );

      // Generate a string ID and map to the browser's numeric watch ID
      const stringId = `web-watch-${++this.watchIdCounter}`;
      this.browserWatchIds.set(stringId, watchId);
      return stringId;
    }

    // Native platform - use Capacitor
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      },
      (position, error) => {
        if (error) {
          callback(null, error);
          return;
        }

        if (position) {
          callback({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            timestamp: position.timestamp,
            accuracy: position.coords.accuracy,
          });
        }
      }
    );

    return watchId;
  }

  async clearWatch(watchId: string): Promise<void> {
    // On web, use browser's clearWatch
    if (!this.isNative && this.browserWatchIds.has(watchId)) {
      const numericId = this.browserWatchIds.get(watchId)!;
      navigator.geolocation.clearWatch(numericId);
      this.browserWatchIds.delete(watchId);
      return;
    }

    // Native platform - use Capacitor
    await Geolocation.clearWatch({ id: watchId });
  }

  private mapPermissionStatus(status: string): LocationPermission {
    switch (status) {
      case 'granted':
        return LocationPermission.GRANTED;
      case 'denied':
        return LocationPermission.DENIED;
      case 'prompt':
        return LocationPermission.PROMPT;
      default:
        return LocationPermission.NOT_DETERMINED;
    }
  }

  private mapBrowserPermissionStatus(state: PermissionState): LocationPermission {
    switch (state) {
      case 'granted':
        return LocationPermission.GRANTED;
      case 'denied':
        return LocationPermission.DENIED;
      case 'prompt':
        return LocationPermission.PROMPT;
      default:
        return LocationPermission.NOT_DETERMINED;
    }
  }
}
