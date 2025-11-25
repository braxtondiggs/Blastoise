# Implementation Plan: Google Timeline Import

**Branch**: `001-003-google-timeline-import` | **Date**: 2025-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-003-google-timeline-import/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to import historical brewery and winery visits from Google Timeline JSON exports (both legacy Takeout and new mobile formats). The system uses a three-tier verification strategy (local keyword matching, Open Brewery DB API, Google Search) to filter and verify venues, then creates visits with privacy-preserving timestamp rounding. Large imports (>100 places) are processed asynchronously via BullMQ with real-time progress tracking.

**Primary Goal**: Reduce manual data entry by 70% for users with existing Google Timeline history

**Technical Approach**:
- Client-side JSON parsing and validation
- Three-tier venue verification (90% keyword matching, 8% Brewery DB, 2% Google Search)
- Async job processing with BullMQ for large datasets
- Redis caching for verification results (30-60 day TTL)
- Rate-limited external API calls with exponential backoff

## Technical Context

**Language/Version**: TypeScript 5.x (Angular 20+ frontend, NestJS 10.x backend, Node.js 22 LTS)
**Primary Dependencies**:
- Frontend: Angular 20+ standalone components, DaisyUI/Tailwind CSS 4.x, Capacitor 7+
- Backend: NestJS 10.x, BullMQ (job queue), Bottleneck (rate limiting), fuzzball (fuzzy matching)
- Shared: Supabase JS Client 2.x, Redis 7+, PostgreSQL 15+

**Storage**:
- PostgreSQL (Supabase): import_history, venues (enhanced), visits (enhanced)
- Redis: BullMQ job queue, verification cache (Tier 2: 30 days, Tier 3: 60 days)
- localStorage: Client-side validation and small file processing

**Testing**: Not required per user request ("Don't worry about test or e2e at all")

**Target Platform**:
- Web: PWA (Progressive Web App) via Angular + Capacitor
- Mobile: iOS 15+ and Android (Capacitor native wrapper)
- API: Node.js server (Vercel/Railway/Fly.io deployment)

**Project Type**: Monorepo (Nx workspace with web, mobile, and API apps)

**Performance Goals**:
- Small imports (<100 places): Process synchronously in <30 seconds
- Large imports (>100 places): Queue immediately (<500ms response), process in background
- Tier 1 keyword matching: <1ms per venue
- Tier 2 (Brewery DB): ~200ms per venue, 100 requests/hour max
- Tier 3 (Google Search): ~1-2 seconds per venue, 10-20 requests per import max with 500ms delay

**Constraints**:
- File size limit: 100MB maximum
- Rate limiting: 5 imports per day per user
- Privacy: No raw GPS storage, 15-minute timestamp rounding
- External APIs: Respectful rate limiting (no IP bans)
- Memory: Batch processing to handle large files without OOM

**Scale/Scope**:
- Target: 10,000+ users importing historical data
- Average import: 200-500 places per file
- Large imports: Up to 2,000 places per file
- Verification cache: ~50,000 entries (venues) in Redis
- Job queue: Handle 100+ concurrent imports

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Code Quality & Structure ✅
- **Status**: PASS
- **Compliance**: Follows Nx workspace conventions, uses existing project structure (apps/api, apps/web, libs/)
- **Notes**: New import module integrates cleanly into existing backend structure

### Principle II: Testing Excellence ⚠️
- **Status**: WAIVED per user request
- **User Directive**: "Don't worry about test or e2e at all"
- **Constitution Note**: Tests are RECOMMENDED but not REQUIRED (v1.1.0 amendment)
- **Justification**: Rapid prototyping and MVP development prioritized

### Principle III: User Experience Consistency ✅
- **Status**: PASS
- **Compliance**:
  - Async import flow prevents UI blocking for large files
  - Real-time progress feedback (<200ms polling)
  - Consistent DaisyUI components across web/mobile
  - File upload works on both platforms
- **Notes**: Import wizard provides clear 5-step flow with status updates

### Principle IV: Performance Optimization ✅
- **Status**: PASS
- **Compliance**:
  - Three-tier verification minimizes external API calls (90% local processing)
  - BullMQ job queue prevents timeout on large imports
  - Redis caching reduces duplicate verification requests
  - Batch processing prevents memory issues
  - Rate limiting protects external services
- **Performance Targets**:
  - Job ID returned in <500ms for async imports
  - Status polling responds in <200ms
  - 100 visits processed in ≤5 seconds (synchronous)

### Principle V: Privacy & Ethical Data Handling ✅
- **Status**: PASS
- **Compliance**:
  - No raw GPS coordinates stored (only venue IDs)
  - 15-minute timestamp rounding maintained
  - Uploaded files deleted immediately after processing
  - Authentication required (no anonymous imports)
  - Rate limiting prevents abuse (5 imports/day)
  - Import history provides transparency
- **Notes**: Privacy-first design consistent with existing visit tracking

### Re-evaluation Post-Design
*To be completed after Phase 1 design artifacts generated*

## Project Structure

### Documentation (this feature)

```text
specs/001-003-google-timeline-import/
├── spec.md              # Feature specification (complete)
├── checklist.md         # Requirements checklist (complete)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── contracts/           # Phase 1 output (/speckit.plan command)
    └── api.openapi.yaml # OpenAPI spec for import endpoints
```

### Source Code (repository root)

```text
apps/
├── api/                 # NestJS Backend
│   └── src/
│       └── modules/
│           └── import/  # NEW: Import module
│               ├── import.module.ts
│               ├── import.controller.ts  # Endpoints: POST /import/google-timeline, GET /import/status/:jobId, GET /import/history
│               ├── import.service.ts     # Orchestrates import flow, BullMQ integration
│               ├── import.processor.ts   # BullMQ job processor
│               ├── dto/                  # Request/response DTOs
│               │   ├── google-timeline-import.dto.ts
│               │   ├── import-summary.dto.ts
│               │   └── import-status.dto.ts
│               ├── services/
│               │   ├── timeline-parser.service.ts        # Parse both Timeline formats
│               │   ├── venue-classifier.service.ts       # Tier 1: Keyword matching
│               │   ├── brewery-db-verifier.service.ts    # Tier 2: Open Brewery DB API
│               │   ├── google-search-verifier.service.ts # Tier 3: Google Search
│               │   └── verification-cache.service.ts     # Redis caching for Tier 2/3
│               └── entities/
│                   └── import-history.entity.ts
│
├── web/                 # Angular PWA
│   └── src/
│       └── app/
│           └── settings/  # Existing settings module
│               └── import/  # NEW: Import feature
│                   ├── import-wizard.component.ts    # 5-step wizard UI
│                   ├── import-progress.component.ts  # Real-time progress display
│                   ├── import-history.component.ts   # Past imports list
│                   └── import.service.ts             # API client for import endpoints
│
└── mobile/              # Capacitor wrapper (uses web build)
    └── (No mobile-specific import code needed)

libs/
├── shared/
│   └── models/
│       └── import/  # NEW: Shared types
│           ├── google-timeline.interface.ts  # Timeline JSON format types
│           ├── import-history.interface.ts
│           └── import-summary.interface.ts
│
└── features/
    └── import/  # NEW: Import feature library (if needed for reusability)
        └── (Optional: Shared import logic between web/mobile)
```

**Structure Decision**:
- **Backend**: New `import` module in `apps/api/src/modules/` following existing NestJS module pattern (visits, venues, auth)
- **Frontend**: New `import` feature under `apps/web/src/app/settings/` as import functionality logically belongs in Settings → Data Management
- **Shared Models**: Add import-related interfaces to `libs/shared/models/` for type safety across frontend/backend
- **No Mobile-Specific Code**: Import UI renders through Capacitor web wrapper, no native code needed

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations requiring justification. All constitutional gates PASSED or WAIVED with user consent.*

## Phase 0: Research & Analysis

### Research Questions

1. **Google Timeline Export Formats**
   - What are the exact JSON schema differences between legacy Semantic Location History (Google Takeout) and new Timeline.json (mobile export)?
   - How do we detect which format was uploaded?
   - What fields are guaranteed vs optional in each format?

2. **Open Brewery DB API**
   - What are the official rate limits for Open Brewery DB?
   - What proximity search endpoints are available?
   - What data format does it return (schema)?
   - How accurate is the brewery location data?

3. **Google Search Verification**
   - What is the risk of IP blocking for automated searches?
   - Best practices for user agent rotation?
   - How to parse search results reliably (JSDOM vs alternatives)?
   - Backup strategies if Google blocks requests?

4. **BullMQ Configuration**
   - Optimal queue configuration for import jobs?
   - How to handle job failures and retries?
   - Best practices for progress tracking?
   - Redis memory management for large job payloads?

5. **Fuzzy String Matching**
   - Best library for fuzzy name matching (Levenshtein distance)?
   - What similarity threshold (80%?) balances precision/recall?
   - Performance considerations for comparing 1000+ venues?

6. **Venue Type Inference**
   - How to distinguish brewery vs winery from limited data?
   - What keywords are most reliable for classification?
   - How to handle edge cases (cidery, meadery, brewpub)?

### Research Tasks

- [ ] Obtain sample Google Timeline JSON files (both formats) for testing
- [ ] Document Google Timeline schema for both legacy and new formats
- [ ] Test Open Brewery DB API endpoints and document response schemas
- [ ] Research BullMQ best practices for long-running jobs with large payloads
- [ ] Evaluate fuzzy string matching libraries (fuzzball, string-similarity, etc.)
- [ ] Research Google Search scraping risks and mitigation strategies
- [ ] Define comprehensive keyword lists for brewery/winery classification
- [ ] Document venue type inference logic with decision tree

### Technical Decisions to Make

1. **Fuzzy Matching Library**: Which library provides best accuracy/performance?
2. **Job Payload Size**: Store full Timeline JSON in Redis job or just metadata?
3. **Cache Invalidation**: When to refresh Tier 2/3 verification cache?
4. **Error Recovery**: Retry strategy for failed verification API calls?
5. **Notification Method**: Push notification, email, or both for async completion?

## Phase 1: Design & Implementation Planning

### Data Model Updates

**New Table: `import_history`**
- Tracks all import operations with metadata and job IDs
- Relationships: belongs to User, references Visits

**Enhanced Table: `venues`**
- Add `google_place_id`, `source`, `verification_tier` columns
- Enables exact matching and tracks verification method

**Enhanced Table: `visits`**
- Add `source`, `imported_at` columns
- Tracks which visits came from imports vs auto-detection

**Redis Structures**:
- BullMQ job queue: `bull:import-queue:*`
- Verification cache: `verify:tier2:{placeId}`, `verify:tier3:{name}:{address}`

### API Contracts

**Endpoints**:
1. `POST /api/v1/import/google-timeline` - Upload and process Timeline JSON
2. `GET /api/v1/import/status/:jobId` - Check async import job status
3. `GET /api/v1/import/history` - List past imports for authenticated user

**Request/Response Schemas**: See `contracts/api.openapi.yaml` (Phase 1 output)

### Component Architecture

**Frontend Flow**:
1. User selects Timeline JSON file → File picker (Capacitor)
2. Client-side validation → Check file size, JSON structure
3. Upload to backend → POST /import/google-timeline
4. If async (>100 places) → Poll status endpoint, show progress
5. If sync (<100 places) → Show result immediately
6. Display import summary → Visits created, skipped, errors

**Backend Flow**:
1. Controller receives file → Validate authentication, rate limits
2. Determine sync vs async → <100 places: process immediately, >100: queue job
3. BullMQ processor executes:
   - Parse Timeline JSON (detect format)
   - Tier 1: Keyword matching (80-90% filtered)
   - Tier 2: Open Brewery DB (5-10% ambiguous cases)
   - Tier 3: Google Search (1-5% final ambiguous cases)
   - Match to existing venues (Place ID, proximity, fuzzy name)
   - Create visits with rounded timestamps
   - Record import_history metadata
4. Return summary or update job progress

### Integration Points

- **Supabase Auth**: Verify JWT tokens for authenticated imports
- **Redis**: BullMQ queue + verification cache
- **PostgreSQL**: venues, visits, import_history tables
- **Open Brewery DB**: HTTP client with Bottleneck rate limiting
- **Google Search**: HTTP client with user agent rotation and delays

### Migration Strategy

1. **Database Migrations**:
   - Create `import_history` table
   - Add columns to `venues` and `visits` tables
   - Create indexes for performance

2. **Rollout Plan**:
   - Deploy backend import module (no user-facing changes yet)
   - Test import flow with sample data
   - Deploy frontend import wizard (feature flag?)
   - Announce feature to users with onboarding guide

3. **Rollback Plan**:
   - If critical issues: disable import endpoints via feature flag
   - Database rollback: Remove `import_history` table, drop new columns (visits/venues retain source=null for existing data)

## Phase 2: Task Breakdown

*To be generated by `/speckit.tasks` command (NOT created by /speckit.plan)*

## Appendix: Technology Choices

### Why BullMQ?
- Built on Redis (already in stack)
- Native NestJS integration (@nestjs/bullmq)
- Built-in rate limiting, progress tracking, retries
- Battle-tested for large-scale batch processing

### Why Bottleneck for Rate Limiting?
- Simple API, well-maintained
- Reservoir system perfect for hourly quotas (100 requests/hour for Tier 2)
- Integrates easily with Promise-based APIs

### Why Simple String Matching for Google Search?
- No HTML parsing library needed (no JSDOM or Cheerio dependency)
- Matches proven approach from original Deno script
- Fast: Just search for keywords in raw HTML text
- Effective: Google search results contain enough text to verify brewery/winery
- Example: `html.toLowerCase().includes('brew')` works reliably

### Why Three-Tier Verification?
- Tier 1 (keyword): Covers 80-90% instantly, zero cost
- Tier 2 (Brewery DB): Verifies ambiguous cases, free API, good coverage
- Tier 3 (Google Search): Last resort for final 1-5%, slow but effective
- Minimizes external API dependency while maintaining accuracy

## Next Steps

1. ✅ Complete Phase 0 research (`research.md`)
2. ✅ Generate Phase 1 design artifacts:
   - `data-model.md`
   - `contracts/api.openapi.yaml`
   - `quickstart.md`
3. ⏳ Run `/speckit.tasks` to generate implementation task breakdown
4. ⏳ Begin implementation following task order

**Status**: Phase 0 research pending
**Branch**: `001-003-google-timeline-import`
**Spec Location**: `/Users/braxton/Sites/Blastoise/specs/001-003-google-timeline-import/`
