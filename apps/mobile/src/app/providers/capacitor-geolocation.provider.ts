/**
 * Capacitor Geolocation Provider for Mobile (iOS/Android)
 *
 * Uses Capacitor Geolocation plugin for native iOS/Android apps
 *
 * This file lives in apps/mobile because it's mobile-specific
 */

import { Injectable } from '@angular/core';
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
  async requestPermissions(): Promise<LocationPermission> {
    try {
      const permission = await Geolocation.requestPermissions();
      return this.mapPermissionStatus(permission.location);
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return LocationPermission.DENIED;
    }
  }

  async checkPermissions(): Promise<LocationPermission> {
    try {
      const permission = await Geolocation.checkPermissions();
      return this.mapPermissionStatus(permission.location);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return LocationPermission.NOT_DETERMINED;
    }
  }

  async getCurrentPosition(): Promise<GeolocationPosition | null> {
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

  async watchPosition(
    callback: (position: GeolocationPosition | null, error?: Error) => void,
    options?: WatchPositionOptions
  ): Promise<string> {
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
}
