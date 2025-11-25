# Feature Specification: Google Timeline Import

**Feature Branch**: `001-003-google-timeline-import`
**Created**: 2025-01-04
**Status**: Draft
**Input**: User description: "I want to build a way to import user data from Google timeline. Help me with a plan of attack for this project. Don't implement anything yet"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Timeline Import Flow (Priority: P1)

A user with existing Google Timeline data wants to import their historical brewery and winery visits into Blastoise rather than manually entering each visit. They export their Timeline data as a JSON file and upload it through the Blastoise web or mobile app. The system processes the file, identifies relevant brewery/winery visits, matches them to existing venues or creates new ones, and imports the visits into their timeline.

**Why this priority**: This is the core MVP functionality that delivers immediate value by reducing manual data entry and giving users instant gratification when they see years of visit history populated automatically.

**Independent Test**: Can be fully tested by uploading a sample Google Timeline JSON file containing brewery/winery visits and verifying that visits appear in the user's timeline with correct venues and timestamps.

**Acceptance Scenarios**:

1. **Given** a user has exported Google Timeline data as JSON, **When** they upload the file through the import wizard, **Then** the system validates the file, processes it, and displays an import summary showing total visits found, visits imported, and any errors
2. **Given** the system has processed a Timeline import, **When** the user views their timeline, **Then** imported visits appear chronologically with correct venue names and rounded timestamps (15-minute intervals)
3. **Given** a Timeline file contains visits to both breweries and non-brewery locations, **When** the system processes the file, **Then** only brewery and winery visits are imported, other locations are filtered out
4. **Given** a Timeline file contains duplicate visits already in the database, **When** the system processes the file, **Then** duplicates are detected and skipped, reported in the import summary

---

### User Story 2 - Intelligent Venue Matching (Priority: P2)

During import, the system intelligently matches Google Timeline places to existing Blastoise venues using multiple strategies: exact Google Place ID matching, proximity-based matching with name similarity, and finally creates new venues when no match is found. This ensures data quality and prevents duplicate venue creation.

**Why this priority**: Accurate venue matching is critical for data integrity and user experience. Poor matching would create duplicate venues or mis-assign visits, undermining trust in the import feature.

**Independent Test**: Can be tested by uploading Timeline data containing a mix of venues already in Blastoise (with Place IDs), venues close to existing ones (proximity test), and completely new venues, then verifying correct matching in each case.

**Acceptance Scenarios**:

1. **Given** a Timeline place has a Google Place ID that matches an existing Blastoise venue, **When** the system processes this place, **Then** it uses the existing venue rather than creating a duplicate
2. **Given** a Timeline place has no Place ID but is within 100m of an existing venue with 80%+ name similarity, **When** the system processes this place, **Then** it matches to the existing venue
3. **Given** a Timeline place has no matching venue in the database, **When** the system processes this place, **Then** it creates a new venue with the Google Place ID, coordinates, name, and inferred type (brewery/winery)
4. **Given** multiple venues exist within proximity, **When** the system attempts fuzzy matching, **Then** it selects the venue with highest name similarity score

---

### User Story 3 - Async Processing for Large Imports (Priority: P2)

When a user uploads a large Google Timeline file (>100 places), the system queues the import job using BullMQ and returns immediately with a job ID. The user can monitor progress in real-time via a progress screen and receives a notification when the import completes. This prevents timeouts and provides a better user experience for large datasets.

**Why this priority**: Large imports (1000+ places) can take 5-10 minutes to process with external API verification. Async processing is essential to prevent browser/app timeouts and provide a professional UX.

**Independent Test**: Can be tested by uploading a large Timeline file (500+ places), verifying that the API returns immediately with a job ID, polling the status endpoint to see progress updates, and confirming that a notification is sent when complete.

**Acceptance Scenarios**:

1. **Given** a user uploads a Timeline file with >100 places, **When** the system receives the upload, **Then** it returns immediately with `{ jobId, status: "queued", estimatedCompletionMs }` without processing
2. **Given** an import job is queued, **When** the user polls `GET /import/status/:jobId`, **Then** they receive real-time progress: `{ status: "processing", progress: 45, processed: 450, total: 1000 }`
3. **Given** an import job completes successfully, **When** the user checks the status, **Then** they receive `{ status: "completed", result: { visitsCreated: 847, visitsSkipped: 12, ... } }` and a push notification
4. **Given** a user uploads a Timeline file with <100 places, **When** the system receives the upload, **Then** it processes synchronously and returns the complete result immediately (no job queue)

---

### User Story 4 - Import History and Management (Priority: P3)

Users can view a history of past imports, see detailed statistics about each import (total places processed, visits created, venues added), and optionally undo an import if they made a mistake or want to re-import with corrected data.

**Why this priority**: This provides transparency and control, allowing users to audit their imports and recover from mistakes. It's important for trust but not essential for the core import functionality to work.

**Independent Test**: Can be tested by performing multiple imports over time, viewing the import history page, and verifying that each import shows correct metadata, then testing the undo functionality to ensure visits and venues can be rolled back.

**Acceptance Scenarios**:

1. **Given** a user has completed one or more imports, **When** they navigate to Settings → Data Management → Import History, **Then** they see a list of all past imports with timestamps, visit counts, and processing times
2. **Given** a user selects a past import from history, **When** they view the import details, **Then** they see full statistics including total places, visits created, visits skipped, new venues added, and any errors that occurred
3. **Given** a user wants to undo an import, **When** they click "Undo Import" on a specific import record, **Then** the system removes all visits created by that import and optionally removes newly created venues if they have no other visits

---

### Edge Cases

- What happens when a Timeline file is in an unexpected format (legacy vs new format)?
  - System should detect format and use appropriate parser, show error if format is unrecognized
- How does system handle very large files (100MB+ with thousands of places)?
  - File size limit enforced at 100MB, files with >100 places processed asynchronously via BullMQ
  - Files with <100 places processed synchronously for faster UX
  - User receives job ID and can poll for progress updates
- What if external verification APIs (Open Brewery DB, Google Search) are down or rate-limited?
  - System falls back to Tier 1 (keyword matching) results with lower confidence
  - Failed API calls retry with exponential backoff (3 attempts max)
  - Import continues with available data, errors reported in summary
- What if a place has coordinates but no name or Place ID?
  - System skips places without sufficient identifying information, reports in error summary
- How does system handle timezone differences in timestamps?
  - Timestamps are normalized to UTC during import, displayed in user's local timezone
- What if the same file is uploaded multiple times?
  - Duplicate detection prevents re-importing the same visits, import summary shows all skipped
- How does system handle invalid or corrupted JSON?
  - Client-side validation catches malformed JSON before upload, shows user-friendly error message
- What if a venue exists in Blastoise but with slightly different coordinates than Google data?
  - Proximity matching (100m radius) with name similarity handles minor coordinate discrepancies
- How does system determine if a Google place is a brewery vs winery?
  - Uses combination of Google Place Types, business name keywords ("brewery", "winery", "taproom"), and categories

## Requirements *(mandatory)*

### Functional Requirements

#### Import Flow
- **FR-001**: System MUST support uploading Google Timeline JSON files on both web and mobile platforms
- **FR-002**: System MUST validate JSON files client-side before sending to backend (file size ≤100MB, valid JSON structure)
- **FR-003**: System MUST parse both legacy Google Takeout format (Semantic Location History) and new mobile export format (Timeline.json)
- **FR-004**: System MUST extract only `placeVisit` entries and ignore `activitySegment` entries
- **FR-005**: System MUST require user authentication for import operations (no anonymous imports)

#### Venue Filtering & Verification
- **FR-006**: System MUST filter Google Timeline places using **three-tier verification strategy**:
  - **Tier 1 (Local Keyword Matching)**: Primary filter using venue name, address, and Google Timeline metadata
    - Keywords: brewery, brewing, brewpub, taproom, winery, vineyard, tasting room, cidery, meadery
    - Exclusions: hotel, airport, supermarket, liquor store, bottle shop, museum
    - Processing: <1ms per venue, 0 API calls
    - Coverage: 80-90% of cases with high confidence
  - **Tier 2 (Open Brewery DB API)**: Secondary verification for ambiguous cases (confidence 0.3-0.7 from Tier 1)
    - Proximity search within 100m + fuzzy name matching (≥80% similarity)
    - Rate limited to 100 requests/hour using Bottleneck
    - Results cached in Redis for 30 days
    - Processing: ~200ms per venue
    - Coverage: Additional 5-10% of cases
  - **Tier 3 (Google Search Verification)**: Last resort for highly ambiguous cases
    - Fetch Google search results for venue name + address
    - Simple keyword matching on raw HTML text (no parsing library needed)
    - Search for 'brew', 'brewery', 'winery', 'wine' in HTML response
    - Rate limited to 10-20 requests per import with 500ms minimum delay between requests
    - Results cached in Redis for 60 days
    - Processing: ~1-2 seconds per venue (with delay)
    - Coverage: Final 1-5% of cases
    - User agent rotation to appear more natural
- **FR-007**: System MUST skip places that don't match brewery/winery criteria after all three tiers and report count in summary

#### Venue Matching
- **FR-008**: System MUST attempt to match Google places to existing Blastoise venues using three-step algorithm:
  1. Exact Google Place ID match (if available)
  2. Proximity match (within 100m) with name similarity (≥80% fuzzy match score)
  3. Create new venue if no match found
- **FR-009**: System MUST store Google Place ID with venues to enable future exact matching
- **FR-010**: System MUST create new venues with all available data: name, Google Place ID, coordinates, address, inferred type (brewery/winery)
- **FR-011**: System MUST infer venue type (brewery vs winery) from Google place data (name, categories, types)

#### Visit Creation
- **FR-012**: System MUST create visits with rounded timestamps (15-minute intervals) to maintain privacy consistency
- **FR-013**: System MUST detect duplicate visits (same user, venue, and timestamp within 15-minute window) and skip creation
- **FR-014**: System MUST store visit source metadata: `source='google_import'` and `imported_at` timestamp
- **FR-015**: System MUST associate all imported visits with the authenticated user's account
- **FR-016**: System MUST validate that arrival timestamp is before departure timestamp

#### Import History
- **FR-017**: System MUST record metadata for each import operation including:
  - User ID
  - Import timestamp
  - Source type ('google_timeline')
  - File name (if available)
  - Total places processed
  - Visits created count
  - Visits skipped count
  - New venues created count
  - Processing time in milliseconds
  - Error details (if any)
- **FR-018**: Users MUST be able to view complete import history in Settings → Data Management → Import History
- **FR-019**: Users MUST be able to view detailed statistics for each past import

#### Error Handling
- **FR-020**: System MUST provide clear error messages for invalid file uploads:
  - Invalid JSON format
  - File size exceeds limit
  - Unrecognized Timeline format
- **FR-021**: System MUST handle partial import failures gracefully (import successful records, report failures)
- **FR-022**: System MUST provide import summary showing: total places, brewery/winery places, matched venues, new venues, visits created, visits skipped, errors, processing time

#### Privacy & Security
- **FR-023**: System MUST delete uploaded Timeline JSON file immediately after processing completion
- **FR-024**: System MUST NOT store raw GPS coordinates from Timeline data, only venue IDs
- **FR-025**: System MUST enforce rate limiting: maximum 5 imports per day per user
- **FR-026**: System MUST sanitize and validate all extracted data before database insertion

#### Async Processing & Queue Management
- **FR-027**: System MUST use BullMQ job queue for imports with >100 places to prevent user waiting
- **FR-028**: System MUST provide real-time progress updates during import (percentage complete, places processed)
- **FR-029**: System MUST return job ID immediately for async imports: `POST /import/google-timeline → { jobId, status: "queued" }`
- **FR-030**: Users MUST be able to check import job status: `GET /import/status/:jobId → { status, progress, result }`
- **FR-031**: System MUST implement exponential backoff for failed verification API calls (Tier 2 & 3)
- **FR-032**: System MUST notify users when async import completes (push notification or email)
- **FR-033**: System MUST process imports <100 places synchronously (user waits, faster UX)

#### Batch Processing
- **FR-034**: System MUST process venue verification in batches to prevent timeout and memory issues
- **FR-035**: System MUST cache verification results in Redis with TTL (30 days for Tier 2, 60 days for Tier 3)
- **FR-036**: System MUST implement rate limiting per verification tier:
  - Tier 1: No limit (local processing)
  - Tier 2: Max 100 requests/hour to Open Brewery DB
  - Tier 3: Max 10-20 requests per import to Google Search with 500ms minimum delay

### Key Entities *(include if feature involves data)*

- **ImportHistory**: Represents a single import operation performed by a user. Key attributes: user ID, source type, import timestamp, file metadata, processing statistics (visits created, skipped, venues added), error details, job ID (for async imports). Relationship: belongs to User, references multiple Visits.

- **ImportJob** (BullMQ): Represents an async import job in the queue. Key attributes: job ID, user ID, status (queued/processing/completed/failed), progress (percentage), places data, result summary. Managed by BullMQ, stored in Redis.

- **Venue (enhanced)**: Extended with Google Place ID for matching and source tracking. New attributes: `google_place_id` (unique identifier from Google), `source` ('manual', 'google_import', 'user_created'), `verification_tier` (1=keyword, 2=brewery_db, 3=google_search). Relationship: has many Visits, referenced by ImportHistory.

- **Visit (enhanced)**: Extended with import source tracking. New attributes: `source` ('auto_detect', 'google_import', 'manual'), `imported_at` (timestamp when imported). Relationship: belongs to User and Venue, may be part of ImportHistory.

- **VerificationCache** (Redis): Cached verification results for Tier 2 & 3. Key format: `verify:tier2:{placeId}` or `verify:tier3:{name}:{address}`. Value: `{ isBreweryWinery: boolean, type: string, verifiedAt: timestamp }`. TTL: 30 days (Tier 2), 60 days (Tier 3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### User Engagement
- **SC-001**: 50% of authenticated users attempt at least one import within their first 7 days of app usage
- **SC-002**: Users can complete the full import flow (upload → process → view results) in under 3 minutes for files with <500 visits
- **SC-003**: 80% of import attempts complete successfully without errors

#### Data Quality
- **SC-004**: Venue matching accuracy ≥90% for places with Google Place IDs (exact match rate)
- **SC-005**: Fuzzy matching achieves ≥80% accuracy for places without Place IDs (validated against manual review sample)
- **SC-006**: Duplicate detection accuracy ≥95% (false positive rate <5%)
- **SC-007**: Brewery/winery filtering precision ≥85% (correctly identified relevant places)

#### Technical Performance
- **SC-008**: System processes 100 visits in ≤5 seconds (average) for synchronous imports
- **SC-009**: System handles files up to 100MB without timeout or memory issues
- **SC-010**: Import error rate <5% across all import attempts
- **SC-011**: 99% of file uploads complete successfully (network/client-side validation)
- **SC-012**: Async imports (>100 places) return job ID in <500ms
- **SC-013**: Job status polling responds in <200ms
- **SC-014**: Tier 1 (keyword matching) achieves 85%+ precision (correctly identifies breweries/wineries)
- **SC-015**: Tier 2 (Open Brewery DB) maintains <100 requests/hour rate limit
- **SC-016**: Tier 3 (Google Search) maintains ≥500ms delay between requests

#### User Satisfaction
- **SC-017**: <5% of users report incorrect venue matches (measured via feedback or support tickets)
- **SC-018**: Users report average satisfaction ≥4.0/5.0 for import feature (via in-app survey)
- **SC-019**: Reduce manual visit entry by 70% for users who complete an import
- **SC-020**: 90%+ of users successfully monitor async import progress without confusion
