/**
 * Response DTO for import operations
 */

export interface TierStatisticsDto {
  tier1_matches: number;
  tier2_matches: number;
  tier3_matches: number;
  unverified: number;
}

export interface ImportErrorDto {
  place_name: string;
  address?: string;
  timestamp: string;
  error: string;
  error_code?:
    | 'INVALID_COORDINATES'
    | 'NOT_BREWERY_OR_WINERY'
    | 'DUPLICATE_VISIT'
    | 'MISSING_REQUIRED_FIELDS'
    | 'VENUE_CREATION_FAILED'
    | 'VISIT_CREATION_FAILED'
    | 'VERIFICATION_FAILED';
}

export class ImportSummaryDto {
  success!: boolean;
  total_places!: number;
  visits_created!: number;
  visits_skipped!: number;
  new_venues_created!: number;
  existing_venues_matched!: number;
  processing_time_ms!: number;
  job_id?: string; // For async imports
  errors!: ImportErrorDto[];
  tier_statistics?: TierStatisticsDto;

  constructor(partial: Partial<ImportSummaryDto>) {
    Object.assign(this, partial);
    this.errors = partial.errors || [];
  }
}
