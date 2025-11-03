/**
 * Distance Utilities
 * Functions for distance calculations using Haversine formula
 */

import { Coordinates } from '../types/geolocation.types';

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distance in meters
 */
export function calculateDistanceMeters(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  return calculateDistance(coord1, coord2) * 1000;
}

/**
 * Calculate distance in miles
 */
export function calculateDistanceMiles(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  return calculateDistance(coord1, coord2) * 0.621371;
}

/**
 * Format distance to human-readable string
 * Automatically switches between meters and kilometers
 */
export function formatDistance(
  distanceKm: number,
  unit: 'metric' | 'imperial' = 'metric'
): string {
  if (unit === 'imperial') {
    const miles = distanceKm * 0.621371;
    if (miles < 0.1) {
      const feet = Math.round(miles * 5280);
      return `${feet} ft`;
    }
    return miles < 10
      ? `${miles.toFixed(1)} mi`
      : `${Math.round(miles)} mi`;
  }

  // Metric
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }

  return distanceKm < 10
    ? `${distanceKm.toFixed(1)} km`
    : `${Math.round(distanceKm)} km`;
}

/**
 * Check if point is within radius
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistance(center, point) <= radiusKm;
}

/**
 * Find nearest venue from a list
 */
export function findNearest<T extends { latitude: number; longitude: number }>(
  userLocation: Coordinates,
  venues: T[]
): T | null {
  if (venues.length === 0) return null;

  let nearest = venues[0];
  let minDistance = calculateDistance(userLocation, {
    latitude: venues[0].latitude,
    longitude: venues[0].longitude,
  });

  for (let i = 1; i < venues.length; i++) {
    const distance = calculateDistance(userLocation, {
      latitude: venues[i].latitude,
      longitude: venues[i].longitude,
    });

    if (distance < minDistance) {
      minDistance = distance;
      nearest = venues[i];
    }
  }

  return nearest;
}

/**
 * Sort venues by distance from user location
 */
export function sortByDistance<T extends { latitude: number; longitude: number }>(
  userLocation: Coordinates,
  venues: T[]
): Array<T & { distance_km: number }> {
  return venues
    .map((venue) => ({
      ...venue,
      distance_km: calculateDistance(userLocation, {
        latitude: venue.latitude,
        longitude: venue.longitude,
      }),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate bearing between two coordinates (0-360 degrees)
 * 0 = North, 90 = East, 180 = South, 270 = West
 */
export function calculateBearing(
  start: Coordinates,
  end: Coordinates
): number {
  const dLon = toRadians(end.longitude - start.longitude);
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Get compass direction from bearing (N, NE, E, SE, S, SW, W, NW)
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
