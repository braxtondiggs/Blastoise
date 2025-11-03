# Tasks: Venue Visit Tracker

**Input**: Design documents from `/specs/001-venue-visit-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.openapi.yaml

**Tests**: Tests are MANDATORY per the project constitution - every feature must include comprehensive unit and integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md Nx monorepo structure:
- **Apps**: `apps/web/`, `apps/mobile/`, `apps/api/`
- **Libs**: `libs/shared/`, `libs/ui/`, `libs/features/`, `libs/data/`, `libs/workers/`
- **Tests**: `apps/*/tests/`, `libs/*/tests/`
- **E2E**: `e2e/web-e2e/`, `e2e/mobile-e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic Nx monorepo structure

- [X] T001 Initialize Nx workspace with npm workspaces in repository root
- [X] T002 [P] Configure ESLint with TypeScript and Angular rules in .eslintrc.json
- [X] T003 [P] Configure Prettier for code formatting in .prettierrc
- [X] T004 [P] Configure Tailwind CSS 4.x base configuration in tailwind.config.base.js
- [X] T005 [P] Install DaisyUI and configure in tailwind.config.base.js
- [X] T006 [P] Configure Jest for Nx workspace in jest.preset.js
- [X] T007 [P] Configure Playwright for E2E testing in playwright.config.ts
- [X] T008 Setup Docker Compose for local development in docker/docker-compose.yml (Redis, Postgres)
- [X] T009 [P] Create Docker configuration for API in docker/api.Dockerfile
- [X] T010 [P] Create nginx configuration for production in docker/nginx.conf

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Apps Structure

- [X] T011 Generate Angular web app in apps/web/ using Nx generator
- [X] T012 Generate Angular app in apps/mobile/ as Capacitor wrapper (not standard Angular app - will be configured for native iOS/Android)
- [X] T013 Generate NestJS API app in apps/api/ using Nx generator
- [X] T014 [P] Configure Capacitor for mobile wrapper in apps/mobile/capacitor.config.ts (adds iOS/Android native projects)
- [X] T015 [P] Setup iOS project structure in apps/mobile/ios/
- [X] T016 [P] Setup Android project structure in apps/mobile/android/
- [X] T017 [P] Configure iOS location permissions in apps/mobile/ios/App/App/Info.plist
- [X] T018 [P] Configure Android location permissions in apps/mobile/android/app/src/main/AndroidManifest.xml

### Shared Libraries

- [X] T019 Generate shared library in libs/shared/ with models, types, and utils
- [X] T020 [P] Create Venue model in libs/shared/models/venue.model.ts
- [X] T021 [P] Create Visit model in libs/shared/models/visit.model.ts
- [X] T022 [P] Create User model in libs/shared/models/user.model.ts
- [X] T023 [P] Create SharedVisit model in libs/shared/models/shared-visit.model.ts
- [X] T024 [P] Create API response types in libs/shared/types/api-response.types.ts
- [X] T025 [P] Create geolocation types in libs/shared/types/geolocation.types.ts
- [X] T026 [P] Create date utilities with timestamp rounding in libs/shared/utils/date.utils.ts
- [X] T027 [P] Create distance utilities with Haversine calculation in libs/shared/utils/distance.utils.ts
- [X] T028 [P] Create privacy utilities for GPS sanitization in libs/shared/utils/privacy.utils.ts

### UI Library

- [X] T029 Generate UI library in libs/ui/ for reusable components
- [X] T030 [P] Create button component in libs/ui/components/button/
- [X] T031 [P] Create card component in libs/ui/components/card/
- [X] T032 [P] Create modal component in libs/ui/components/modal/
- [X] T033 [P] Create timeline component in libs/ui/components/timeline/
- [X] T034 [P] Create map wrapper component in libs/ui/components/map/
- [X] T035 [P] Create duration pipe in libs/ui/pipes/duration.pipe.ts
- [X] T036 [P] Create distance pipe in libs/ui/pipes/distance.pipe.ts
- [X] T037 [P] Create lazy load directive in libs/ui/directives/lazy-load.directive.ts

### Data Access Layer

- [X] T038 Generate data library in libs/data/
- [X] T039 [P] Create Supabase client configuration in libs/data/supabase/supabase.client.ts
- [X] T040 [P] Create visits repository for Supabase in libs/data/supabase/visits.repository.ts
- [X] T041 [P] Create venues repository for Supabase in libs/data/supabase/venues.repository.ts
- [X] T042 [P] Create users repository for Supabase in libs/data/supabase/users.repository.ts
- [X] T043 [P] Create Angular HTTP API client in libs/data/api/api.client.ts
- [X] T044 [P] Create venues API service in libs/data/api/venues.api.ts
- [X] T045 [P] Create visits API service in libs/data/api/visits.api.ts
- [X] T046 [P] Create sharing API service in libs/data/api/sharing.api.ts
- [X] T047 [P] Create IndexedDB service in libs/data/local/indexeddb.service.ts
- [X] T048 [P] Create local visits repository in libs/data/local/visits-local.repository.ts
- [X] T049 [P] Create Redis client for backend in libs/data/redis/redis.client.ts
- [X] T050 [P] Create geospatial service for Redis in libs/data/redis/geospatial.service.ts
- [X] T051 [P] Create cache service for Redis in libs/data/redis/cache.service.ts

### Backend API Infrastructure

- [X] T052 Setup NestJS application with main.ts and app.module.ts in apps/api/src/
- [X] T053 [P] Create auth module with Supabase JWT guard in apps/api/src/modules/auth/
- [X] T054 [P] Create visits module with controller and service in apps/api/src/modules/visits/
- [X] T055 [P] Create venues module with controller and service in apps/api/src/modules/venues/
- [X] T056 [P] Create sharing module with controller and service in apps/api/src/modules/sharing/
- [X] T057 [P] Create global exception filter in apps/api/src/common/filters/http-exception.filter.ts
- [X] T058 [P] Create logging interceptor in apps/api/src/common/interceptors/logging.interceptor.ts
- [X] T059 [P] Create rate limiting guard in apps/api/src/common/guards/rate-limit.guard.ts

### Database Migrations

- [X] T060 Create venues table migration in apps/api/migrations/001_create_venues_table.sql
- [X] T061 Create visits table migration with RLS in apps/api/migrations/002_create_visits_table.sql
- [X] T062 Create user_preferences table migration in apps/api/migrations/003_create_user_preferences_table.sql
- [X] T063 Create shared_visits table migration in apps/api/migrations/004_create_shared_visits_table.sql
- [X] T064 Create analytics tables migration in apps/api/migrations/005_create_analytics_tables.sql
- [X] T065 Create migration README with instructions in apps/api/migrations/README.md

### Venue Data Seeding

- [X] T066 Create Open Brewery DB fetch script in apps/api/scripts/fetch-brewerydb.ts
- [X] T067 Create OpenStreetMap Overpass API fetch script for wineries in apps/api/scripts/fetch-osm-wineries.ts
- [X] T068 Create venue seeding script for Postgres and Redis in apps/api/scripts/seed-venues.ts
- [X] T069 Create Redis geo index rebuild script in apps/api/scripts/rebuild-geo-index.ts
- [X] T070 Create scripts README with usage instructions in apps/api/scripts/README.md
- [X] T071 Add venue data directory to .gitignore

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic Visit Detection (Priority: P1) 🎯 MVP

**Goal**: Automatically detect when a user arrives at or leaves a brewery/winery venue using geofencing, creating visit records with arrival/departure timestamps.

**Independent Test**: Enable location permissions, visit a known venue, verify automatic arrival and departure detection with correct timestamps (rounded to 15 minutes) without manual intervention. Works offline with local storage.

### Feature Library: Authentication (P0 - Required for US1)

- [X] T072 Generate auth feature library in libs/features/auth/
- [X] T073 [P] [US1] Create login component in libs/features/auth/components/login.component.ts
- [X] T074 [P] [US1] Create onboarding component in libs/features/auth/components/onboarding.component.ts
- [X] T075 [US1] Create auth service with Supabase integration in libs/features/auth/services/auth.service.ts
- [X] T076 [US1] Create auth guard for route protection in libs/features/auth/guards/auth.guard.ts
- [X] T077 [US1] Implement anonymous mode support in libs/features/auth/services/auth.service.ts
- [X] T078 [US1] Implement account upgrade flow (anonymous → authenticated) in libs/features/auth/components/upgrade-prompt.component.ts

### Feature Library: Visits (Core US1)

- [X] T079 Generate visits feature library in libs/features/visits/
- [X] T080 [P] [US1] Create active visit indicator component in libs/features/visits/components/active-visit.component.ts
- [X] T081 [P] [US1] Create visit card component in libs/features/visits/components/visit-card.component.ts
- [X] T082 [US1] Create geofence service with platform-agnostic geolocation provider in libs/features/visits/services/geofence.service.ts
- [X] T083 [US1] Implement geofence boundary detection logic in libs/features/visits/services/geofence.service.ts
- [X] T084 [US1] Implement dwell time filtering (10-15 min minimum) in libs/features/visits/services/geofence.service.ts
- [X] T085 [US1] Create visit tracker service for detection logic in libs/features/visits/services/visit-tracker.service.ts
- [X] T086 [US1] Implement arrival detection in libs/features/visits/services/visit-tracker.service.ts
- [X] T087 [US1] Implement departure detection in libs/features/visits/services/visit-tracker.service.ts
- [X] T088 [US1] Implement timestamp rounding (15 min intervals) in libs/features/visits/services/visit-tracker.service.ts
- [X] T089 [US1] Create visit sync service for offline/online sync in libs/features/visits/services/visit-sync.service.ts
- [X] T090 [US1] Implement exponential backoff retry logic in libs/features/visits/services/visit-sync.service.ts

### Backend API: Visits Module

- [X] T091 [US1] Create visits module in apps/api/src/visits/visits.module.ts
- [X] T092 [US1] Create visits controller with POST /visits endpoint in apps/api/src/visits/visits.controller.ts
- [X] T093 [US1] Implement GET /visits endpoint for user history in apps/api/src/visits/visits.controller.ts
- [X] T094 [US1] Implement GET /visits/:visitId endpoint in apps/api/src/visits/visits.controller.ts
- [X] T095 [US1] Implement PATCH /visits/:visitId endpoint for updates in apps/api/src/visits/visits.controller.ts
- [X] T096 [US1] Implement DELETE /visits/:visitId endpoint in apps/api/src/visits/visits.controller.ts
- [X] T097 [US1] Implement POST /visits/batch endpoint for offline sync in apps/api/src/visits/visits.controller.ts
- [X] T098 [US1] Create visits service with business logic in apps/api/src/visits/visits.service.ts
- [X] T099 [US1] Add DTOs and validation pipes for visit endpoints in apps/api/src/visits/dto/

### Workers: Background Sync

- [X] T100 Generate workers library in libs/workers/
- [X] T101 [US1] Create sync worker for background synchronization in libs/workers/sync-worker.ts
- [X] T102 [US1] Implement service worker registration in apps/web/src/app/app.config.ts
- [X] T103 [US1] Implement Background Sync API integration in libs/workers/sync-worker.ts
- [X] T104 [US1] Monitor navigator.onLine for connectivity changes in libs/workers/sync-worker.ts

### App Integration: Web & Mobile

- [X] T105 [US1] Configure routing with lazy-loaded modules in apps/web/src/app/app.routes.ts
- [X] T106 [US1] Create onboarding flow in apps/web/src/app/ (or apps/mobile/src/app/)
- [X] T107 [US1] Implement location permission request UI in apps/web/ (or apps/mobile/)
- [X] T108 [US1] Provide GeolocationProvider in apps/web/src/app/app.config.ts
- [X] T109 [US1] Integrate visit tracker service in app component in apps/web/src/app/app.component.ts
- [X] T110 [US1] Add PWA manifest for offline support in apps/web/src/manifest.json

### Tests for User Story 1 (MANDATORY)

- [X] T111 [P] [US1] Unit test for geofence boundary detection in libs/features/visits/services/geofence.service.spec.ts
- [X] T112 [P] [US1] Unit test for dwell time filtering in libs/features/visits/services/geofence.service.spec.ts
- [X] T113 [P] [US1] Unit test for timestamp rounding utility in libs/shared/utils/date.utils.spec.ts
- [X] T114 [P] [US1] Unit test for visit tracker arrival/departure logic in libs/features/visits/services/visit-tracker.service.spec.ts
- [X] T115 [P] [US1] Unit test for offline sync retry logic in libs/features/visits/services/visit-sync.service.spec.ts
- [X] T116 [P] [US1] Integration test for POST /visits endpoint in apps/api/src/modules/visits/visits.controller.spec.ts
- [X] T117 [P] [US1] Integration test for batch sync endpoint in apps/api/src/modules/visits/visits.controller.spec.ts
- [X] T118 [P] [US1] Integration test for offline sync flow in libs/features/visits/src/lib/services/visit-sync.integration.spec.ts
- [X] T119 [P] [US1] E2E test for onboarding flow in apps/web-e2e/src/onboarding.spec.ts
- [X] T120 [P] [US1] E2E test for automatic visit detection in apps/web-e2e/src/visit-detection.spec.ts

**Checkpoint**: User Story 1 complete - automatic visit detection fully functional and testable independently

---

## Phase 4: User Story 2 - Visual Timeline of Visits (Priority: P2)

**Goal**: Display all visit records in a chronological timeline with venue names, dates, times, durations, and grouping by date. Show in-progress visits with live duration updates.

**Independent Test**: Create several visit records (via US1 or manually) and verify the timeline displays them chronologically with correct formatting, date grouping, and live updates for active visits.

### Feature Library: Visits (Timeline Components)

- [X] T121 [P] [US2] Create timeline component in libs/features/visits/components/timeline.component.ts
- [X] T122 [P] [US2] Create visit detail component in libs/features/visits/components/visit-detail.component.ts
- [X] T123 [US2] Implement chronological sorting by arrival time in libs/features/visits/components/timeline.component.ts
- [X] T124 [US2] Implement date grouping with headers in libs/features/visits/components/timeline.component.ts
- [X] T125 [US2] Implement infinite scroll / lazy loading in libs/features/visits/components/timeline.component.ts
- [X] T126 [US2] Add live duration updates for active visits in libs/features/visits/components/active-visit.component.ts
- [X] T127 [US2] Create empty state component for no visit history in libs/features/visits/components/timeline-empty.component.ts
- [X] T128 [US2] Add search and filter controls in libs/features/visits/components/timeline-filters.component.ts

### Backend API: Venues Module

- [X] T129 [US2] Create venues module in apps/api/src/venues/venues.module.ts
- [X] T130 [US2] Create venues controller with GET /venues/:venueId endpoint in apps/api/src/venues/venues.controller.ts
- [X] T131 [US2] Implement GET /venues/search endpoint for name search in apps/api/src/venues/venues.controller.ts
- [X] T132 [US2] Create venues service with Redis caching in apps/api/src/venues/venues.service.ts

### App Integration: Timeline View

- [X] T133 [US2] Create timeline route in apps/web/src/app/app.routes.ts
- [X] T134 [US2] Integrate timeline component in timeline page in apps/web/src/app/pages/timeline/timeline.page.ts
- [X] T135 [US2] Add navigation to timeline from main navigation in apps/web/src/app/app.component.ts
- [X] T136 [US2] Implement pull-to-refresh for timeline updates in apps/mobile/

### Tests for User Story 2 (MANDATORY)

- [X] T137 [P] [US2] Unit test for timeline date grouping logic in libs/features/visits/components/timeline.component.spec.ts
- [X] T138 [P] [US2] Unit test for infinite scroll pagination in libs/features/visits/components/timeline.component.spec.ts
- [X] T139 [P] [US2] Unit test for live duration calculation in libs/features/visits/components/active-visit.component.spec.ts
- [X] T140 [P] [US2] Integration test for GET /visits with pagination in apps/api/src/modules/visits/visits.controller.spec.ts
- [X] T141 [P] [US2] Integration test for GET /venues/:venueId in apps/api/src/modules/venues/venues.controller.spec.ts
- [X] T142 [P] [US2] E2E test for timeline display with multiple visits in apps/web-e2e/src/timeline.spec.ts
- [X] T143 [P] [US2] E2E test for visit detail navigation in apps/web-e2e/src/timeline.spec.ts
- [X] T144 [P] [US2] E2E test for empty state display in apps/web-e2e/src/timeline.spec.ts

**Checkpoint**: User Story 2 complete - visual timeline fully functional and independently testable

---

## Phase 5: User Story 3 - Interactive Venue Map (Priority: P3)

**Goal**: Display nearby breweries and wineries on an interactive Leaflet map with user location, venue markers, proximity search, and navigation integration. Distinguish visited vs unvisited venues.

**Independent Test**: Open map view, verify nearby venues load within 3 seconds, interact with markers to see venue details, verify visited venues are visually distinct, test navigation integration.

### Feature Library: Map

- [X] T145 Generate map feature library in libs/features/map/
- [X] T146 [P] [US3] Create venue map component with Leaflet in libs/features/map/components/venue-map.component.ts
- [X] T147 [P] [US3] Create venue list component (list view alternative) in libs/features/map/components/venue-list.component.ts
- [X] T148 [P] [US3] Create venue detail component in libs/features/map/components/venue-detail.component.ts
- [X] T149 [US3] Create venue search service in libs/features/map/services/venue-search.service.ts
- [X] T150 [US3] Implement Leaflet MarkerCluster integration in libs/features/map/components/venue-map.component.ts
- [X] T151 [US3] Implement viewport-based venue loading in libs/features/map/components/venue-map.component.ts
- [X] T152 [US3] Add custom markers for visited vs unvisited venues in libs/features/map/components/venue-map.component.ts
- [X] T153 [US3] Implement venue popup with basic info in libs/features/map/components/venue-map.component.ts
- [X] T154 [US3] Add OpenStreetMap tile layer with attribution in libs/features/map/components/venue-map.component.ts
- [X] T155 [US3] Add user location marker and tracking in libs/features/map/components/venue-map.component.ts
- [X] T156 [US3] Implement navigation app integration (Google Maps, Apple Maps) in libs/features/map/components/venue-detail.component.ts

### Backend API: Proximity Search

- [X] T157 [US3] Implement GET /venues/nearby endpoint with Redis GEORADIUS in apps/api/src/venues/venues.controller.ts
- [X] T158 [US3] Add distance calculation and sorting in apps/api/src/venues/venues.service.ts
- [X] T159 [US3] Implement venue type filtering (brewery, winery, all) in apps/api/src/venues/venues.service.ts
- [X] T160 [US3] Add radius validation DTO (0.1-100km) in apps/api/src/venues/dto/nearby-venues.dto.ts
- [X] T161 [US3] Implement caching for proximity queries (5min TTL) in apps/api/src/venues/venues.service.ts

### Workers: Venue Caching

- [X] T162 [US3] Create venue cache worker for pre-caching nearby venues in libs/workers/venue-cache-worker.ts
- [X] T163 [US3] Implement cache warming for popular venues (top 100) in libs/workers/venue-cache-worker.ts

### App Integration: Map View

- [X] T164 [US3] Create map route in apps/web/src/app/pages/map/map.routes.ts
- [X] T165 [US3] Integrate map component in map page in apps/web/src/app/pages/map/map.page.ts
- [X] T166 [US3] Add navigation to map from main navigation in apps/web/src/app/app.html
- [X] T167 [US3] Implement map accessibility (ARIA labels on controls) in libs/features/map/venue-map.html

### Tests for User Story 3 (MANDATORY)

- [X] T168 [P] [US3] Unit test for proximity search service in libs/features/src/lib/map/venue-search.service.spec.ts
- [X] T169 [P] [US3] Unit test for Haversine distance calculation in libs/shared/src/utils/distance.utils.spec.ts
- [X] T170 [P] [US3] Unit test for venue list component in libs/features/src/lib/map/venue-list.spec.ts
- [X] T171 [P] [US3] Integration test for GET /venues/nearby with Redis in apps/api/src/modules/venues/venues.controller.spec.ts
- [X] T172 [P] [US3] Integration test for venue type filtering in apps/api/src/modules/venues/venues.controller.spec.ts
- [X] T173 [P] [US3] E2E test for map loading and venue markers in apps/web-e2e/src/map.spec.ts
- [X] T174 [P] [US3] E2E test for venue detail popup interaction in apps/web-e2e/src/map.spec.ts
- [X] T175 [P] [US3] E2E test for navigation integration in apps/web-e2e/src/map.spec.ts

**Checkpoint**: User Story 3 complete - interactive map fully functional and independently testable

---

## Phase 6: User Story 4 - Optional Anonymized Sharing (Priority: P4)

**Goal**: Allow users to optionally share individual visits via public links that contain only venue name and approximate date (no GPS coordinates, user identity, or precise timestamps).

**Independent Test**: Complete a visit, generate a share link, verify the shared view displays only anonymized information (venue name, city, date) with no user-identifying data.

### Feature Library: Sharing

- [X] T176 Generate sharing feature library in libs/features/sharing/
- [X] T177 [P] [US4] Create share modal component in libs/features/sharing/components/share-modal.component.ts
- [X] T178 [P] [US4] Create shared visit view component (public) in libs/features/sharing/components/shared-visit-view.component.ts
- [X] T179 [US4] Create share service in libs/features/sharing/services/share.service.ts
- [X] T180 [US4] Implement share link generation in libs/features/sharing/services/share.service.ts
- [X] T181 [US4] Implement share via standard channels (messaging, social media) in libs/features/sharing/components/share-modal.component.ts
- [X] T182 [US4] Add optional expiration time selection in libs/features/sharing/components/share-modal.component.ts
- [X] T183 [US4] Verify no GPS coordinates or user info in shared data in libs/features/sharing/services/share.service.ts

### Backend API: Sharing Module

- [X] T184 [US4] Create sharing module in apps/api/src/sharing/sharing.module.ts
- [X] T185 [US4] Create sharing controller with POST /visits/:visitId/share endpoint in apps/api/src/sharing/sharing.controller.ts
- [X] T186 [US4] Implement GET /shared/:shareId endpoint (public, no auth) in apps/api/src/sharing/sharing.controller.ts
- [X] T187 [US4] Create sharing service with venue denormalization logic in apps/api/src/sharing/sharing.service.ts
- [X] T188 [US4] Implement expiration check and 410 Gone response in apps/api/src/sharing/sharing.service.ts
- [X] T189 [US4] Add view count tracking in apps/api/src/sharing/sharing.service.ts
- [X] T190 [US4] Add privacy validation DTO to ensure no user_id exposed in apps/api/src/sharing/dto/

### Feature Library: Settings (Sharing Preferences)

- [X] T191 Generate settings feature library in libs/features/settings/
- [X] T192 [P] [US4] Create settings component in libs/features/settings/components/settings.component.ts
- [X] T193 [P] [US4] Create privacy settings component in libs/features/settings/components/privacy-settings.component.ts
- [X] T194 [P] [US4] Create notification settings component in libs/features/settings/components/notification-settings.component.ts
- [X] T195 [US4] Create preferences service in libs/features/settings/services/preferences.service.ts
- [X] T196 [US4] Implement sharing default preferences (never, ask, always) in libs/features/settings/components/privacy-settings.component.ts

### Backend API: User Preferences Module

- [X] T197 [US4] Create user module in apps/api/src/user/user.module.ts
- [X] T198 [US4] Create user controller with GET /user/preferences endpoint in apps/api/src/user/user.controller.ts
- [X] T199 [US4] Implement PATCH /user/preferences endpoint in apps/api/src/user/user.controller.ts
- [X] T200 [US4] Create user service and add validation DTOs for preferences in apps/api/src/user/

### App Integration: Sharing & Settings

- [X] T201 [US4] Add share button to visit detail view in libs/features/visits/components/visit-detail.component.ts
- [X] T202 [US4] Create settings route in apps/web/src/app/app.routes.ts
- [X] T203 [US4] Create public shared visit route (no auth required) in apps/web/src/app/app.routes.ts
- [X] T204 [US4] Integrate settings component in settings page in apps/web/src/app/pages/settings/settings.page.ts
- [X] T205 [US4] Add navigation to settings from main navigation in apps/web/src/app/app.component.ts

### Tests for User Story 4 (MANDATORY)

- [X] T206 [P] [US4] Unit test for share service link generation in libs/features/sharing/services/share.service.spec.ts
- [X] T207 [P] [US4] Unit test for anonymization (no user data) in libs/features/sharing/services/share.service.spec.ts
- [X] T208 [P] [US4] Unit test for preferences service in libs/features/settings/services/preferences.service.spec.ts
- [X] T209 [P] [US4] Integration test for POST /visits/:visitId/share in apps/api/tests/integration/sharing.test.ts
- [X] T210 [P] [US4] Integration test for GET /shared/:shareId (public) in apps/api/tests/integration/sharing.test.ts
- [X] T211 [P] [US4] Integration test for expiration handling in apps/api/tests/integration/sharing.test.ts
- [X] T212 [P] [US4] Integration test for GET /user/preferences in apps/api/src/modules/user/user.controller.spec.ts
- [X] T213 [P] [US4] Integration test for PATCH /user/preferences in apps/api/src/modules/user/user.controller.spec.ts
- [X] T214 [P] [US4] E2E test for share modal and link generation in e2e/web-e2e/specs/sharing.spec.ts
- [X] T215 [P] [US4] E2E test for public shared visit view in e2e/web-e2e/specs/sharing.spec.ts
- [X] T216 [P] [US4] E2E test for sharing preferences in settings in e2e/web-e2e/specs/settings.spec.ts

**Checkpoint**: User Story 4 complete - anonymized sharing fully functional and independently testable

---

## Phase 7: Notifications & Observability (Cross-Cutting)

**Purpose**: Add granular notification settings and implement monitoring/observability per FR-037a through FR-042

### Notifications Implementation

- [x] T217 [P] Implement notification permission request in apps/web/ and apps/mobile/
- [x] T218 [P] Create notification preferences UI in libs/features/settings/components/notification-settings.component.ts
- [x] T219 [P] Implement visit detected (arrival) notification in libs/features/visits/services/visit-tracker.service.ts
- [x] T220 [P] Implement visit ended (departure) notification in libs/features/visits/services/visit-tracker.service.ts
- [x] T221 [P] Implement new nearby venues notification in libs/features/map/services/venue-search.service.ts
- [x] T222 [P] Implement weekly visit summary notification in apps/api/src/scripts/weekly-summary.ts
- [x] T223 [P] Implement sharing activity notification in libs/features/sharing/services/share.service.ts
- [x] T224 Set default notification preferences (visit start/end enabled, others disabled) in libs/shared/models/user.model.ts
- [x] T225 Handle device-level notification permission denial gracefully in apps/web/ and apps/mobile/

### Observability & Monitoring

- [x] T226 [P] Configure Sentry module for error tracking in apps/api/src/common/sentry/
- [x] T227 [P] Add error context logging interceptor (user ID, timestamp, request details) in apps/api/src/common/interceptors/logging.interceptor.ts
- [x] T228 [P] Implement API response latency tracking in apps/api/src/common/interceptors/metrics.interceptor.ts
- [x] T229 [P] Implement visit detection success rate tracking in libs/features/visits/services/visit-tracker.service.ts
- [x] T230 [P] Create health module with /health endpoint in apps/api/src/health/
- [x] T231 [P] Implement error rate alerting in apps/api/src/common/sentry/sentry.service.ts
- [x] T232 [P] Verify sensitive location data not logged in apps/api/src/common/filters/http-exception.filter.ts

### Tests for Notifications & Observability

- [x] T233 [P] Unit test for notification permission handling in apps/web/ or apps/mobile/
- [x] T234 [P] Unit test for notification preferences persistence in libs/features/settings/services/preferences.service.spec.ts
- [x] T235 [P] Integration test for error tracking without sensitive data in apps/api/tests/integration/monitoring.test.ts
- [x] T236 [P] Integration test for health check endpoint in apps/api/tests/integration/health.test.ts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, performance optimization, accessibility, and deployment readiness

### Performance Optimization

- [x] T237 [P] Configure Nx bundle budgets in apps/web/project.json and apps/mobile/project.json
- [x] T238 [P] Implement code splitting for lazy-loaded routes in apps/web/src/app/app.routes.ts
- [x] T239 [P] Optimize Leaflet marker clustering threshold (50 markers) in libs/features/map/components/venue-map.component.ts
- [x] T240 [P] Add HTTP caching headers for venue endpoints using cache interceptor in apps/api/src/venues/
- [x] T241 [P] Implement Redis cache warming for popular regions in apps/api/src/scripts/cache-warming.ts
- [x] T242 [P] Optimize IndexedDB queries with indexes in libs/data/local/indexeddb.service.ts

### Accessibility (WCAG 2.1 AA)

- [x] T243 [P] Add ARIA labels to all interactive elements in libs/ui/ components
- [x] T244 [P] Implement keyboard navigation for map controls in libs/features/map/components/venue-map.component.ts
- [x] T245 [P] Add screen reader support for timeline entries in libs/features/visits/components/timeline.component.ts
- [x] T246 [P] Test with screen reader (VoiceOver, TalkBack) in apps/web/ and apps/mobile/
- [x] T247 [P] Verify color contrast meets WCAG AA standards in libs/ui/ components

### Security Hardening

- [x] T248 [P] Verify Row-Level Security policies on all tables in apps/api/migrations/
- [x] T249 [P] Add input validation DTOs and pipes for all API endpoints in apps/api/src/*/dto/
- [x] T250 [P] Implement rate limiting guard per user/IP in apps/api/src/common/guards/rate-limit.guard.ts
- [x] T251 [P] Configure CORS and helmet in apps/api/src/main.ts
- [x] T252 [P] Add Content Security Policy using helmet middleware in apps/api/src/main.ts
- [x] T253 [P] Verify JWT token validation and refresh in apps/api/src/auth/guards/jwt-auth.guard.ts

### Documentation

- [x] T254 [P] Update CLAUDE.md with final architecture notes
- [x] T255 [P] Update README.md with deployment instructions
- [x] T256 [P] Create API documentation with Swagger/OpenAPI decorators and UI at /api-docs in apps/api/src/main.ts
- [x] T257 [P] Document environment variables in .env.example files
- [x] T258 [P] Create troubleshooting guide in docs/troubleshooting.md

### Deployment & CI/CD

- [x] T259 Configure GitHub Actions for Nx affected builds in .github/workflows/ci.yml
- [x] T260 [P] Setup Docker build pipeline in .github/workflows/docker.yml
- [ ] T261 [P] Configure production environment variables in deployment platform
- [ ] T262 [P] Setup Supabase production project and apply migrations
- [ ] T263 [P] Configure Redis production instance
- [ ] T264 [P] Deploy API to production (e.g., Vercel, Railway, Fly.io)
- [ ] T265 [P] Deploy web PWA to production (e.g., Vercel, Netlify)
- [ ] T266 [P] Submit mobile apps to App Store and Google Play (if applicable)

### Final Validation

- [x] T267 Run full test suite across all projects with npx nx run-many --target=test --all
- [x] T268 Run E2E tests for all user stories in e2e/
- [x] T269 Validate quickstart.md setup guide end-to-end
- [x] T270 Perform load testing on API endpoints (100 req/s sustained)
- [x] T271 Test offline functionality and sync on web and mobile
- [x] T272 Verify battery usage meets < 5% over 8 hours target on mobile devices
- [x] T273 Run accessibility audit with Lighthouse and axe DevTools
- [x] T274 Verify bundle size < 2MB initial load for web app
- [x] T275 Test visit detection accuracy with real-world venue visits

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Notifications & Observability (Phase 7)**: Can proceed in parallel with user stories (cross-cutting)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Requires Foundational and uses US1 visit data, but timeline is independently testable
- **User Story 3 (P3)**: Requires Foundational and can integrate with US1/US2 visit history, but map is independently testable
- **User Story 4 (P4)**: Requires Foundational and US2 (share from visit detail), but sharing is independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All tasks marked [P] can run in parallel (T002-T010)
- **Phase 2 (Foundational)**: Many tasks marked [P] can run in parallel within subsections
  - Apps structure: T014-T018 parallel
  - Shared models: T020-T028 parallel
  - UI components: T030-T037 parallel
  - Data repositories: T039-T051 parallel
  - Middleware: T055-T059 parallel
- **Phase 3-6 (User Stories)**: Once Foundational completes, all user stories can start in parallel by different team members
- **Within Each User Story**: All tests marked [P] can run in parallel, all models marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T111: "Unit test for geofence boundary detection"
Task T112: "Unit test for dwell time filtering"
Task T113: "Unit test for timestamp rounding utility"
Task T114: "Unit test for visit tracker arrival/departure logic"
Task T115: "Unit test for offline sync retry logic"
Task T116: "Integration test for POST /visits endpoint"
Task T117: "Integration test for batch sync endpoint"
Task T118: "E2E test for onboarding and location permission flow"
Task T119: "E2E test for automatic visit detection"
Task T120: "E2E test for offline visit tracking and sync"

# Launch all models for User Story 1 together:
Task T020: "Create Venue model"
Task T021: "Create Visit model"
Task T022: "Create User model"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Automatic Visit Detection)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy MVP / Demo

**MVP Deliverables**:
- Automatic visit detection with geofencing
- Local storage with offline support
- Cloud sync for authenticated users
- Anonymous usage supported
- Onboarding with location permissions

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Timeline feature)
4. Add User Story 3 → Test independently → Deploy/Demo (Map discovery)
5. Add User Story 4 → Test independently → Deploy/Demo (Sharing feature)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1)
   - Developer B: User Story 2 (P2)
   - Developer C: User Story 3 (P3)
   - Developer D: User Story 4 (P4)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitutional requirement: Tests are MANDATORY for every feature
- Focus on MVP (US1) first for fastest time-to-value

---

## Summary

**Total Tasks**: 275 tasks
**Task Count by User Story**:
- Setup (Phase 1): 10 tasks
- Foundational (Phase 2): 61 tasks (blocking)
- User Story 1 (P1 - MVP): 49 tasks (including 10 tests)
- User Story 2 (P2): 24 tasks (including 8 tests)
- User Story 3 (P3): 31 tasks (including 8 tests)
- User Story 4 (P4): 41 tasks (including 11 tests)
- Notifications & Observability (Phase 7): 20 tasks (including 4 tests)
- Polish & Cross-Cutting (Phase 8): 39 tasks

**Parallel Opportunities**: 120+ tasks marked [P] for parallel execution
**Independent Test Criteria**: Each user story has clear acceptance criteria and dedicated test tasks
**Suggested MVP Scope**: User Story 1 only (automatic visit detection) - 120 tasks total including setup and foundational

**Format Validation**: ✅ All tasks follow the checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
