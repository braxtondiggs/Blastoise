/**
 * Venue Model
 * Represents a brewery or winery location
 */

export type VenueType = 'brewery' | 'winery';
export type VenueSource = 'osm' | 'brewerydb' | 'manual';

export interface Venue {
  id: string; // UUID
  name: string; // max 200 chars
  address?: string; // max 500 chars
  city?: string; // max 100 chars
  state?: string; // max 50 chars
  country?: string; // ISO 3166-1 alpha-2, max 50 chars
  postal_code?: string; // max 20 chars
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
  venue_type: VenueType;
  source: VenueSource;
  source_id?: string; // External ID from data source
  metadata?: Record<string, unknown>; // Additional info (website, phone, hours, etc.)
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Create Venue DTO
 * Used when creating a new venue (omits generated fields)
 */
export type CreateVenueDto = Omit<Venue, 'id' | 'created_at' | 'updated_at'>;

/**
 * Update Venue DTO
 * Used when updating an existing venue (all fields optional except id)
 */
export type UpdateVenueDto = Partial<Omit<Venue, 'id' | 'created_at'>> & {
  id: string;
};

/**
 * Venue validation functions
 */
export const VenueValidation = {
  isValidLatitude: (lat: number): boolean => lat >= -90 && lat <= 90,
  isValidLongitude: (lng: number): boolean => lng >= -180 && lng <= 180,
  isValidName: (name: string): boolean => name.trim().length > 0 && name.length <= 200,
};
