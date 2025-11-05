# Requirements Checklist: Google Timeline Import

**Purpose**: Track completion of all functional requirements for the Google Timeline Import feature
**Created**: 2025-01-04
**Feature**: [spec.md](./spec.md)

**Note**: This checklist covers all 36 functional requirements defined in the feature specification.

## Import Flow (FR-001 to FR-005)

- [ ] FR-001: Support uploading Google Timeline JSON files on both web and mobile platforms
- [ ] FR-002: Validate JSON files client-side (file size ≤100MB, valid JSON structure)
- [ ] FR-003: Parse both legacy Google Takeout format and new mobile export format
- [ ] FR-004: Extract only `placeVisit` entries and ignore `activitySegment` entries
- [ ] FR-005: Require user authentication for import operations (no anonymous imports)

## Venue Filtering & Verification (FR-006 to FR-007)

- [ ] FR-006: Implement three-tier verification strategy:
  - [ ] **Tier 1 (Local Keyword Matching)**:
    - [ ] Filter using venue name, address, and metadata keywords
    - [ ] Include keywords: brewery, brewing, brewpub, taproom, winery, vineyard, tasting room, cidery, meadery
    - [ ] Exclude keywords: hotel, airport, supermarket, liquor store, bottle shop, museum
    - [ ] Process in <1ms per venue (0 API calls)
    - [ ] Target 80-90% coverage with high confidence
  - [ ] **Tier 2 (Open Brewery DB API)**:
    - [ ] Query for ambiguous cases (confidence 0.3-0.7 from Tier 1)
    - [ ] Proximity search within 100m + fuzzy name matching (≥80% similarity)
    - [ ] Rate limit to 100 requests/hour using Bottleneck library
    - [ ] Cache results in Redis for 30 days
    - [ ] Target ~200ms processing per venue
  - [ ] **Tier 3 (Google Search Verification)**:
    - [ ] Fetch Google search results for venue name + address
    - [ ] Simple keyword matching on raw HTML text (no parsing library)
    - [ ] Search for 'brew', 'brewery', 'winery', 'wine' in lowercase HTML
    - [ ] Rate limit to 10-20 requests per import with 500ms minimum delay
    - [ ] Cache results in Redis for 60 days
    - [ ] Implement user agent rotation
    - [ ] Target ~1-2 seconds processing per venue (with delay)
- [ ] FR-007: Skip non-matching places after all three tiers and report count in summary

## Venue Matching (FR-008 to FR-011)

- [ ] FR-008: Implement three-step venue matching algorithm:
  - [ ] Step 1: Exact Google Place ID match (if available)
  - [ ] Step 2: Proximity match (within 100m) with name similarity (≥80% fuzzy match score)
  - [ ] Step 3: Create new venue if no match found
- [ ] FR-009: Store Google Place ID with venues to enable future exact matching
- [ ] FR-010: Create new venues with all available data (name, Place ID, coordinates, address, inferred type)
- [ ] FR-011: Infer venue type (brewery vs winery) from Google place data

## Visit Creation (FR-012 to FR-016)

- [ ] FR-012: Create visits with rounded timestamps (15-minute intervals) for privacy
- [ ] FR-013: Detect duplicate visits (same user, venue, timestamp within 15-min window) and skip
- [ ] FR-014: Store visit source metadata (`source='google_import'`, `imported_at` timestamp)
- [ ] FR-015: Associate all imported visits with authenticated user's account
- [ ] FR-016: Validate that arrival timestamp is before departure timestamp

## Import History (FR-017 to FR-019)

- [ ] FR-017: Record metadata for each import operation:
  - [ ] User ID
  - [ ] Import timestamp
  - [ ] Source type ('google_timeline')
  - [ ] File name (if available)
  - [ ] Total places processed
  - [ ] Visits created count
  - [ ] Visits skipped count
  - [ ] New venues created count
  - [ ] Processing time in milliseconds
  - [ ] Error details (if any)
- [ ] FR-018: Allow users to view complete import history in Settings → Data Management → Import History
- [ ] FR-019: Display detailed statistics for each past import

## Error Handling (FR-020 to FR-022)

- [ ] FR-020: Provide clear error messages for invalid file uploads:
  - [ ] Invalid JSON format
  - [ ] File size exceeds limit
  - [ ] Unrecognized Timeline format
- [ ] FR-021: Handle partial import failures gracefully (import successful records, report failures)
- [ ] FR-022: Provide comprehensive import summary:
  - [ ] Total places
  - [ ] Brewery/winery places
  - [ ] Matched venues
  - [ ] New venues
  - [ ] Visits created
  - [ ] Visits skipped
  - [ ] Errors
  - [ ] Processing time

## Privacy & Security (FR-023 to FR-026)

- [ ] FR-023: Delete uploaded Timeline JSON file immediately after processing completion
- [ ] FR-024: NOT store raw GPS coordinates from Timeline data, only venue IDs
- [ ] FR-025: Enforce rate limiting: maximum 5 imports per day per user
- [ ] FR-026: Sanitize and validate all extracted data before database insertion

## Async Processing & Queue Management (FR-027 to FR-033)

- [ ] FR-027: Use BullMQ job queue for imports with >100 places
  - [ ] Install and configure BullMQ with Redis
  - [ ] Create import queue with proper configuration
  - [ ] Set up queue workers for processing jobs
- [ ] FR-028: Provide real-time progress updates (percentage complete, places processed)
  - [ ] Update job progress during processing
  - [ ] Expose progress via status endpoint
- [ ] FR-029: Return job ID immediately for async imports: `{ jobId, status: "queued" }`
- [ ] FR-030: Implement status endpoint: `GET /import/status/:jobId → { status, progress, result }`
- [ ] FR-031: Implement exponential backoff for failed verification API calls
  - [ ] Tier 2 (Open Brewery DB): 3 attempts with backoff
  - [ ] Tier 3 (Google Search): 3 attempts with backoff
- [ ] FR-032: Notify users when async import completes
  - [ ] Push notification support
  - [ ] Email notification support (optional)
- [ ] FR-033: Process imports <100 places synchronously (no job queue)

## Batch Processing (FR-034 to FR-036)

- [ ] FR-034: Process venue verification in batches to prevent timeout
  - [ ] Determine optimal batch size
  - [ ] Implement batch processing logic
- [ ] FR-035: Cache verification results in Redis with TTL
  - [ ] Tier 2 cache: 30 days TTL
  - [ ] Tier 3 cache: 60 days TTL
  - [ ] Cache key format: `verify:tier2:{placeId}` and `verify:tier3:{name}:{address}`
- [ ] FR-036: Implement rate limiting per verification tier
  - [ ] Tier 1: No limit (local processing)
  - [ ] Tier 2: Max 100 requests/hour using Bottleneck
  - [ ] Tier 3: Max 10-20 requests per import with 500ms minimum delay

## Success Criteria Validation

### User Engagement (SC-001 to SC-003)
- [ ] SC-001: Track adoption rate (target: 50% of users attempt import within 7 days)
- [ ] SC-002: Measure completion time (target: <3 minutes for <500 visits)
- [ ] SC-003: Monitor success rate (target: 80% of imports complete successfully)

### Data Quality (SC-004 to SC-007)
- [ ] SC-004: Measure exact match rate for Place IDs (target: ≥90%)
- [ ] SC-005: Measure fuzzy matching accuracy (target: ≥80%)
- [ ] SC-006: Track duplicate detection accuracy (target: ≥95%, false positive <5%)
- [ ] SC-007: Monitor brewery/winery filtering precision (target: ≥85%)

### Technical Performance (SC-008 to SC-016)
- [ ] SC-008: Benchmark processing speed (target: 100 visits in ≤5 seconds for synchronous imports)
- [ ] SC-009: Test large file handling (target: 100MB without timeout)
- [ ] SC-010: Monitor import error rate (target: <5%)
- [ ] SC-011: Track file upload success rate (target: 99%)
- [ ] SC-012: Measure async import response time (target: job ID returned in <500ms)
- [ ] SC-013: Measure job status polling response time (target: <200ms)
- [ ] SC-014: Validate Tier 1 keyword matching precision (target: ≥85%)
- [ ] SC-015: Monitor Tier 2 rate limit compliance (target: <100 requests/hour)
- [ ] SC-016: Monitor Tier 3 rate limit compliance (target: ≥500ms delay between requests)

### User Satisfaction (SC-017 to SC-020)
- [ ] SC-017: Track venue matching complaints (target: <5% report errors)
- [ ] SC-018: Measure user satisfaction via in-app survey (target: ≥4.0/5.0)
- [ ] SC-019: Measure reduction in manual entry (target: 70% reduction for users who import)
- [ ] SC-020: Track async import monitoring success (target: 90%+ users successfully monitor progress)

## Database Schema Changes

- [ ] Create `import_history` table with all required columns
  - [ ] Add `job_id` column for async import tracking
- [ ] Add indexes: `idx_import_history_user`, `idx_import_history_source`, `idx_import_history_job_id`
- [ ] Add `google_place_id` column to `venues` table (VARCHAR(255), UNIQUE)
- [ ] Add `source` column to `venues` table (VARCHAR(50), default 'manual')
- [ ] Add `verification_tier` column to `venues` table (INTEGER, nullable, 1-3)
- [ ] Add index: `idx_venues_google_place_id`
- [ ] Add `source` column to `visits` table (VARCHAR(50), default 'auto_detect')
- [ ] Add `imported_at` column to `visits` table (TIMESTAMPTZ, nullable)
- [ ] Add index: `idx_visits_source`

## Infrastructure & Dependencies

- [ ] Install BullMQ: `npm install bullmq`
- [ ] Install Bottleneck for rate limiting: `npm install bottleneck`
- [ ] Install fuzzball for fuzzy string matching: `npm install fuzzball`
- [ ] Configure BullMQ with existing Redis connection
- [ ] Set up Open Brewery DB API client (no auth required)
- [ ] Configure verification cache in Redis with proper TTL

## Testing Coverage

### Unit Tests
- [ ] JSON parser (both legacy and new formats)
- [ ] **Tier 1**: Keyword matching logic (inclusion/exclusion keywords)
- [ ] **Tier 2**: Open Brewery DB API client with rate limiting
- [ ] **Tier 3**: Google Search verifier with simple keyword matching on HTML text
- [ ] Venue matching algorithm (Place ID, proximity, fuzzy matching)
- [ ] Duplicate visit detection
- [ ] Timestamp rounding and validation
- [ ] Venue type inference
- [ ] Error message generation
- [ ] BullMQ job processing logic
- [ ] Cache hit/miss logic for verification results

### Integration Tests
- [ ] POST /api/v1/import/google-timeline endpoint (synchronous <100 places)
- [ ] POST /api/v1/import/google-timeline endpoint (async >100 places)
- [ ] GET /api/v1/import/status/:jobId endpoint
- [ ] GET /api/v1/import/history endpoint
- [ ] File upload validation
- [ ] Import metadata recording with job ID
- [ ] Rate limiting enforcement (5 imports/day per user)
- [ ] Authentication requirement
- [ ] Tier 2 rate limiting (100 requests/hour)
- [ ] Tier 3 rate limiting (500ms delay)
- [ ] Redis cache integration for verification results
- [ ] BullMQ job completion and progress tracking

### E2E Tests
- [ ] Complete synchronous import flow (<100 places)
- [ ] Complete async import flow (>100 places) with progress monitoring
- [ ] Import history page navigation and display
- [ ] Error handling for invalid files
- [ ] Large file handling (performance test)
- [ ] Duplicate import prevention
- [ ] Multi-format support (legacy and new)
- [ ] Push notification on import completion
- [ ] Three-tier verification flow with fallback

## Notes

- Check items off as completed: `[x]`
- Add implementation notes or findings inline
- Link to PRs, commits, or test results as reference
- Track any deviations from original requirements
- Document any additional requirements discovered during implementation
