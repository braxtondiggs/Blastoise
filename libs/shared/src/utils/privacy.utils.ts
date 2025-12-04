/**
 * Privacy Utilities
 * Functions for sanitizing and protecting user data
 */

import { Coordinates } from '../types/geolocation.types';
import { roundTimestamp } from './date.utils';

/**
 * Remove precise GPS coordinates from object (privacy protection)
 * Returns object without latitude/longitude fields
 */
export function removeGPSCoordinates<T extends Record<string, unknown>>(
  obj: T
): Omit<T, 'latitude' | 'longitude'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { latitude, longitude, ...rest } = obj;
  return rest as Omit<T, 'latitude' | 'longitude'>;
}

/**
 * Sanitize visit data for storage/transmission
 * - Rounds timestamp to nearest 15 minutes
 * - Removes GPS coordinates (only venue ID is kept)
 */
export interface SanitizedVisit {
  venue_id: string;
  arrival_time: string; // Rounded
  departure_time?: string; // Rounded
  is_active: boolean;
  source: 'auto_detect' | 'google_import' | 'manual';
}

export function sanitizeVisitData(visit: {
  venue_id: string;
  arrival_time: Date | string;
  departure_time?: Date | string;
  is_active: boolean;
  source: 'auto_detect' | 'google_import' | 'manual';
  user_location?: Coordinates; // This will be removed
}): SanitizedVisit {
  return {
    venue_id: visit.venue_id,
    arrival_time: roundTimestamp(visit.arrival_time).toISOString(),
    departure_time: visit.departure_time
      ? roundTimestamp(visit.departure_time).toISOString()
      : undefined,
    is_active: visit.is_active,
    source: visit.source,
    // user_location intentionally omitted
  };
}

/**
 * Anonymize shared visit data
 * - Only venue name and city (no address, no coordinates)
 * - Only date (no precise time)
 * - No user information
 */
export interface AnonymizedSharedVisit {
  venue_name: string;
  venue_city?: string;
  visit_date: string; // YYYY-MM-DD only
}

export function anonymizeSharedVisit(visit: {
  venue_name: string;
  venue_city?: string;
  venue_address?: string;
  venue_coordinates?: Coordinates;
  arrival_time: Date | string;
  user_id?: string;
  user_email?: string;
}): AnonymizedSharedVisit {
  const date =
    typeof visit.arrival_time === 'string'
      ? new Date(visit.arrival_time)
      : visit.arrival_time;

  return {
    venue_name: visit.venue_name,
    venue_city: visit.venue_city,
    visit_date: date.toISOString().split('T')[0], // Date only
    // All other fields intentionally omitted
  };
}

/**
 * Mask email address for display (privacy)
 * Example: "user@example.com" → "u***@example.com"
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!domain) return email; // Invalid email

  const maskedUsername =
    username.length <= 2
      ? username[0] + '*'
      : username[0] + '***' + username[username.length - 1];

  return `${maskedUsername}@${domain}`;
}

/**
 * Check if data contains sensitive location information
 */
export function containsSensitiveLocation(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  // Check for GPS coordinates
  if ('latitude' in obj && 'longitude' in obj) return true;
  if ('lat' in obj && 'lng' in obj) return true;
  if ('coords' in obj) return true;

  // Check for precise address
  if ('street_address' in obj || 'postal_code' in obj) return true;

  // Recursively check nested objects
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      if (containsSensitiveLocation(value)) return true;
    }
  }

  return false;
}

/**
 * Generate a privacy-safe share ID (UUID v4)
 */
export function generateShareId(): string {
  // Simple UUID v4 generation (browser-compatible)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate that shared data contains no user-identifying information
 */
export interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

export function validateAnonymization(data: unknown): ValidationResult {
  const violations: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { isValid: true, violations: [] };
  }

  const obj = data as Record<string, unknown>;

  // Check for prohibited fields
  const prohibitedFields = [
    'user_id',
    'email',
    'phone',
    'latitude',
    'longitude',
    'coords',
    'address',
    'street',
    'postal_code',
    'zip',
  ];

  for (const field of prohibitedFields) {
    if (field in obj) {
      violations.push(`Contains prohibited field: ${field}`);
    }
  }

  // Check for precise timestamps (should only have date)
  if ('timestamp' in obj && typeof obj['timestamp'] === 'string') {
    if (obj['timestamp'].includes('T')) {
      violations.push('Contains precise timestamp (should be date only)');
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Obfuscate venue coordinates for public display
 * Reduces precision to ~100m accuracy
 */
export function obfuscateCoordinates(coords: Coordinates): Coordinates {
  return {
    latitude: Math.round(coords.latitude * 1000) / 1000, // 3 decimal places ≈ 111m
    longitude: Math.round(coords.longitude * 1000) / 1000,
  };
}
