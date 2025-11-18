/**
 * Google Timeline Data Interfaces
 * Supports mobile export formats (Android/iOS)
 * Note: Google Takeout Timeline has been discontinued
 */

// ============================================
// GoogleTimelineData interface (mobile formats)
// ============================================

/**
 * Mobile export format (older Android/iOS Google Maps export)
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
 * Semantic Segments format (Android Timeline export)
 * Example: { "semanticSegments": [{ "visit": {...} }, { "activity": {...} }, ...] }
 */
export interface SemanticSegmentsFormat {
  semanticSegments: Array<{
    startTime?: string; // ISO 8601
    endTime?: string; // ISO 8601
    startTimeTimezoneUtcOffsetMinutes?: number;
    endTimeTimezoneUtcOffsetMinutes?: number;
    visit?: {
      hierarchyLevel?: number;
      probability?: number;
      topCandidate?: {
        placeId?: string;
        semanticType?: string;
        probability?: number;
        placeLocation?: {
          latLng?: string; // Format: "45.5231°, -122.6765°"
          name?: string; // Often missing in real exports
          address?: string; // Often missing in real exports
        };
      };
    };
    activity?: {
      // Activity segments (walking, driving, etc.) - we skip these
      start?: { latLng?: string };
      end?: { latLng?: string };
      topCandidate?: {
        type?: string;
        probability?: number;
      };
    };
  }>;
}

/**
 * Union type for all supported Timeline formats
 * Legacy Google Takeout format has been removed (discontinued by Google)
 */
export type GoogleTimelineData = NewTimelineFormat | SemanticSegmentsFormat;

// ============================================
// PlaceVisit interface (normalized format)
// ============================================

/**
 * Normalized PlaceVisit interface used internally after parsing
 * Combines all formats into a common structure
 */
export interface PlaceVisit {
  place_id?: string; // Google Place ID (for exact matching)
  name: string | null; // Optional - may be missing in real exports
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
   * Parse latLng string to decimal degrees
   * Format: "45.5231°, -122.6765°" → { lat: 45.5231, lng: -122.6765 }
   */
  parseLatLngString: (latLng: string): { lat: number; lng: number } | null => {
    const match = latLng.match(/^([-+]?\d+\.?\d*)°?,?\s*([-+]?\d+\.?\d*)°?$/);
    if (!match) {
      return null;
    }
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }
    return { lat, lng };
  },
};
