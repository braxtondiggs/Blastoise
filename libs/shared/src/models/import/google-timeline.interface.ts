/**
 * Google Timeline Data Interfaces
 * Supports both legacy (Google Takeout) and new (mobile export) formats
 */

// ============================================
// GoogleTimelineData interface (both formats)
// ============================================

/**
 * Legacy Google Takeout format (desktop/web export)
 * Example: { "timelineObjects": [{ "placeVisit": {...} }, ...] }
 */
export interface LegacyTimelineFormat {
  timelineObjects: Array<{
    placeVisit?: LegacyPlaceVisit;
    // Other types exist (activitySegment, etc.) but we only care about placeVisits
  }>;
}

export interface LegacyPlaceVisit {
  location: {
    placeId?: string; // Google Place ID
    name?: string;
    address?: string;
    locationConfidence?: number;
    latitudeE7?: number; // Latitude * 10^7 (legacy format)
    longitudeE7?: number; // Longitude * 10^7 (legacy format)
  };
  duration: {
    startTimestamp: string; // ISO 8601
    endTimestamp: string; // ISO 8601
  };
  placeConfidence?: 'LOW_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'HIGH_CONFIDENCE' | 'USER_CONFIRMED';
}

/**
 * New mobile export format (Android/iOS Google Maps export)
 * Example: { "placeVisits": [{ "location": {...}, "duration": {...} }, ...] }
 */
export interface NewTimelineFormat {
  placeVisits: NewPlaceVisit[];
}

export interface NewPlaceVisit {
  location: {
    placeId?: string;
    name?: string;
    address?: string;
    latitudeE7?: number;
    longitudeE7?: number;
  };
  duration: {
    startTimestamp: string;
    endTimestamp: string;
  };
}

/**
 * Union type for both Timeline formats
 */
export type GoogleTimelineData = LegacyTimelineFormat | NewTimelineFormat;

// ============================================
// PlaceVisit interface (normalized format)
// ============================================

/**
 * Normalized PlaceVisit interface used internally after parsing
 * Combines both legacy and new formats into a common structure
 */
export interface PlaceVisit {
  place_id?: string; // Google Place ID (for exact matching)
  name: string; // Required - place name
  address?: string;
  latitude: number; // Decimal degrees
  longitude: number; // Decimal degrees
  arrival_time: string; // ISO 8601 timestamp
  departure_time: string; // ISO 8601 timestamp
  confidence?: 'low' | 'medium' | 'high' | 'user_confirmed';
}

// ============================================
// Format detection utilities
// ============================================

export const TimelineFormatDetection = {
  isLegacyFormat: (data: unknown): data is LegacyTimelineFormat => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'timelineObjects' in data &&
      Array.isArray((data as LegacyTimelineFormat).timelineObjects)
    );
  },

  isNewFormat: (data: unknown): data is NewTimelineFormat => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'placeVisits' in data &&
      Array.isArray((data as NewTimelineFormat).placeVisits)
    );
  },

  convertE7ToDecimal: (e7: number): number => {
    return e7 / 10000000;
  },
};
