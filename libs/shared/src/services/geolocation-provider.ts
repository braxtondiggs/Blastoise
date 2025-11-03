/**
 * Platform-agnostic geolocation provider interface
 *
 * Implementations:
 * - Browser: Uses standard Geolocation API (works everywhere)
 * - Capacitor: Uses Capacitor Geolocation plugin (in apps/web and apps/mobile only)
 */

import {
  LocationPermission,
  GeolocationPosition,
} from '../types/geolocation.types';

export interface WatchPositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Abstract geolocation provider interface
 * Platform-specific implementations in apps/web and apps/mobile
 */
export abstract class GeolocationProvider {
  abstract requestPermissions(): Promise<LocationPermission>;
  abstract checkPermissions(): Promise<LocationPermission>;
  abstract getCurrentPosition(): Promise<GeolocationPosition | null>;
  abstract watchPosition(
    callback: (position: GeolocationPosition | null, error?: Error) => void,
    options?: WatchPositionOptions
  ): Promise<string>;
  abstract clearWatch(watchId: string): Promise<void>;
}
