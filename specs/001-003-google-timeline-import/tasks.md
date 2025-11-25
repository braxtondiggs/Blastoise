# Implementation Tasks: Google Timeline Import

**Feature**: Google Timeline Import
**Branch**: `001-003-google-timeline-import`
**Created**: 2025-01-04
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document breaks down the Google Timeline Import feature into specific, actionable tasks organized by user story. Each user story can be implemented and tested independently, enabling incremental delivery and parallel development.

**Total Tasks**: 75 tasks across 6 phases
**MVP Scope**: Phase 3 (User Story 1) - 30 tasks
**Parallel Opportunities**: 45+ tasks marked with [P] can run concurrently

---

## Implementation Strategy

### Incremental Delivery by User Story

- **Phase 1-2 (Setup + Foundation)**: Prerequisites for all stories (15 tasks)
- **Phase 3 (US1 - MVP)**: Basic import flow (30 tasks) → First deployable increment
- **Phase 4 (US2)**: Intelligent venue matching (12 tasks) → Improves data quality
- **Phase 5 (US3)**: Async processing (10 tasks) → Handles large files
- **Phase 6 (US4)**: Import history (8 tasks) → Audit and transparency

### Parallel Execution

Tasks marked with **[P]** can be executed concurrently with other [P] tasks in the same phase, dramatically reducing wall-clock time.

**Example**: In Phase 3, the following can run in parallel:
- T016-T021: Shared models (6 tasks)
- T022-T030: Backend services (9 tasks)
- T031-T036: Frontend components (6 tasks)

---

## Phase 1: Setup & Dependencies

**Goal**: Install dependencies and create project structure per implementation plan

**Tasks**:

- [x] T001 Install BullMQ in apps/api: `npm install bullmq @nestjs/bullmq`
- [x] T002 Install Bottleneck for rate limiting in apps/api: `npm install bottleneck @types/bottleneck`
- [x] T003 Install fuzzball for fuzzy string matching in apps/api: `npm install fuzzball @types/fuzzball`
- [x] T004 Create import module directory structure in apps/api/src/modules/import/
- [x] T005 Create import feature directory in apps/web/src/app/settings/import/
- [x] T006 Create shared models directory in libs/shared/models/import/
- [x] T007 Configure BullMQ queue connection in apps/api/src/modules/import/import.module.ts
- [x] T008 Set up Redis verification cache keys format in apps/api/src/modules/import/services/verification-cache.service.ts

**Dependencies**: None (can start immediately)

**Validation**: All dependencies installed, directory structure created per plan.md

---

## Phase 2: Foundational Infrastructure

**Goal**: Database migrations and shared infrastructure needed by all user stories

**Tasks**:

- [ ] T009 Create database migration for import_history table in apps/api/migrations/
- [ ] T010 Create database migration to add google_place_id, source, verification_tier columns to venues table
- [ ] T011 Create database migration to add source, imported_at columns to visits table
- [ ] T012 Create database migration for indexes: idx_import_history_user, idx_venues_google_place_id, idx_visits_source
- [ ] T013 Run migrations against local Supabase instance
- [ ] T014 [P] Create ImportHistory entity in apps/api/src/modules/import/entities/import-history.entity.ts
- [ ] T015 [P] Update Venue entity with new columns in apps/api/src/modules/venues/entities/venue.entity.ts

**Dependencies**: Phase 1 complete

**Validation**: Migrations run successfully, entities updated with new fields

---

## Phase 3: User Story 1 - Basic Timeline Import Flow (MVP)

**Goal**: Users can upload Google Timeline JSON and see imported visits in their timeline

**Independent Test**: Upload sample Timeline JSON → Verify visits appear with correct venues and timestamps

### Shared Models & Types

- [ ] T016 [P] [US1] Create GoogleTimelineData interface in libs/shared/models/import/google-timeline.interface.ts (legacy + new formats)
- [ ] T017 [P] [US1] Create ImportSummary interface in libs/shared/models/import/import-summary.interface.ts
- [ ] T018 [P] [US1] Create ImportError interface in libs/shared/models/import/import-summary.interface.ts
- [ ] T019 [P] [US1] Create GoogleTimelineImportDto in apps/api/src/modules/import/dto/google-timeline-import.dto.ts
- [ ] T020 [P] [US1] Create ImportSummaryDto in apps/api/src/modules/import/dto/import-summary.dto.ts
- [ ] T021 [P] [US1] Create PlaceVisit interface for parsed Timeline place data in libs/shared/models/import/google-timeline.interface.ts

### Backend Services - Timeline Parsing

- [ ] T022 [P] [US1] Create TimelineParserService in apps/api/src/modules/import/services/timeline-parser.service.ts
- [ ] T023 [US1] Implement detectFormat() method to distinguish legacy vs new Timeline format in timeline-parser.service.ts
- [ ] T024 [US1] Implement parseLegacyFormat() method to extract placeVisit entries from Google Takeout format in timeline-parser.service.ts
- [ ] T025 [US1] Implement parseNewFormat() method to extract placeVisit from mobile export format in timeline-parser.service.ts
- [ ] T026 [US1] Implement extractPlaceVisits() method to normalize both formats into common PlaceVisit[] in timeline-parser.service.ts

### Backend Services - Venue Verification (Tier 1)

- [ ] T027 [P] [US1] Create VenueClassifierService in apps/api/src/modules/import/services/venue-classifier.service.ts
- [ ] T028 [US1] Define BREWERY_KEYWORDS, WINERY_KEYWORDS, EXCLUDE_KEYWORDS constants in venue-classifier.service.ts
- [ ] T029 [US1] Implement classify() method for Tier 1 keyword matching with confidence scoring in venue-classifier.service.ts
- [ ] T030 [US1] Implement inferVenueType() method (brewery vs winery) based on keyword counts in venue-classifier.service.ts

### Backend Services - Visit Creation

- [ ] T031 [P] [US1] Create VisitCreationService in apps/api/src/modules/import/services/visit-creation.service.ts (or add to existing visits module)
- [ ] T032 [US1] Implement roundTimestampTo15Minutes() utility function in visit-creation.service.ts
- [ ] T033 [US1] Implement detectDuplicateVisit() method to check for existing visits in 15-min window in visit-creation.service.ts
- [ ] T034 [US1] Implement createImportedVisit() method with source='google_import' in visit-creation.service.ts

### Backend Controller & Orchestration

- [ ] T035 [US1] Create ImportController in apps/api/src/modules/import/import.controller.ts
- [ ] T036 [US1] Implement POST /api/v1/import/google-timeline endpoint (synchronous for <100 places) in import.controller.ts
- [ ] T037 [US1] Add authentication guard (@UseGuards(JwtAuthGuard)) to import controller
- [ ] T038 [US1] Add rate limiting (5 imports/day per user) to import controller
- [ ] T039 [US1] Create ImportService in apps/api/src/modules/import/import.service.ts
- [ ] T040 [US1] Implement processImportSync() method in import.service.ts that orchestrates: parse → classify → create visits
- [ ] T041 [US1] Implement recordImportHistory() method to save ImportHistory entity in import.service.ts
- [ ] T042 [US1] Implement file validation (size ≤100MB, valid JSON) in import.service.ts
- [ ] T043 [US1] Implement error handling for invalid Timeline formats in import.service.ts
- [ ] T044 [US1] Add file cleanup (delete uploaded file after processing) in import.service.ts

### Frontend - Import Wizard UI

- [ ] T045 [P] [US1] Create ImportWizardComponent in apps/web/src/app/settings/import/import-wizard.component.ts
- [ ] T046 [P] [US1] Create ImportService (API client) in apps/web/src/app/settings/import/import.service.ts
- [ ] T047 [US1] Implement Step 1: Choose Import Source UI (show Google Timeline button) in import-wizard.component.ts
- [ ] T048 [US1] Implement Step 2: Export Instructions UI (show Android/iOS/Takeout instructions) in import-wizard.component.ts
- [ ] T049 [US1] Implement Step 3: File Upload UI with Capacitor file picker in import-wizard.component.ts
- [ ] T050 [US1] Implement client-side file validation (size, JSON structure) in import-wizard.component.ts
- [ ] T051 [US1] Implement Step 4: Processing UI (show spinner during upload) in import-wizard.component.ts
- [ ] T052 [US1] Implement Step 5: Results UI (display ImportSummary) in import-wizard.component.ts
- [ ] T053 [US1] Implement uploadTimeline() method in import.service.ts to call POST /api/v1/import/google-timeline
- [ ] T054 [US1] Add navigation to import wizard from Settings → Data Management page

### Integration & Module Setup

- [ ] T055 [US1] Register ImportModule in apps/api/src/app.module.ts
- [ ] T056 [US1] Register ImportController and ImportService providers in import.module.ts
- [ ] T057 [US1] Add import wizard route to apps/web/src/app/app.routes.ts

**Dependencies**: Phase 2 complete

**Validation**: Upload sample Timeline JSON with 50 brewery visits → Verify visits appear in timeline with correct timestamps

---

## Phase 4: User Story 2 - Intelligent Venue Matching

**Goal**: Accurately match Timeline places to existing venues, preventing duplicates

**Independent Test**: Upload Timeline with mix of existing venues (Place IDs), nearby venues (proximity), and new venues → Verify correct matching

### Venue Matching Service

- [ ] T058 [P] [US2] Create VenueMatchingService in apps/api/src/modules/import/services/venue-matching.service.ts
- [ ] T059 [US2] Implement matchByPlaceId() method for exact Google Place ID matching in venue-matching.service.ts
- [ ] T060 [US2] Implement matchByProximity() method (100m radius) with fuzzy name matching (≥80%) using fuzzball in venue-matching.service.ts
- [ ] T061 [US2] Implement createNewVenue() method to insert venue with google_place_id, source='google_import' in venue-matching.service.ts
- [ ] T062 [US2] Integrate VenueMatchingService into ImportService.processImportSync() flow (after Tier 1 filtering)

### Tier 2: Open Brewery DB Verification

- [ ] T063 [P] [US2] Create BreweryDbVerifierService in apps/api/src/modules/import/services/brewery-db-verifier.service.ts
- [ ] T064 [US2] Configure Bottleneck rate limiter (100 requests/hour) in brewery-db-verifier.service.ts
- [ ] T065 [US2] Implement searchNearby() method to query Open Brewery DB by_dist endpoint in brewery-db-verifier.service.ts
- [ ] T066 [US2] Integrate Tier 2 verification for ambiguous cases (confidence 0.3-0.7) in ImportService

### Tier 3: Google Search Verification

- [ ] T067 [P] [US2] Create GoogleSearchVerifierService in apps/api/src/modules/import/services/google-search-verifier.service.ts
- [ ] T068 [US2] Implement verifyVenue() method with simple keyword matching (html.includes('brew')) in google-search-verifier.service.ts
- [ ] T069 [US2] Implement user agent rotation and 500ms delay between requests in google-search-verifier.service.ts

**Dependencies**: Phase 3 complete

**Validation**: Upload Timeline with 10 venues (3 existing with Place IDs, 4 near existing, 3 new) → Verify: 3 matched by ID, 4 matched by proximity, 3 created as new

---

## Phase 5: User Story 3 - Async Processing for Large Imports

**Goal**: Handle large Timeline files (>100 places) without timeout

**Independent Test**: Upload 500-place file → API returns job ID instantly → Poll status → Receive notification when complete

### BullMQ Job Queue Setup

- [ ] T070 [US3] Create ImportProcessor in apps/api/src/modules/import/import.processor.ts
- [ ] T071 [US3] Register BullMQ worker for 'import-queue' with concurrency=5 in import.processor.ts
- [ ] T072 [US3] Implement processImportJob() method that wraps ImportService.processImportSync() with progress updates in import.processor.ts

### Async Import Endpoints

- [ ] T073 [US3] Update POST /api/v1/import/google-timeline to detect file size and queue job if >100 places in import.controller.ts
- [ ] T074 [US3] Create GET /api/v1/import/status/:jobId endpoint to return job progress in import.controller.ts
- [ ] T075 [US3] Implement queueImportJob() method in import.service.ts to add job to BullMQ queue

### Frontend - Progress Monitoring

- [ ] T076 [P] [US3] Create ImportProgressComponent in apps/web/src/app/settings/import/import-progress.component.ts
- [ ] T077 [US3] Implement polling logic to fetch job status every 2 seconds in import-progress.component.ts
- [ ] T078 [US3] Display progress bar with percentage and places processed in import-progress.component.html
- [ ] T079 [US3] Add push notification when import completes (use existing notification service)

**Dependencies**: Phase 4 complete

**Validation**: Upload 500-place file → Verify job ID returned in <500ms → Poll status → See progress updates → Receive notification

---

## Phase 6: User Story 4 - Import History and Management

**Goal**: Users can view past imports and audit their data

**Independent Test**: Perform 3 imports → View import history → See all 3 with correct stats

### Backend - Import History

- [ ] T080 [US4] Create GET /api/v1/import/history endpoint in import.controller.ts
- [ ] T081 [US4] Implement getImportHistory() method to query ImportHistory by user_id in import.service.ts

### Frontend - Import History UI

- [ ] T082 [P] [US4] Create ImportHistoryComponent in apps/web/src/app/settings/import/import-history.component.ts
- [ ] T083 [US4] Display list of past imports with timestamps, visit counts, processing times in import-history.component.html
- [ ] T084 [US4] Implement view details modal showing full import statistics in import-history.component.ts
- [ ] T085 [US4] Add "Import History" navigation link in Settings → Data Management page

### Verification Cache Service

- [ ] T086 [P] [US4] Create VerificationCacheService in apps/api/src/modules/import/services/verification-cache.service.ts
- [ ] T087 [US4] Implement cacheVerificationResult() method with TTL (30 days Tier 2, 60 days Tier 3) in verification-cache.service.ts

**Dependencies**: Phase 5 complete

**Validation**: Perform 3 imports → Navigate to import history → See all 3 listed with correct metadata

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Production-ready error handling, logging, and optimization

### Error Handling & Logging

- [ ] T088 [P] Add Sentry error tracking to ImportService with sensitive data filtering
- [ ] T089 [P] Add structured logging (winston) to all import services with request context
- [ ] T090 [P] Implement exponential backoff for failed Tier 2/3 API calls (3 attempts: 2s, 4s, 8s)

### Performance Optimization

- [ ] T091 [P] Implement batch processing for venue verification (process 50 places at a time)
- [ ] T092 [P] Add response caching headers to GET /import/status endpoint (Cache-Control: max-age=5)

### Documentation

- [ ] T093 [P] Update CLAUDE.md to document new import module and three-tier verification strategy
- [ ] T094 [P] Create quickstart.md with sample Timeline JSON and import instructions
- [ ] T095 [P] Generate OpenAPI spec (contracts/api.openapi.yaml) for import endpoints

**Dependencies**: All user stories complete

**Validation**: All error scenarios handled gracefully, logs structured, performance targets met

---

## Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Foundational)
                         ↓
                  Phase 3 (US1 - MVP) ← MVP DELIVERY
                         ↓
                  Phase 4 (US2) ← Improves matching
                         ↓
                  Phase 5 (US3) ← Handles large files
                         ↓
                  Phase 6 (US4) ← Audit & history
                         ↓
                  Phase 7 (Polish) ← Production ready
```

**User Stories are Independent**: US2, US3, and US4 can technically be developed in parallel after US1 is complete, though the order shown represents priority.

---

## Parallel Execution Examples

### Phase 3 (US1) Parallel Opportunities

**Batch 1** (can run concurrently):
- T016-T021: Shared models (6 parallel tasks)

**Batch 2** (can run concurrently after Batch 1):
- T022: TimelineParserService
- T027: VenueClassifierService
- T031: VisitCreationService
- T045: ImportWizardComponent (frontend)
- T046: ImportService (frontend API client)

**Batch 3** (can run concurrently after Batch 2):
- T023-T026: Timeline parsing methods
- T028-T030: Venue classification methods
- T032-T034: Visit creation methods
- T047-T052: Import wizard UI steps

**Batch 4** (sequential - orchestration):
- T035-T044: Controller and ImportService orchestration
- T053-T054: Frontend integration

**Total Wall-Clock Time**: ~4-5 days with parallel execution vs ~10-12 days sequential

---

## Task Format Key

- `- [ ] T###`: Task ID for tracking
- `[P]`: Parallelizable (can run concurrently with other [P] tasks)
- `[US#]`: User Story assignment (US1, US2, US3, US4)
- **File path**: Exact location where code changes are needed

---

## Notes

- **Tests Excluded**: Per user request ("Don't worry about test or e2e at all"), no test tasks are included
- **MVP Focus**: Phase 3 (US1) delivers working import feature with 30 tasks
- **Incremental Delivery**: Each phase is independently testable and deployable
- **Parallel Opportunities**: 45+ tasks marked [P] can dramatically reduce implementation time
- **Next Step**: Begin Phase 1 (Setup) immediately, parallelize where possible

**Total Implementation Estimate**:
- Sequential: ~3-4 weeks
- Parallel (2-3 developers): ~1-2 weeks
- MVP Only (Phase 1-3): ~1 week with parallelization
