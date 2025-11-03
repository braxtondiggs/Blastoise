/**
 * Shared Visit Model
 * Represents an anonymized visit shared publicly or with friends
 */

export interface SharedVisit {
  id: string; // UUID (public share link ID)
  visit_id: string; // UUID, FK to Visit
  venue_name: string; // Denormalized for privacy
  venue_city?: string; // Denormalized for privacy
  visit_date: string; // Date only (YYYY-MM-DD), no time to anonymize
  shared_at: string; // ISO 8601 timestamp
  expires_at?: string; // ISO 8601 timestamp, optional expiration
  view_count: number; // Number of times viewed
}

/**
 * Create Shared Visit DTO
 * Used when creating a new share
 */
export interface CreateSharedVisitDto {
  visit_id: string;
  expires_at?: string; // Optional expiration time
}

/**
 * Shared Visit validation functions
 */
export const SharedVisitValidation = {
  isValidExpiration: (sharedAt: string, expiresAt?: string): boolean => {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() > new Date(sharedAt).getTime();
  },

  isExpired: (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now();
  },
};
