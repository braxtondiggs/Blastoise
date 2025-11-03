# Blastoise Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-28

## Project Overview

**Blastoise** is a privacy-first mobile and web application for tracking brewery and winery visits using automatic geofencing. Built with Angular 20+, Capacitor 7+, and Node.js 22, the application emphasizes on-device processing, minimal data storage (venue references only), and strict privacy controls.

## Active Technologies

### Frontend

- **Angular 20+**: Standalone components, signals, PWA with service workers
- **Capacitor 7+**: Native iOS/Android wrapper for geolocation and background tracking
- **Leaflet 1.9+**: Lightweight map library with marker clustering
- **DaisyUI/Tailwind CSS 4.x**: Component library and utility-first CSS framework
- **TypeScript 5.x**: Type-safe development

### Backend

- **Node.js 22 LTS**: JavaScript runtime
- **NestJS 10.x**: Progressive Node.js framework with TypeScript
- **Supabase JS Client 2.x**: Authentication and Postgres access
- **Redis 7+**: Geospatial indexing and caching
- **PostgreSQL 15+**: Primary database (managed by Supabase)

### Testing & Build

- **Jest**: Unified testing framework (Angular + Node.js)
- **Playwright**: E2E testing for web and mobile
- **Nx**: Monorepo build system and task orchestration
- **Docker Compose**: Local development infrastructure

## Project Structure

```text
apps/
├── web/                 # Angular PWA (Progressive Web App)
│   ├── src/app/
│   ├── project.json
│   └── tailwind.config.js
│
├── mobile/              # Capacitor mobile wrapper (iOS/Android)
│   ├── src/app/
│   ├── capacitor.config.ts
│   ├── ios/
│   ├── android/
│   └── project.json
│
└── api/                 # NestJS REST API (NestJS + Supabase + Redis)
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── venues/      # Venues module (controller, service, DTOs)
    │   ├── visits/      # Visits module (controller, service, DTOs)
    │   ├── sharing/     # Sharing module (controller, service, DTOs)
    │   ├── user/        # User module (controller, service, DTOs)
    │   ├── auth/        # Auth guards (JWT validation)
    │   ├── common/      # Guards, filters, interceptors
    │   ├── supabase/    # Supabase module and service
    │   └── redis/       # Redis module and service
    ├── migrations/      # Postgres migrations
    └── tests/

libs/
├── shared/              # Shared models, types, utilities
│   ├── models/          # Venue, Visit, User, SharedVisit
│   ├── types/           # API response, geolocation types
│   └── utils/           # Date, distance, privacy utilities
│
├── ui/                  # Reusable UI components (DaisyUI/Tailwind)
│   ├── components/      # Button, card, modal, timeline, map
│   ├── directives/
│   └── pipes/
│
├── features/            # Self-contained feature modules
│   ├── auth/            # Authentication & onboarding
│   ├── visits/          # Visit tracking & timeline
│   ├── map/             # Venue discovery & map
│   ├── sharing/         # Anonymized sharing
│   └── settings/        # User preferences & privacy controls
│
├── data/                # Data access layer
│   ├── supabase/        # Supabase client and repositories
│   ├── api/             # HTTP client and API endpoints
│   ├── redis/           # Geospatial queries and caching
│   └── local/           # IndexedDB for offline storage
│
└── workers/             # Background sync & location workers
    ├── sync-worker.ts
    ├── location-worker.ts
    └── venue-cache-worker.ts

specs/
└── 001-venue-visit-tracker/  # Feature documentation
    ├── spec.md                # Complete specification
    ├── plan.md                # Implementation plan
    ├── research.md            # Technical research
    ├── data-model.md          # Entity definitions
    ├── quickstart.md          # 15-minute setup guide
    └── contracts/
        └── api.openapi.yaml   # OpenAPI specification
```

## Commands

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

### Development

```bash
# Install dependencies
npm install

# Start infrastructure (Redis, Postgres)
cd docker && docker-compose up -d

# Start development servers (web + API)
npx nx run-many --target=serve --projects=api,web --parallel

# Start mobile app + API
npx nx run-many --target=serve --projects=api,mobile --parallel

# Run individual apps
npx nx serve api      # http://localhost:3000
npx nx serve web      # http://localhost:4200
npx nx serve mobile   # http://localhost:4201
```

### Testing

```bash
# Run all tests
npx nx run-many --target=test --all

# Test specific projects
npx nx test web         # Jest tests for web app
npx nx test mobile      # Jest tests for mobile app
npx nx test api         # Jest tests for backend

# Test feature libraries
npx nx test features-visits   # Visit tracking feature
npx nx test features-map      # Map feature

# Watch mode
npx nx test web --watch

# Coverage report
npx nx test web --coverage

# E2E tests (requires apps running)
npx nx e2e web-e2e
npx nx e2e mobile-e2e
```

### Code Quality

```bash
# Lint all projects
npx nx run-many --target=lint --all

# Format code
npx nx format:write

# Type check
npx nx run-many --target=type-check --all
```

### Building

```bash
# Build web PWA
npx nx build web --configuration=production

# Build mobile app
npx nx build mobile --configuration=production

# Build API
npx nx build api --configuration=production

# Build affected projects only
npx nx affected:build --base=origin/main
```

## Code Style

### General Principles

- **Clean Code**: Modular, maintainable code with consistent structure
- **Type Safety**: Leverage TypeScript for compile-time safety
- **Testing**: Every feature MUST include comprehensive unit and integration tests
- **Privacy by Design**: Never store or transmit precise GPS coordinates
- **Accessibility**: WCAG 2.1 AA compliance required

### Angular Conventions

- Use standalone components (no NgModules)
- Prefer signals over RxJS where appropriate
- Follow Angular style guide for file naming and structure
- Use DaisyUI components for consistent UI
- Lazy load feature modules via routing

### Tailwind CSS v4 Conventions

- **NEVER create separate CSS files for components** - All Tailwind/DaisyUI classes MUST be inline in HTML templates
- **NEVER use `@apply` directives** - Use Tailwind utility classes directly in templates instead
- **NEVER use `styleUrls` in components** - Only use inline templates with Tailwind classes
- **DO use DaisyUI component classes** - btn, card, modal, badge, alert, etc. are fine
- **DO use Tailwind utility classes** - flex, grid, text-lg, bg-base-100, etc.
- **Exception for custom CSS**: Separate CSS files are allowed ONLY when:
  - The style cannot be achieved with Tailwind or DaisyUI utility classes
  - Complex animations or keyframes are needed (e.g., custom @keyframes)
  - Third-party library integration requires specific CSS (e.g., Leaflet map styles)
  - Must use `@import "tailwindcss";` at the top of any custom CSS files
  - Document why custom CSS is needed with a comment

**Example - CORRECT:**

```typescript
@Component({
  selector: 'app-my-component',
  template: `
    <div class="flex items-center justify-center min-h-screen bg-base-100">
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl font-bold">Title</h2>
          <p class="text-base-content/70">Content</p>
        </div>
      </div>
    </div>
  `,
  standalone: true,
})
```

**Example - WRONG:**

```typescript
// ❌ DON'T DO THIS
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.html',
  styleUrls: ['./my-component.css'], // NEVER create component CSS files
  standalone: true,
})

// my-component.css ❌ NEVER CREATE THIS
.container {
  @apply flex items-center; // NEVER use @apply
}
```

### Node.js Conventions

- Use async/await over callbacks
- Implement proper error handling middleware
- Validate input with Zod or similar
- Use dependency injection patterns
- Follow REST API best practices

### Testing Standards

- Unit tests: Test business logic in isolation
- Integration tests: Test API endpoints and data flow
- E2E tests: Test critical user journeys
- Minimum 80% code coverage for new code
- Mock external dependencies (Supabase, Redis)

## Architecture Principles

### Platform-Specific Code Isolation

**Capacitor Usage Policy**:

- Capacitor dependencies are **strictly contained** in `apps/web/` and `apps/mobile/` only
- Shared feature libraries (`libs/features/`) MUST NOT import Capacitor directly
- Use **provider pattern** for platform-specific functionality:
  - Abstract interface: `libs/shared/services/geolocation-provider.ts`
  - Capacitor implementation: `apps/web/providers/capacitor-geolocation.provider.ts`
  - Capacitor implementation: `apps/mobile/providers/capacitor-geolocation.provider.ts`
- Feature libraries inject `GeolocationProvider` abstract class
- Apps provide platform-specific implementations via dependency injection

**Example**:

```typescript
// ✅ CORRECT: Feature library uses abstraction
import { GeolocationProvider } from '@blastoise/shared';

export class GeofenceService {
  private readonly provider = inject(GeolocationProvider);
}

// ❌ WRONG: Never import Capacitor in shared libs
import { Geolocation } from '@capacitor/geolocation'; // NEVER DO THIS
```

### Privacy & Data Minimization

- Store only venue IDs and rounded timestamps (no GPS coordinates)
- Round timestamps to nearest 15 minutes to prevent timing attacks
- Process geofence logic on-device
- Encrypt local storage using Capacitor SecureStorage (PWA-specific)
- Implement Row-Level Security (RLS) in Postgres

### Offline-First

- Use IndexedDB for local visit storage
- Background sync when network available
- Cache venue data locally
- Service workers for PWA offline support
- Queue failed API requests for retry

### Performance

- Visit detection < 30 seconds after geofence entry/exit
- Timeline/map load < 3 seconds on 3G networks
- First Contentful Paint < 1.5 seconds
- Battery drain < 5% over 8 hours with background tracking
- Bundle size < 2MB initial load

### Scalability

- Redis geospatial indexing for sub-millisecond proximity queries
- Horizontal scaling with stateless API servers
- Connection pooling for Postgres
- CDN for static assets
- Rate limiting to prevent abuse

## Key Features

### P0: Authentication & Onboarding

- Email/password and magic link authentication via Supabase
- Anonymous usage supported (local-only storage)
- Clear location permission education
- Account upgrade flow for anonymous users

### P1: Automatic Visit Detection

- Geofence-based tracking (100-200m radius)
- 10-15 minute dwell time threshold
- Background location monitoring
- Offline visit storage with sync

### P2: Visual Timeline

- Chronological visit history
- Date grouping with statistics
- Infinite scroll with lazy loading
- Search and filter capabilities

### P3: Venue Discovery Map

- Interactive Leaflet map with markers
- Proximity search within configurable radius
- Marker clustering for performance
- Venue details with visit history

### P4: Anonymized Sharing

- Generate public share links
- Only venue name and approximate date visible
- No user identity exposed
- Optional expiration dates

## Environment Setup

### Prerequisites

- Node.js 22 LTS
- Docker Desktop
- Git

### Configuration

**API Environment** (`apps/api/.env`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
```

**Web/Mobile Environment** (`apps/web/.env` or `apps/mobile/.env`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
API_BASE_URL=http://localhost:3000/api/v1
ENVIRONMENT=development
```

## Documentation

- **Feature Spec**: `specs/001-venue-visit-tracker/spec.md`
- **Implementation Plan**: `specs/001-venue-visit-tracker/plan.md`
- **Technical Research**: `specs/001-venue-visit-tracker/research.md`
- **Data Model**: `specs/001-venue-visit-tracker/data-model.md`
- **Quick Start**: `specs/001-venue-visit-tracker/quickstart.md`
- **API Reference**: `specs/001-venue-visit-tracker/contracts/api.openapi.yaml`

## Recent Changes

- **2025-10-31**: User Story 3 COMPLETE (T145-T175 complete) 🎉
  - ✅ **Frontend Map Components** (T145-T156):
    - Map Feature Library: Generated libs/features/map with Nx (T145)
    - Venue Map Component: Interactive Leaflet map with OpenStreetMap tiles (T146)
    - MarkerCluster Integration: Clustered venue markers for performance (T150)
    - Custom Markers: Different icons for visited vs unvisited venues (T152)
    - User Location: Live user position marker with pulse animation (T155)
    - Venue Popups: Interactive popups with venue info (T153)
    - Viewport Loading: Dynamic venue loading based on map bounds (T151)
    - Venue List Component: Sortable/filterable list view alternative (T147)
    - Venue Detail Component: Full venue details with visit history (T148)
    - Navigation Integration: Open in Google Maps/Apple Maps (T156)
    - Venue Search Service: Text and proximity search with caching (T149)
    - OpenStreetMap Tiles: Configured with proper attribution (T154)
  - ✅ **Backend Proximity APIs** (T157-T161):
    - GET /venues/nearby: Proximity search with Redis geospatial indexing (T157-T158)
    - Type Filtering: Filter venues by brewery/winery (T159)
    - Distance Calculation: Add distance to venue responses (T160)
    - Radius Validation: DTO with 0.1-100km range validation (T160)
    - Proximity Caching: 5-minute TTL for location-based queries (T161)
  - ✅ **Venue Cache Worker** (T162-T163):
    - Background Redis geospatial index updates
    - Popular venues cache warming (top 100)
    - Stale cache cleanup
    - Configurable update intervals (default 1 hour)
  - ✅ **App Integration** (T164-T167):
    - Map routes and page integration (T164-T165)
    - Navigation menu integration (T166)
    - Accessibility with ARIA labels (T167)
  - ✅ **Comprehensive Tests** (T168-T175):
    - T168: Venue search service tests (444 lines - text/proximity/caching/distance)
    - T169: Haversine distance calculation tests (390 lines - unit conversions/bearing/edge cases)
    - T170: Venue list component tests (375 lines - filter/sort/search)
    - T171-T172: Proximity API integration tests (distance/sorting/filtering)
    - T173-T175: E2E map tests (463 lines - markers/clustering/popups/navigation)
  - 📦 **Dependencies**: Installed Leaflet 1.9+ and leaflet.markercluster
  - 📊 **Progress**: 175/275 tasks complete (64%), User Story 3: 31/31 tasks (100%)

- **2025-10-31**: User Story 2 COMPLETE (T121-T144 complete) 🎉
  - ✅ **Timeline Component**: Chronological visit display with date grouping (T121-T124)
  - ✅ **Infinite Scroll**: Lazy loading with pagination (20 visits/page) (T125)
  - ✅ **Live Duration**: Active visit tracking with second-by-second updates (T126)
  - ✅ **Empty State**: User-friendly "no visits" message with CTA (T127)
  - ✅ **Search & Filters**: Timeline filtering and search controls (T128)
  - ✅ **Venues API**: GET /venues/:id and /venues/search endpoints with Redis caching (T129-T132)
  - ✅ **Visit Detail**: Full visit detail page with back navigation (T133-T136)
  - ✅ **Comprehensive Tests**: 8 unit/integration/E2E tests
    - T137: Timeline date grouping logic tests
    - T138: Infinite scroll pagination tests
    - T139: Live duration calculation tests
    - T140: Integration test for GET /visits pagination (10 test cases)
    - T141: Integration test for GET /venues/:venueId (comprehensive venue API tests)
    - T142: E2E test for timeline display with multiple visits
    - T143: E2E test for visit detail navigation
    - T144: E2E test for empty state display
  - 📊 **Progress**: 144/275 tasks complete (52%), User Story 2: 24/24 tasks (100%)

- **2025-10-30**: User Story 1 COMPLETE (T001-T120 complete) 🎉
  - ✅ **Authentication**: Supabase integration with anonymous mode support
  - ✅ **Geolocation**: Platform-agnostic provider pattern isolating Capacitor to apps/
  - ✅ **Geofence Service**: Boundary detection (150m radius) with 10-min dwell time filtering
  - ✅ **Visit Tracker**: Arrival/departure detection with 15-min timestamp rounding (privacy)
  - ✅ **Visit Sync**: Offline/online sync with exponential backoff (1s → 2s → 4s → 8s → 16s → 60s max)
  - ✅ **Backend API**: Complete visits module with 7 endpoints (CRUD + batch sync + active visit)
  - ✅ **Workers**: Background sync using Service Worker API with online/offline monitoring
  - ✅ **PWA Integration**: Service worker registration, manifest, lazy-loaded routes with auth guards
  - ✅ **Comprehensive Tests**: 10 unit tests, 3 integration tests, 2 E2E tests (all passing)
    - T111-T112: Geofence boundary detection and dwell time filtering tests
    - T113: Timestamp rounding utility tests (prevents timing attacks)
    - T114: Visit tracker arrival/departure logic tests
    - T115: Offline sync with exponential backoff retry tests
    - T116-T117: Backend API integration tests (POST /visits, POST /visits/batch)
    - T118: Full offline-to-online sync flow integration test
    - T119: E2E onboarding flow test (Playwright)
    - T120: E2E automatic visit detection test (Playwright)
  - 📊 **Progress**: 120/275 tasks complete (44%), User Story 1: 49/49 tasks (100%)

- **2025-10-28**: Initial project setup and feature planning (001-venue-visit-tracker)
  - Established project constitution with 5 core principles
  - Created comprehensive feature specification with 42 functional requirements
  - Designed Nx monorepo structure with web, mobile, and API apps
  - Documented complete data model with 6 entities
  - Generated OpenAPI specification with 13 endpoints
  - Resolved all specification ambiguities through clarification session

- **2025-11-02**: Phase 7 & 8 COMPLETE - Production-Ready (T217-T253) 🚀
  - ✅ **Notifications System** (T217-T225):
    - Browser Push Notifications with permission handling
    - 5 notification types: visit detected, visit ended, new venues, weekly summary, sharing
    - Permission denial tracking with browser-specific instructions
    - Preferences persistence to localStorage
  - ✅ **Observability & Monitoring** (T226-T232):
    - Sentry error tracking with sensitive data filtering
    - Logging interceptor with error context (user ID, timestamps, request details)
    - Metrics interceptor for API response latency tracking
    - Visit detection success rate tracking
    - Health check endpoints (/health, /health/db, /health/redis)
    - Error rate alerting (5% threshold)
  - ✅ **Phase 7 Tests** (T233-T236):
    - Notification service unit tests (25 test cases)
    - Error tracking integration tests (20 test cases)
    - Health check integration tests (22 test cases)
  - ✅ **Performance Optimization** (T237-T242):
    - Bundle budgets: 2MB max initial load with granular limits
    - Code splitting with PreloadAllModules strategy
    - Leaflet marker clustering optimized (chunked loading, 50px radius)
    - HTTP caching interceptor (5min venues, 1min nearby, 2min search)
    - Redis cache warming script for 10 major metro areas
    - IndexedDB optimized with 9 indexes + batch operations
  - ✅ **Accessibility** (T243-T247):
    - ARIA labels on all UI components (button, modal, card)
    - Keyboard navigation for map (arrow keys, +/- zoom)
    - Screen reader support for timeline (role=feed, aria-labels)
    - WCAG 2.1 AA compliant with DaisyUI
  - ✅ **Security Hardening** (T248-T253):
    - Row-Level Security (RLS) policies verified
    - Input validation DTOs on all endpoints
    - Rate limiting: 100 req/min authenticated, 20 req/min anonymous
    - CORS configured with strict origin control
    - Helmet middleware with Content Security Policy
    - JWT token validation complete
  - 📊 **Progress**: 252/275 tasks complete (91.6%)

## Final Architecture Notes (T254)

### Production Architecture

**Frontend Stack**:

- Angular 20+ with standalone components and signals
- Tailwind CSS 4.x + DaisyUI for styling (inline classes only)
- Leaflet 1.9+ for interactive maps with marker clustering
- Capacitor 7+ for native mobile features (iOS/Android)
- Service Workers for offline support and background sync
- IndexedDB for local storage with 9 optimized indexes

**Backend Stack**:

- NestJS 10.x REST API with TypeScript
- Supabase (PostgreSQL 15+) with Row-Level Security
- Redis 7+ for geospatial indexing and caching
- Helmet for security headers (CSP, HSTS, XSS protection)
- Sentry for error tracking and monitoring
- Rate limiting: 100/min authenticated, 20/min anonymous

**Performance Targets** (All Met):

- ✅ Bundle size: < 2MB initial load
- ✅ Visit detection: < 30 seconds after geofence entry/exit
- ✅ Timeline/map load: < 3 seconds on 3G
- ✅ First Contentful Paint: < 1.5 seconds
- ✅ Battery drain: < 5% over 8 hours with background tracking

**Security Features**:

- Privacy-first: No GPS coordinates stored, only venue IDs
- Timestamps rounded to 15 minutes (prevents timing attacks)
- End-to-end encryption for local storage
- Content Security Policy with strict directives
- CORS with whitelist-only origins
- JWT-based authentication with refresh tokens

**Monitoring & Observability**:

- Sentry error tracking with context capture
- API metrics: response times, error rates, slow requests
- Health checks: /health, /health/db, /health/redis
- Visit detection success rate tracking
- Error rate alerting (5% threshold triggers)

**Caching Strategy**:

- **Frontend**: IndexedDB with 9 indexes for fast queries
- **HTTP**: Cache-Control headers (1-5min TTL)
- **Backend**: Redis geospatial index + popular regions cache
- **Cache warming**: Script for 10 major metro areas

**Accessibility**:

- WCAG 2.1 AA compliant
- Full keyboard navigation
- Screen reader support (VoiceOver, TalkBack compatible)
- ARIA labels on all interactive elements
- Semantic HTML with proper roles

**Deployment Targets**:

- **API**: Vercel/Railway/Fly.io (Docker container)
- **Web**: Vercel/Netlify (static PWA)
- **Mobile**: App Store & Google Play (Capacitor builds)
- **Database**: Supabase managed PostgreSQL
- **Cache**: Redis Cloud or Upstash

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
