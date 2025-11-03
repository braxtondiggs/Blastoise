/**
 * Geolocation Types
 * Types for location data and geofencing
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationPosition {
  coords: Coordinates;
  timestamp: number;
  accuracy: number; // meters
  altitude?: number; // meters
  altitudeAccuracy?: number; // meters
  heading?: number; // degrees (0-360)
  speed?: number; // meters/second
}

/**
 * Geofence configuration
 */
export interface GeofenceConfig {
  venue_id: string;
  center: Coordinates;
  radius_meters: number; // 50-500 meters
}

/**
 * Geofence event types
 */
export enum GeofenceEvent {
  ENTER = 'ENTER',
  EXIT = 'EXIT',
  DWELL = 'DWELL',
}

/**
 * Geofence transition event
 */
export interface GeofenceTransition {
  venue_id: string;
  event: GeofenceEvent;
  timestamp: string; // ISO 8601
  location: Coordinates;
  accuracy: number;
}

/**
 * Proximity search parameters
 */
export interface ProximitySearchParams {
  latitude: number;
  longitude: number;
  radius_km: number; // 1-50 km
  venue_type?: 'brewery' | 'winery' | 'all';
  limit?: number;
}

/**
 * Venue with distance (for proximity search results)
 */
export interface VenueWithDistance {
  venue_id: string;
  name: string;
  venue_type: 'brewery' | 'winery';
  coordinates: Coordinates;
  distance_km: number;
  city?: string;
  state?: string;
}

/**
 * Geolocation permission states
 */
export enum LocationPermission {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  PROMPT = 'PROMPT',
  NOT_DETERMINED = 'NOT_DETERMINED',
}

/**
 * Background location status
 */
export interface BackgroundLocationStatus {
  isEnabled: boolean;
  permission: LocationPermission;
  lastUpdate?: string; // ISO 8601
}

/**
 * Helper functions for geolocation calculations
 */
export const GeolocationHelper = {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance: (coord1: Coordinates, coord2: Coordinates): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Check if a point is within a geofence radius
   */
  isWithinGeofence: (
    position: Coordinates,
    geofence: GeofenceConfig
  ): boolean => {
    const distance = GeolocationHelper.calculateDistance(
      position,
      geofence.center
    );
    return distance * 1000 <= geofence.radius_meters; // Convert km to meters
  },
};
