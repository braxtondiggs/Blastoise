# Implementation Plan: Venue Visit Tracker

**Branch**: `001-venue-visit-tracker` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-venue-visit-tracker/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a privacy-first mobile and web application that automatically tracks brewery and winery visits using geofencing, displays visit history on a visual timeline, enables venue discovery through an interactive map, and supports optional anonymized sharing. The system emphasizes on-device processing, minimal data storage (venue references and timestamps only), and strict privacy controls that never store or transmit precise GPS coordinates.

The technical approach leverages an Angular/Capacitor frontend within an Nx monorepo for cross-platform deployment, with Capacitor handling native geolocation capabilities. A lightweight Node.js backend provides REST endpoints for venue discovery and visit synchronization. Supabase manages authentication and stores anonymized visit data in Postgres, while Redis provides geospatial indexing and caching for proximity queries. Venue data is sourced from OpenStreetMap and Open Brewery DB.

## Technical Context

**Language/Version**: TypeScript 5.x (Angular 20+), Node.js 22 LTS
**Primary Dependencies**:
- Frontend: Angular 20+, Capacitor 7+, Leaflet 1.9+, DaisyUI/Tailwind CSS 4.x
- Backend: Node.js 22, NestJS 10.x, Supabase JS Client 2.x
- Infrastructure: Redis 7+, PostgreSQL 15+ (via Supabase), Docker Compose

**Storage**: PostgreSQL 15+ (managed by Supabase) for user data, visits, and preferences; Redis 7+ for geospatial indexes and caching
**Testing**: Jest (Angular + Node.js unit tests), Playwright (E2E tests), Vitest (optional alternative)
**Target Platform**: Web (PWA), iOS 15+, Android 10+ (via Capacitor)
**Project Type**: Mobile + Web application with backend API
**Performance Goals**:
- Visit detection < 30 seconds after geofence entry/exit
- Timeline/map load < 3 seconds on 3G networks
- FCP < 1.5 seconds
- Battery drain < 5% over 8 hours with background tracking

**Constraints**:
- No precise GPS coordinates stored (venue IDs only)
- All location processing on-device when possible
- Offline-first architecture for visit tracking
- WCAG 2.1 AA accessibility compliance
- Bundle size < 2MB initial load

**Scale/Scope**:
- Initial target: 1,000 venues indexed
- Expected users: 10,000 active users
- ~5-10 visits per user per month
- API: 100 req/s sustained, 500 req/s peak

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality & Structure ✅

- **Nx Workspace Structure**: Angular app and Node.js API organized as separate Nx projects
- **Linting**: ESLint for TypeScript, Angular ESLint rules, Prettier integration
- **Module Boundaries**: Clear separation between frontend (apps/mobile), backend (apps/api), and shared libraries (libs/*)
- **Status**: PASS - Nx monorepo enforces structure, linting configured by default

### II. Testing Excellence ✅

- **Unit Tests**: Jest for both Angular and Node.js (unified testing framework)
- **Integration Tests**: Playwright for E2E user journeys (visit detection, timeline, map)
- **Contract Tests**: OpenAPI validation for REST endpoints
- **CI/CD**: Nx affected commands run tests on changed projects only
- **Status**: PASS - Comprehensive testing strategy aligned with constitution requirements

### III. User Experience Consistency ✅

- **Design System**: DaisyUI components with Tailwind CSS, consistent across web/mobile
- **Accessibility**: WCAG 2.1 AA compliance (ARIA labels, keyboard navigation, screen reader support)
- **Responsive Design**: Mobile-first Tailwind breakpoints, tested on iOS/Android/web
- **Offline Capability**: Service workers for PWA, local storage for visit tracking, sync on reconnect
- **Status**: PASS - Capacitor ensures consistent UX, PWA supports offline-first

### IV. Performance Optimization ✅

- **Page Load**: Code splitting, lazy loading routes, bundle size monitoring
- **Map Rendering**: Leaflet with clustering for large venue sets, viewport-based loading
- **Background Location**: Capacitor geolocation with configurable update intervals, debouncing
- **Caching**: Redis for venue proximity queries, HTTP caching headers, local storage for visits
- **Bundle Budgets**: Nx supports bundle size limits in project configuration
- **Status**: PASS - Architecture prioritizes performance at all layers

### V. Privacy & Ethical Data Handling ✅

- **Explicit Consent**: Onboarding flow requests location permissions with clear explanations
- **Data Minimization**: Only venue IDs and rounded timestamps stored, no GPS coordinates
- **Encryption**: Supabase provides TLS in transit, AES-256 at rest for Postgres
- **User Controls**: Settings for disabling tracking, deleting history, managing sharing preferences
- **Privacy by Design**: Geofence logic runs on-device, API receives only visit events (venue ID + timestamp)
- **Status**: PASS - Privacy is architectural foundation, not an afterthought

### Constitution Check Result: ✅ PASS

All constitutional principles are satisfied by the proposed architecture. No complexity justification required.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Nx Monorepo Structure
apps/
├── web/                             # Angular PWA (Progressive Web App)
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.config.ts             # Angular standalone config
│   │   │   ├── app.routes.ts             # Route definitions
│   │   │   └── app.component.ts
│   │   ├── assets/
│   │   ├── environments/
│   │   ├── manifest.json                 # PWA manifest
│   │   └── index.html
│   ├── project.json
│   └── tailwind.config.js
│
├── mobile/                          # Capacitor mobile wrapper (iOS/Android)
│   ├── src/
│   │   ├── app/
│   │   │   └── app.component.ts          # Mobile-specific shell
│   │   ├── environments/
│   │   └── index.html
│   ├── capacitor.config.ts               # iOS/Android native config
│   ├── ios/                              # Native iOS project
│   ├── android/                          # Native Android project
│   ├── project.json
│   └── tailwind.config.js
│
└── api/                             # NestJS REST API (NestJS + Supabase + Redis)
    ├── src/
    │   ├── main.ts                       # NestJS bootstrap
    │   ├── app.module.ts                 # Root module
    │   ├── venues/                       # Venues module
    │   │   ├── venues.controller.ts      # GET /venues (proximity search)
    │   │   ├── venues.service.ts         # Business logic
    │   │   ├── venues.module.ts          # Module definition
    │   │   └── dto/                      # Data transfer objects
    │   ├── visits/                       # Visits module
    │   │   ├── visits.controller.ts      # POST/GET /visits (sync)
    │   │   ├── visits.service.ts         # Business logic
    │   │   ├── visits.module.ts          # Module definition
    │   │   └── dto/                      # Data transfer objects
    │   ├── sharing/                      # Sharing module
    │   │   ├── sharing.controller.ts     # POST /share (anonymized)
    │   │   ├── sharing.service.ts        # Business logic
    │   │   └── sharing.module.ts         # Module definition
    │   ├── user/                         # User module
    │   │   ├── user.controller.ts        # GET/PATCH /user/preferences
    │   │   ├── user.service.ts           # Business logic
    │   │   └── user.module.ts            # Module definition
    │   ├── auth/
    │   │   └── guards/
    │   │       └── jwt-auth.guard.ts     # Supabase JWT validation
    │   ├── common/
    │   │   ├── guards/
    │   │   │   └── rate-limit.guard.ts   # Rate limiting
    │   │   ├── filters/
    │   │   │   └── http-exception.filter.ts  # Global error handler
    │   │   └── interceptors/
    │   │       └── metrics.interceptor.ts    # Performance tracking
    │   ├── supabase/
    │   │   ├── supabase.module.ts        # Supabase module
    │   │   └── supabase.service.ts       # Supabase client
    │   └── redis/
    │       ├── redis.module.ts           # Redis module
    │       └── redis.service.ts          # Redis client
    ├── migrations/                       # Postgres migrations (Supabase)
    ├── tests/
    │   ├── integration/
    │   └── unit/
    ├── project.json
    └── Dockerfile

libs/
├── shared/                          # Shared models, types, utilities
│   ├── models/
│   │   ├── venue.model.ts
│   │   ├── visit.model.ts
│   │   ├── user.model.ts
│   │   └── shared-visit.model.ts
│   ├── types/
│   │   ├── api-response.types.ts
│   │   └── geolocation.types.ts
│   ├── utils/
│   │   ├── date.utils.ts                 # Timestamp rounding
│   │   ├── distance.utils.ts             # Haversine calculations
│   │   └── privacy.utils.ts              # GPS sanitization
│   └── project.json
│
├── ui/                              # Reusable UI components (DaisyUI/Tailwind)
│   ├── components/
│   │   ├── button/                       # Custom button variants
│   │   ├── card/                         # Card component
│   │   ├── modal/                        # Modal dialogs
│   │   ├── timeline/                     # Timeline visualization
│   │   └── map/                          # Leaflet map wrapper
│   ├── directives/
│   │   └── lazy-load.directive.ts        # Lazy load images
│   ├── pipes/
│   │   ├── duration.pipe.ts              # Format visit duration
│   │   └── distance.pipe.ts              # Format distances (km/mi)
│   └── project.json
│
├── features/                        # Self-contained feature modules
│   ├── auth/                             # P0: Authentication & onboarding
│   │   ├── components/
│   │   │   ├── login.component.ts
│   │   │   └── onboarding.component.ts
│   │   ├── services/
│   │   │   └── auth.service.ts           # Supabase Auth wrapper
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   └── project.json
│   │
│   ├── visits/                           # P1: Visit tracking & timeline (P1, P2)
│   │   ├── components/
│   │   │   ├── timeline.component.ts     # P2: Timeline view
│   │   │   ├── visit-card.component.ts
│   │   │   ├── visit-detail.component.ts
│   │   │   └── active-visit.component.ts # In-progress visit indicator
│   │   ├── services/
│   │   │   ├── geofence.service.ts       # P1: Capacitor geolocation
│   │   │   ├── visit-tracker.service.ts  # P1: Visit detection logic
│   │   │   └── visit-sync.service.ts     # Offline sync
│   │   └── project.json
│   │
│   ├── map/                              # P3: Venue discovery & map
│   │   ├── components/
│   │   │   ├── venue-map.component.ts    # Leaflet map with markers
│   │   │   ├── venue-list.component.ts   # List view alternative
│   │   │   └── venue-detail.component.ts
│   │   ├── services/
│   │   │   └── venue-search.service.ts   # Proximity queries
│   │   └── project.json
│   │
│   ├── sharing/                          # P4: Anonymized sharing
│   │   ├── components/
│   │   │   ├── share-modal.component.ts
│   │   │   └── shared-visit-view.component.ts
│   │   ├── services/
│   │   │   └── share.service.ts
│   │   └── project.json
│   │
│   └── settings/                         # User preferences & privacy controls
│       ├── components/
│       │   ├── settings.component.ts
│       │   ├── privacy-settings.component.ts
│       │   └── notification-settings.component.ts
│       ├── services/
│       │   └── preferences.service.ts
│       └── project.json
│
├── data/                            # Data access layer (Supabase, Redis, API)
│   ├── supabase/
│   │   ├── supabase.client.ts            # Configured Supabase client
│   │   ├── visits.repository.ts          # Visit CRUD operations
│   │   ├── venues.repository.ts          # Venue queries
│   │   └── users.repository.ts           # User preferences
│   ├── api/
│   │   ├── api.client.ts                 # HTTP client (Angular HttpClient)
│   │   ├── venues.api.ts                 # Venue API endpoints
│   │   ├── visits.api.ts                 # Visit API endpoints
│   │   └── sharing.api.ts                # Sharing API endpoints
│   ├── redis/                            # Backend only
│   │   ├── redis.client.ts
│   │   ├── geospatial.service.ts         # GEORADIUS queries
│   │   └── cache.service.ts              # General caching
│   ├── local/
│   │   ├── indexeddb.service.ts          # Client-side storage
│   │   └── visits-local.repository.ts    # Offline visit storage
│   └── project.json
│
└── workers/                         # Background sync & location workers
    ├── sync-worker.ts                    # Service worker for background sync
    ├── location-worker.ts                # Background location updates
    ├── venue-cache-worker.ts             # Pre-cache nearby venues
    └── project.json

docker/
├── docker-compose.yml               # Redis, Postgres (local dev)
├── api.Dockerfile
└── nginx.conf

e2e/
├── web-e2e/                         # Playwright tests for web app
│   ├── specs/
│   └── playwright.config.ts
└── mobile-e2e/                      # Playwright tests for mobile app
    ├── specs/
    └── playwright.config.ts
```

**Structure Decision**: Nx monorepo with **separation of deployment targets**:
- `apps/web`: Angular PWA for desktop/mobile browser with service workers
- `apps/mobile`: Capacitor wrapper for native iOS/Android with background location
- `apps/api`: Node.js Express backend with Supabase + Redis integration

**Libraries organized by purpose**:
- `libs/shared`: Domain models, types, utilities (used by all apps)
- `libs/ui`: Presentational components with DaisyUI/Tailwind (shared UI layer)
- `libs/features`: Self-contained feature modules (auth, visits, map, sharing, settings) - each independently lazy-loadable
- `libs/data`: Data access layer with repositories and API clients (separation of concerns)
- `libs/workers`: Background workers for sync and location tracking (PWA + native)

**Benefits of this structure**:
1. **Clear separation**: Web vs Mobile apps have different build targets and deployment strategies
2. **Feature isolation**: Each feature lib can be developed, tested, and lazy-loaded independently
3. **Data layer abstraction**: `libs/data` provides clean separation between business logic and data sources
4. **Reusable UI**: `libs/ui` components work across web and mobile apps
5. **Nx dependency rules**: Can enforce that features don't depend on each other, only on shared/ui/data
6. **Parallel development**: Teams can work on different features without conflicts
7. **Optimized builds**: Nx affected commands only rebuild changed apps/libs

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity violations identified. The architecture is appropriately scoped for the feature requirements.

---

## Post-Design Constitution Re-Check

### I. Code Quality & Structure ✅

**Status**: PASS - Design artifacts confirm adherence
- Data model defines clear entity boundaries
- API contracts follow REST conventions with OpenAPI spec
- Nx workspace structure enforced in quickstart guide
- TypeScript interfaces in shared-models library ensure type safety

### II. Testing Excellence ✅

**Status**: PASS - Test strategy validated
- Unit test hooks identified in data model (validation rules)
- Contract tests can be generated from OpenAPI spec
- E2E test scenarios mapped from acceptance criteria
- Jest/Playwright configured in tech stack (unified testing with Jest)

### III. User Experience Consistency ✅

**Status**: PASS - UX requirements validated
- DaisyUI ensures component consistency
- Accessibility requirements documented in research (WCAG 2.1 AA)
- Offline-first architecture confirmed in data model (IndexedDB)
- PWA capabilities via Capacitor

### IV. Performance Optimization ✅

**Status**: PASS - Performance targets achievable
- Redis geospatial indexing supports sub-second proximity queries
- Leaflet clustering handles 1000+ markers efficiently
- Bundle size monitoring available via Nx
- Background location strategy minimizes battery drain

### V. Privacy & Ethical Data Handling ✅

**Status**: PASS - Privacy by design confirmed
- Data model explicitly excludes GPS coordinates
- Timestamp rounding prevents timing attacks
- RLS policies enforce user data isolation
- User preferences include privacy controls

### Final Verdict: ✅ ALL GATES PASS

The design satisfies all constitutional requirements. Ready to proceed to task generation (`/speckit.tasks`).
