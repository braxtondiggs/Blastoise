/**
 * Google Timeline Data Interfaces
 * Supports mobile export formats (Android/iOS)
 * Note: Google Takeout Timeline format has been discontinued
 */

// ============================================
// GoogleTimelineData interface
// ============================================

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
    latLng?: string; // String format: "lat, lng"
  };
  duration: {
    startTimestamp: string;
    endTimestamp: string;
  };
}

/**
 * Semantic segments format (Android Timeline export)
 * Example: { "semanticSegments": [{ "startTime": ..., "endTime": ..., "visit": {...} }, ...] }
 */
export interface SemanticSegmentsFormat {
  semanticSegments: SemanticSegment[];
}

export interface SemanticSegment {
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
  visit?: {
    topCandidate?: {
      placeId?: string;
      placeLocation?: {
        name?: string;
        address?: string;
        latLng?: string; // String format: "lat, lng" or "geo:lat,lng"
      };
    };
  };
  // Activity segments exist but we only care about visits
}

/**
 * Union type for Timeline formats
 */
export type GoogleTimelineData = NewTimelineFormat | SemanticSegmentsFormat;

// ============================================
// PlaceVisit interface (normalized format)
// ============================================

/**
 * Normalized PlaceVisit interface used internally after parsing
 * Combines all Timeline formats into a common structure
 * Note: name is optional for coordinate-only entries (enriched by Tier 1/2 APIs)
 */
export interface PlaceVisit {
  place_id?: string; // Google Place ID (for exact matching)
  name?: string; // Optional - may be enriched by external APIs
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
  isNewFormat: (data: unknown): data is NewTimelineFormat => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'placeVisits' in data &&
      Array.isArray((data as NewTimelineFormat).placeVisits)
    );
  },

  isSemanticSegmentsFormat: (data: unknown): data is SemanticSegmentsFormat => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'semanticSegments' in data &&
      Array.isArray((data as SemanticSegmentsFormat).semanticSegments)
    );
  },

  convertE7ToDecimal: (e7: number): number => {
    return e7 / 10000000;
  },

  /**
   * Parse latLng string format: "lat, lng" or "geo:lat,lng"
   * Returns { lat, lng } or null if invalid
   */
  parseLatLngString: (latLng: string): { lat: number; lng: number } | null => {
    if (!latLng) return null;

    // Handle "geo:lat,lng" format
    const cleanLatLng = latLng.replace(/^geo:/i, '');

    // Split by comma (with optional spaces)
    const parts = cleanLatLng.split(/,\s*/);
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  },
};
