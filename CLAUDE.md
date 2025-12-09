# Blastoise Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-05

## Project Overview

**Blastoise** is a privacy-first mobile and web application for tracking brewery and winery visits using automatic geofencing. Built with Angular 20+, Capacitor 7+, and Node.js 22, the application emphasizes on-device processing, minimal data storage (venue references only), and strict privacy controls.

## Tech Stack

### Frontend
- **Angular 20+**: Standalone components, signals, PWA with service workers
- **Capacitor 7+**: Native iOS/Android wrapper for geolocation and background tracking
- **Leaflet 1.9+**: Lightweight map library with marker clustering
- **DaisyUI/Tailwind CSS 4.x**: Component library and utility-first CSS framework
- **ng-icons/Heroicons**: Icon library for consistent iconography
- **TypeScript 5.x**: Type-safe development

### Backend
- **Node.js 22 LTS** + **NestJS 10.x**: TypeScript server framework with self-hosted JWT authentication
- **TypeORM 0.3.x**: TypeScript ORM for PostgreSQL
- **Redis 7+**: Geospatial indexing and caching
- **PostgreSQL 15+**: Primary database

### Testing & Build
- **Jest**: Unified testing framework (Angular + Node.js)
- **Playwright**: E2E testing for web and mobile
- **Nx**: Monorepo build system and task orchestration
- **Docker Compose**: Local development infrastructure

## Project Structure

```text
apps/
├── web/                 # Angular PWA (Progressive Web App with Capacitor)
├── mobile/              # Capacitor wrapper serving web build (iOS/Android)
└── api/                 # NestJS REST API (NestJS + TypeORM + PostgreSQL + Redis)

libs/
├── shared/              # Shared models, types, utilities
├── ui/                  # Reusable UI components (DaisyUI/Tailwind)
├── features/            # Self-contained feature modules (auth, visits, map, sharing, settings)
├── data/                # Data access layer (api, local storage)
└── workers/             # Background sync & location workers

specs/                   # Feature documentation, plans, and contracts
```

## Nx Commands

### Development

```bash
npm install                                                    # Install dependencies
cd docker && docker-compose up -d                             # Start infrastructure (Redis, Postgres)
npx nx run-many --target=serve --projects=api,web --parallel  # Start dev servers
npx nx serve api                                              # http://localhost:3000
npx nx serve web                                              # http://localhost:4200
```

### Mobile Development

```bash
npx nx build web        # Build web app
npx nx sync mobile      # Sync to iOS/Android
npx nx run:ios mobile   # Open in Xcode / run on iOS device
```

### Testing

```bash
npx nx run-many --target=test --all     # Run all tests
npx nx test web --watch                 # Watch mode
npx nx test web --coverage              # Coverage report
npx nx e2e web-e2e                      # E2E tests
```

### Code Quality & Building

```bash
npx nx run-many --target=lint --all                # Lint all projects
npx nx format:write                                # Format code
npx nx build web --configuration=production        # Build web PWA
npx nx build api --configuration=production        # Build API
npx nx affected:build --base=origin/main           # Build affected projects only
```

## Code Style Conventions

### General Principles

- **Clean Code**: Modular, maintainable code with consistent structure
- **Type Safety**: Leverage TypeScript for compile-time safety
- **Testing**: Tests are RECOMMENDED but not required for rapid prototyping
- **Privacy by Design**: Never store or transmit precise GPS coordinates
- **Accessibility**: WCAG 2.1 AA compliance required
- **No Task Numbers in Comments**: NEVER include task numbers (e.g., T001, T093) in code comments

### Angular Conventions

- Use standalone components (no NgModules)
- Prefer signals over RxJS where appropriate
- Follow Angular style guide for file naming and structure
- Use DaisyUI components for consistent UI
- Lazy load feature modules via routing

### Icon Usage (ng-icons/Heroicons)

**ALWAYS use ng-icons with Heroicons** instead of inline SVGs:

```typescript
import { Component } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEnvelope, heroKey } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIconComponent],
  viewProviders: [provideIcons({ heroEnvelope, heroKey })],
  template: `<ng-icon name="heroEnvelope" class="w-4 h-4 opacity-70" />`,
})
export class LoginComponent {}
```

### Tailwind CSS v4 Conventions

- **NEVER create separate CSS files for components** - All Tailwind/DaisyUI classes MUST be inline in HTML templates
- **NEVER use `@apply` directives** - Use Tailwind utility classes directly in templates instead
- **NEVER use `styleUrls` in components** - Only use inline templates with Tailwind classes
- **DO use DaisyUI component classes** - btn, card, modal, badge, alert, etc.
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

### Node.js Conventions

- Use async/await over callbacks
- Implement proper error handling middleware
- Validate input with Zod or similar
- Use dependency injection patterns
- Follow REST API best practices

### Testing Standards

**Testing Philosophy**: Tests are **RECOMMENDED** but not strictly required. Prioritize rapid iteration and MVP delivery over comprehensive test coverage.

**When to Write Tests** (RECOMMENDED):
- Unit tests: Test complex business logic in isolation
- Integration tests: Test critical API endpoints and data flow
- E2E tests: OPTIONAL - Test critical user journeys when features stabilize

**When Tests Can Be Skipped**:
- Rapid prototyping and MVP development
- UI components with simple presentation logic
- Features that will likely change significantly
- Proof-of-concept implementations

## Architecture Principles

### Platform-Specific Code Isolation

**Capacitor Usage Policy**:
- `apps/web/` contains the PWA with Capacitor support (works on web + mobile)
- `apps/mobile/` is a thin wrapper that serves the `apps/web` build via Capacitor
- Capacitor is OK in `apps/web/` because it works for PWAs
- Shared feature libraries (`libs/features/`) MUST NOT import Capacitor directly
- Use **provider pattern** for platform-specific functionality:
  - Abstract interface: `libs/shared/services/geolocation-provider.ts`
  - Capacitor implementation: `apps/web/providers/capacitor-geolocation.provider.ts`

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

- Store only venue IDs and timestamps (no GPS coordinates)
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
- Rate limiting: 100 req/min authenticated, 20 req/min anonymous

## Key Features

### P0: Authentication & Onboarding
- Self-hosted email/password authentication with JWT tokens
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

### P5: Google Timeline Import
**Overview**: Import brewery and winery visits from Google Timeline JSON exports with intelligent venue matching and async processing for large files.

**Key Features**:
- Three-tier verification (Keyword Matching → Open Brewery DB → Google Search)
- Automatic file size detection (sync <100 places, async ≥100 places)
- Intelligent venue matching (Place ID → Proximity + Fuzzy Name → Create New)
- Duplicate visit detection (15-minute time window deduplication)
- BullMQ job queue with progress tracking
- Import history with full audit trail

**Documentation**: See `specs/001-003-google-timeline-import/` for detailed spec, plan, quickstart, and API contracts.

## Environment Setup

### Prerequisites
- Node.js 22 LTS
- Docker Desktop
- Git

### Configuration

**API Environment** (`apps/api/.env`):

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# API Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration (Self-Hosted Auth)
JWT_SECRET=your-secret-key-min-32-characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Database Configuration (TypeORM)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=blastoise

# Feature Flags (Optional)
ENABLE_GUEST_MODE=false    # Enable anonymous usage without account (mobile only)
ENABLE_MAGIC_LINK=false    # Enable passwordless login via email
```

**Web/Mobile Environment** (`apps/web/.env` or `apps/mobile/.env`):

```env
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

## Production Architecture

### Frontend Stack
- Angular 20+ with standalone components and signals
- Tailwind CSS 4.x + DaisyUI for styling (inline classes only)
- Leaflet 1.9+ for interactive maps with marker clustering
- Capacitor 7+ for native mobile features (iOS/Android)
- Service Workers for offline support and background sync
- IndexedDB for local storage with 9 optimized indexes

### Backend Stack
- NestJS 10.x REST API with TypeScript
- TypeORM 0.3.x with PostgreSQL 15+
- Self-hosted JWT authentication with bcrypt password hashing
- Redis 7+ for geospatial indexing and caching
- Helmet for security headers (CSP, HSTS, XSS protection)
- Sentry for error tracking and monitoring
- Rate limiting: 100/min authenticated, 20/min anonymous

### Security Features
- Privacy-first: No GPS coordinates stored, only venue IDs
- End-to-end encryption for local storage
- Content Security Policy with strict directives
- CORS with whitelist-only origins
- JWT-based authentication with refresh tokens

### Monitoring & Observability
- Sentry error tracking with context capture
- API metrics: response times, error rates, slow requests
- Health checks: /health, /health/db, /health/redis
- Visit detection success rate tracking
- Error rate alerting (5% threshold triggers)

### Caching Strategy
- **Frontend**: IndexedDB with 9 indexes for fast queries
- **HTTP**: Cache-Control headers (1-5min TTL)
- **Backend**: Redis geospatial index + popular regions cache
- **Cache warming**: Script for 10 major metro areas

### Accessibility
- WCAG 2.1 AA compliant
- Full keyboard navigation
- Screen reader support (VoiceOver, TalkBack compatible)
- ARIA labels on all interactive elements
- Semantic HTML with proper roles

### Deployment Targets
- **API**: Vercel/Railway/Fly.io (Docker container)
- **Web**: Vercel/Netlify (static PWA)
- **Mobile**: App Store & Google Play (Capacitor builds)
- **Database**: Railway/Fly.io PostgreSQL or managed service (Neon, Render)
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

## Recent Changes
- 004-self-hosted-auth: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
