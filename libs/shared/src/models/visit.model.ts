/**
 * Visit Model
 * Represents a single visit to a venue by a user
 */

export type DetectionMethod = 'auto' | 'manual';
export type VisitSource = 'auto_detect' | 'google_import' | 'manual';

export interface Visit {
  id: string; // UUID
  user_id: string; // UUID, FK to User
  venue_id: string; // UUID, FK to Venue
  arrival_time: string; // ISO 8601, rounded to nearest 15 min
  departure_time?: string; // ISO 8601, rounded to nearest 15 min
  duration_minutes?: number; // Calculated from arrival - departure
  is_active: boolean; // True if visit is in progress
  detection_method: DetectionMethod;
  source?: VisitSource; // Visit origin: auto_detect, google_import, manual (T015)
  imported_at?: string; // ISO 8601 timestamp when visit was imported (T015)
  synced: boolean; // Client-side only - true if synced to server
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Create Visit DTO
 * Used when creating a new visit (omits generated fields)
 * Note: user_id is omitted as the server gets it from the authenticated token
 */
export type CreateVisitDto = Omit<
  Visit,
  'id' | 'user_id' | 'duration_minutes' | 'created_at' | 'updated_at' | 'synced'
>;

/**
 * Update Visit DTO
 * Used when updating an existing visit (typically to set departure time)
 */
export type UpdateVisitDto = Partial<Omit<Visit, 'id' | 'created_at' | 'user_id' | 'venue_id'>> & {
  id: string;
};

/**
 * Batch Visit Sync DTO
 * Used for offline sync - uploads multiple visits at once
 */
export interface BatchVisitSyncDto {
  visits: CreateVisitDto[];
}

/**
 * Visit validation functions
 */
export const VisitValidation = {
  isValidTimeSequence: (arrivalTime: string, departureTime?: string): boolean => {
    if (!departureTime) return true;
    return new Date(departureTime).getTime() > new Date(arrivalTime).getTime();
  },

  calculateDuration: (arrivalTime: string, departureTime: string): number => {
    const arrival = new Date(arrivalTime).getTime();
    const departure = new Date(departureTime).getTime();
    return Math.round((departure - arrival) / (1000 * 60)); // minutes
  },
};
