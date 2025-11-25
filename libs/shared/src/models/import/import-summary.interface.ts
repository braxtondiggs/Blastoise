/**
 * Import Summary and Error Interfaces
 * Used for reporting import results to the user
 */

export interface ImportSummary {
  success: boolean;
  total_places: number; // Total places found in Timeline file
  visits_created: number; // Visits successfully created
  visits_skipped: number; // Visits skipped (duplicates or outside time window)
  new_venues_created: number; // New venues created during import
  existing_venues_matched: number; // Existing venues matched (Place ID or proximity)
  processing_time_ms: number;
  job_id?: string; // BullMQ job ID (for async imports)
  errors: ImportError[];
  tier_statistics?: {
    tier1_matches: number; // Keyword matching
    tier2_matches: number; // Open Brewery DB
    tier3_matches: number; // Google Search
    unverified: number; // Places that didn't match any tier
  };
}

export interface ImportError {
  place_name: string;
  address?: string;
  timestamp: string; // ISO 8601
  error: string; // Human-readable error message
  error_code?:
    | 'INVALID_COORDINATES'
    | 'NOT_BREWERY_OR_WINERY'
    | 'DUPLICATE_VISIT'
    | 'MISSING_REQUIRED_FIELDS'
    | 'VENUE_CREATION_FAILED'
    | 'VISIT_CREATION_FAILED'
    | 'VERIFICATION_FAILED';
}

/**
 * Import validation functions
 */
export const ImportSummaryValidation = {
  isSuccess: (summary: ImportSummary): boolean => {
    return summary.success && summary.errors.length === 0;
  },

  hasWarnings: (summary: ImportSummary): boolean => {
    return summary.success && summary.errors.length > 0;
  },

  hasErrors: (summary: ImportSummary): boolean => {
    return !summary.success;
  },

  getSuccessRate: (summary: ImportSummary): number => {
    if (summary.total_places === 0) return 0;
    return (summary.visits_created / summary.total_places) * 100;
  },
};
