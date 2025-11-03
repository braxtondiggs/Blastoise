# Research: Venue Visit Tracker

**Phase**: 0 - Outline & Research
**Date**: 2025-10-28
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Research Areas

### 1. Capacitor Geolocation & Background Tracking

**Decision**: Use `@capacitor/geolocation` with background location permissions and geofence monitoring

**Rationale**:
- Capacitor provides unified API across iOS, Android, and web
- Native geofence support via plugins (`@capacitor-community/background-geolocation`)
- Battery-efficient implementation using native OS geofencing (iOS CLLocationManager, Android Geofencing API)
- Supports background execution without keeping app in foreground

**Best Practices**:
- Request "Always Allow" location permission with clear user education
- Use significant location changes (iOS) / geofence transitions (Android) rather than continuous polling
- Set geofence radius to 100-150m for typical brewery/winery venues
- Implement exponential backoff for location updates when battery is low
- Store pending visits locally when offline, sync when network available

**Alternatives Considered**:
- Pure web Geolocation API: Rejected - no background support, requires app open
- Native development: Rejected - would lose code sharing benefits of Nx monorepo
- Third-party tracking SDK: Rejected - privacy concerns, additional dependencies

**Implementation Notes**:
- iOS requires `NSLocationAlwaysUsageDescription` and `NSLocationWhenInUseUsageDescription` in Info.plist
- Android requires `ACCESS_FINE_LOCATION` and `ACCESS_BACKGROUND_LOCATION` permissions
- Use Capacitor's lifecycle hooks to handle app suspend/resume for visit boundary detection

### 2. Privacy-First Geofence Architecture

**Decision**: Process all geofence logic on-device; transmit only sanitized visit events (venue ID + rounded timestamp)

**Rationale**:
- Constitutional requirement: no precise GPS coordinates stored or transmitted
- Minimizes attack surface - server never sees raw location data
- Reduces bandwidth and server processing costs
- Enables offline visit tracking

**Best Practices**:
- Round timestamps to nearest 15 minutes to prevent timing attacks
- Use venue UUID references instead of coordinates in API calls
- Implement local-first state management (e.g., NgRx with persistence)
- Encrypt local storage using Capacitor SecureStorage plugin
- Clear location data from memory after geofence match

**Alternatives Considered**:
- Server-side geofencing: Rejected - privacy violation, requires constant location streaming
- Coarse location only: Rejected - insufficient accuracy for geofence detection
- Anonymized GPS hashing: Rejected - still reveals location patterns

**Implementation Notes**:
- Create `libs/geofence-utils` with stateless functions for testing
- Use Web Crypto API for timestamp obfuscation
- Implement geofence "dwell time" filter (10-15 min minimum) to reduce false positives

### 3. Offline-First Data Synchronization

**Decision**: Use IndexedDB (via Angular service) for local visit storage with periodic background sync to Supabase

**Rationale**:
- IndexedDB provides large storage quota (50MB+) for visit history
- Works seamlessly offline with no code changes
- Supports transactions and indexes for efficient queries
- Native browser support, no additional libraries needed

**Best Practices**:
- Store visits with `synced: boolean` flag
- Implement retry logic with exponential backoff for failed syncs
- Use Supabase realtime subscriptions for cross-device sync (optional)
- Conflict resolution: last-write-wins with server timestamp as authority
- Cache venue data (name, address, type) locally to avoid API calls

**Alternatives Considered**:
- LocalStorage: Rejected - 5-10MB limit, no indexing, blocking API
- Supabase offline-first kit: Rejected - still in beta, adds complexity
- PouchDB + CouchDB: Rejected - overkill for simple sync, additional dependency

**Implementation Notes**:
- Use Dexie.js wrapper for IndexedDB (optional, improves DX)
- Implement service worker with Background Sync API for automatic retry
- Monitor `navigator.onLine` event to trigger sync on reconnect

### 4. Leaflet Map Performance & Clustering

**Decision**: Use Leaflet with MarkerCluster plugin and viewport-based loading

**Rationale**:
- Leaflet is lightweight (39KB gzipped) vs MapLibre (180KB) or Mapbox GL (200KB+)
- Excellent mobile performance with touch gesture support
- MarkerCluster reduces DOM nodes for 1000+ venue markers
- No API key required for OpenStreetMap tiles
- Strong TypeScript support via `@types/leaflet`

**Best Practices**:
- Load markers only within current viewport + 50% buffer
- Use marker clustering with threshold of 50 markers per cluster
- Implement virtual scrolling for venue list view
- Lazy load map component (route-level code splitting)
- Use vector tiles (PMTiles format) for offline map support

**Alternatives Considered**:
- MapLibre GL: Rejected - larger bundle, WebGL requirements exclude older devices
- Google Maps: Rejected - API key costs, privacy concerns (tracking)
- Mapbox GL: Rejected - expensive, feature overkill for this use case

**Implementation Notes**:
- Configure Leaflet to use OSM Carto tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Respect OSM tile usage policy (cache tiles, display attribution)
- Add accessibility: keyboard navigation for markers, ARIA labels for controls

### 5. Redis Geospatial Indexing for Proximity Queries

**Decision**: Use Redis GEOADD/GEORADIUS commands for fast venue proximity searches

**Rationale**:
- Redis geospatial indexes use sorted sets (O(log N) queries)
- Sub-millisecond response times for radius queries up to 10,000 venues
- Built-in support for haversine distance calculations
- Can store venue metadata as Redis hashes for single-query retrieval

**Best Practices**:
- Index venues by city/region keys (e.g., `venues:san-francisco`) to partition large datasets
- Use GEORADIUSBYMEMBER for "nearby this venue" queries
- Set Redis maxmemory policy to `allkeys-lru` for automatic cache eviction
- Implement cache warming: pre-load popular regions at startup
- Fallback to Postgres PostGIS queries if Redis unavailable

**Alternatives Considered**:
- Postgres PostGIS: Rejected as primary - slower, requires spatial indexes, scaling complexity
- Elasticsearch: Rejected - overkill, resource-heavy for simple proximity queries
- Haversine formula in-app: Rejected - doesn't scale beyond 100s of venues

**Implementation Notes**:
- Store venue data: `GEOADD venues:all <lng> <lat> <venue-id>`
- Query: `GEORADIUS venues:all <lng> <lat> 5000 m WITHDIST COUNT 50`
- Batch load venues from Postgres to Redis on API startup

### 6. OpenStreetMap & Open Brewery DB Integration

**Decision**: Periodic ETL job to fetch brewery/winery data, deduplicate, and cache in Redis + Postgres

**Rationale**:
- OpenStreetMap Overpass API provides rich POI data (free, no API key)
- Open Brewery DB offers curated brewery list with metadata
- Periodic sync (daily) avoids rate limiting and reduces API dependencies
- Allows offline operation (venues cached locally)

**Best Practices**:
- Use Overpass QL to query: `node["amenity"="brewery"]` and `node["amenity"="winery"]`
- Merge results from both sources, deduplicate by name + address similarity
- Store raw data in Postgres, indexed copy in Redis
- Implement admin interface for manual venue corrections/additions
- Respect API rate limits: OSM (1 req/sec), Brewery DB (no stated limit but be respectful)

**Alternatives Considered**:
- Google Places API: Rejected - paid, privacy concerns, terms prohibit data storage
- Yelp API: Rejected - limited free tier, commercial use restrictions
- Foursquare: Rejected - deprecated API, unclear pricing

**Implementation Notes**:
- Schedule ETL with cron job or Node.js scheduler (node-schedule)
- Overpass API query example: `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="brewery"](bbox);out;`
- Store venue schema: id, name, address, lat, lng, source (osm/brewerydb), last_updated

### 7. Supabase Authentication & Row-Level Security

**Decision**: Use Supabase Auth with email/password + magic links; enforce RLS policies for user data isolation

**Rationale**:
- Supabase Auth provides JWT-based sessions with automatic refresh
- Row-Level Security (RLS) ensures users can only access their own visits
- Magic links reduce password fatigue and improve UX
- Built-in email templates for onboarding

**Best Practices**:
- Enable RLS on all tables: `ALTER TABLE visits ENABLE ROW LEVEL SECURITY;`
- Policy: `CREATE POLICY user_visits ON visits FOR ALL USING (auth.uid() = user_id);`
- Use Supabase client in Angular services with automatic token refresh
- Store JWT in secure HTTP-only cookie (not localStorage for security)
- Implement optional anonymous mode (local-only storage, no sync)

**Alternatives Considered**:
- Auth0: Rejected - paid beyond free tier, complex integration
- Firebase Auth: Rejected - vendor lock-in, less control over data
- Custom JWT auth: Rejected - reinventing the wheel, maintenance burden

**Implementation Notes**:
- Configure Supabase email templates for branding consistency
- Set session timeout to 7 days (configurable in Supabase dashboard)
- Use Supabase realtime for optional live visit sharing features

### 8. Jest for Unified Testing (Angular + Node.js)

**Decision**: Use Jest as the unified testing framework for both frontend and backend, replacing Jasmine/Karma

**Rationale**:
- Karma is deprecated and no longer actively maintained
- Jest provides better performance with parallel test execution
- Single testing framework across the entire monorepo reduces context switching
- Better snapshot testing and mocking capabilities
- Native support in Nx for Jest with Angular
- Vitest is an alternative option for Vite-based builds (faster, ESM-native)

**Best Practices**:
- Configure Jest presets for Angular: `@nx/jest/preset`
- Use `ts-jest` for TypeScript support
- Mock Capacitor plugins in unit tests
- Snapshot test React/Angular components
- Use `jest.config.ts` per project for isolation

**Alternatives Considered**:
- Jasmine/Karma: Rejected - Karma deprecated, slower execution, no snapshot testing
- Vitest: Valid alternative - faster startup, ESM-native, but less mature Angular support
- Mocha/Chai: Rejected - more boilerplate, no built-in mocking

**Implementation Notes**:
- Install: `npm install -D jest @nx/jest ts-jest @types/jest`
- Angular preset: `@nx/jest/preset` handles Angular compilation
- Configure in `jest.config.ts` per Nx project
- Use `nx test <project>` to run tests

### 9. DaisyUI + Tailwind CSS for Component Library

**Decision**: Use DaisyUI component library built on Tailwind CSS

**Rationale**:
- DaisyUI provides 50+ accessible components (buttons, cards, modals, etc.)
- Zero JavaScript bundle (pure CSS), minimal overhead
- Full Tailwind customization available (colors, spacing, etc.)
- Strong accessibility: ARIA attributes, keyboard navigation built-in
- Consistent theming across web/mobile

**Best Practices**:
- Use DaisyUI semantic HTML (e.g., `<button class="btn btn-primary">`)
- Customize theme in `tailwind.config.js` to match brand
- Implement dark mode with `data-theme` attribute
- Use Tailwind's responsive prefixes (sm:, md:, lg:)
- Avoid inline styles; use Tailwind utility classes

**Alternatives Considered**:
- Angular Material: Rejected - large bundle size (500KB+), complex theming
- Bootstrap: Rejected - jQuery dependency, less modern utility approach
- Custom CSS: Rejected - time-consuming, accessibility gaps

**Implementation Notes**:
- Install: `npm install daisyui`
- Configure `tailwind.config.js`: `plugins: [require('daisyui')]`
- Set default theme: `daisyui: { themes: ['light', 'dark'] }`

## Summary

All technical unknowns have been resolved. The architecture leverages:
- **Capacitor** for cross-platform geolocation and native capabilities
- **Leaflet** for lightweight, performant maps
- **Redis** for sub-millisecond proximity queries
- **Supabase** for auth, Postgres storage, and realtime sync
- **DaisyUI/Tailwind** for accessible, consistent UI
- **Jest** for unified testing framework (Angular + Node.js)
- **Nx** for monorepo structure and build optimization

No remaining "NEEDS CLARIFICATION" items. Ready to proceed to Phase 1 (Design).
