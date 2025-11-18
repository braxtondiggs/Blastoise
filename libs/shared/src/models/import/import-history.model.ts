/**
 * Import History Model
 * Tracks Google Timeline import operations with metadata and statistics
 */

import { ImportError } from './import-summary.interface';

export type ImportSource = 'google_timeline' | 'apple_maps';

export interface TierStatistics {
  tier1_matches: number; // Keyword matching
  tier2_matches: number; // Open Brewery DB
  tier3_matches: number; // Google Search
  unverified: number; // Failed all tiers
}

export interface ImportMetadata {
  existing_venues_matched?: number; // Venues matched by Place ID or proximity
  errors?: ImportError[];
  tier_statistics?: TierStatistics;
  processing_notes?: string[];
  summary?: string;
}

export interface ImportHistory {
  id: string; // UUID
  user_id: string; // UUID, FK to auth.users
  source: ImportSource;
  imported_at: string; // ISO 8601 timestamp
  file_name?: string; // Original filename
  job_id?: string; // BullMQ job ID for async imports (>100 places)
  total_places: number;
  visits_created: number;
  visits_skipped: number;
  new_venues_created: number;
  existing_venues_matched?: number; // Venues matched by Place ID or proximity
  processing_time_ms?: number;
  metadata?: ImportMetadata;
}

/**
 * Create Import History DTO
 * Used when creating a new import record
 */
export type CreateImportHistoryDto = Omit<ImportHistory, 'id' | 'imported_at'>;

/**
 * Update Import History DTO
 * Used when updating an import record (e.g., job completion)
 */
export type UpdateImportHistoryDto = Partial<Omit<ImportHistory, 'id' | 'user_id' | 'source'>> & {
  id: string;
};

/**
 * Import History Summary
 * Simplified view for listing imports
 */
export interface ImportHistorySummary {
  id: string;
  source: ImportSource;
  imported_at: string;
  file_name?: string;
  total_places: number;
  visits_created: number;
  new_venues_created: number;
}

/**
 * Import validation functions
 */
export const ImportHistoryValidation = {
  isValidSource: (source: string): source is ImportSource =>
    source === 'google_timeline' || source === 'apple_maps',
};
