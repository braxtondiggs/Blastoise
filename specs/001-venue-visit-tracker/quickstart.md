# Quickstart: Venue Visit Tracker

**Purpose**: Get the application running locally in under 15 minutes
**Last Updated**: 2025-10-28
**Prerequisites**: Node.js 22+, Docker Desktop, Git

## Quick Start (TL;DR)

```bash
# Clone and install
git clone <repo-url>
cd Blastoise
npm install

# Start infrastructure (Redis, Postgres)
docker-compose up -d

# Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
# Edit .env files with your Supabase credentials

# Start development servers
npx nx run-many --target=serve --projects=api,web --parallel

# Or start mobile app instead of web:
# npx nx run-many --target=serve --projects=api,mobile --parallel

# Access:
# - Web app (PWA): http://localhost:4200
# - Mobile app: http://localhost:4201 (if running mobile)
# - API: http://localhost:3000
# - API docs: http://localhost:3000/api-docs
```

---

## Detailed Setup

### 1. Prerequisites

**Install Required Tools**:
- Node.js 22 LTS: https://nodejs.org/
- Docker Desktop: https://www.docker.com/products/docker-desktop
- Git: https://git-scm.com/

**Verify Installation**:
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
docker --version
```

---

### 2. Clone Repository

```bash
git clone <repo-url>
cd Blastoise
```

---

### 3. Install Dependencies

```bash
npm install
```

This installs all workspace dependencies using npm workspaces. Nx will also be installed globally in the project.

---

### 4. Start Infrastructure Services

The application requires Redis and PostgreSQL. These run in Docker containers for local development.

```bash
# Start Redis and Postgres in background
cd docker
docker-compose up -d

# Verify containers are running
docker ps
# Should show: redis, postgres containers
```

**Container Details**:
- Redis: `localhost:6379`
- Postgres: `localhost:5432` (managed by Supabase)

---

### 5. Configure Supabase

Supabase provides authentication and managed Postgres. You need a Supabase project.

**Create Supabase Project** (if not done):
1. Go to https://supabase.com
2. Create new project
3. Note your Project URL and API keys

**Configure Environment Variables**:

```bash
# API configuration
cp apps/api/.env.example apps/api/.env

# Web app configuration
cp apps/web/.env.example apps/web/.env

# Mobile app configuration (optional, for native builds)
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/api/.env`:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# API Keys (optional)
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
BREWERY_DB_API_KEY=  # Optional: Open Brewery DB doesn't require key
```

Edit `apps/web/.env` (or `apps/mobile/.env` for native):
```env
# Supabase (public keys only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key

# API
API_BASE_URL=http://localhost:3000/api/v1

# Environment
ENVIRONMENT=development
```

---

### 6. Initialize Database Schema

Run migrations to create tables in Supabase Postgres:

```bash
# Connect to Supabase and run migrations
npx nx run api:migrate

# Or manually via Supabase dashboard:
# 1. Go to SQL Editor in Supabase dashboard
# 2. Copy contents of apps/api/migrations/*.sql
# 3. Execute in order
```

**Verify Schema**:
- Log into Supabase dashboard
- Go to Table Editor
- Verify tables exist: `venues`, `visits`, `shared_visits`, `user_preferences`

---

### 7. Seed Venue Data (Optional)

Populate the database with sample brewery/winery data:

```bash
# Run venue sync script
npx nx run api:seed-venues

# This fetches venues from OpenStreetMap and Open Brewery DB
# Stores in Postgres and Redis
```

**Manual Verification**:
```bash
# Check Redis has venues
docker exec -it app-redis redis-cli
> ZCOUNT venues:all -inf +inf
# Should show number of indexed venues
```

---

### 8. Start Development Servers

Start the API and frontend (web or mobile) in parallel:

```bash
# Option 1: Web PWA + API (recommended for initial development)
npx nx run-many --target=serve --projects=api,web --parallel

# Option 2: Mobile app + API (for native testing)
npx nx run-many --target=serve --projects=api,mobile --parallel

# Or run individually:
# Terminal 1: API server
npx nx serve api

# Terminal 2: Web app
npx nx serve web

# Terminal 3: Mobile app (optional)
npx nx serve mobile
```

**Access Applications**:
- Web App (PWA): http://localhost:4200
- Mobile App: http://localhost:4201 (if running separately)
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs (Swagger UI)

---

### 9. Configure Mobile Capabilities (iOS/Android)

For native mobile builds (optional, not required for web testing):

**iOS Setup**:
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
# Opens Xcode - configure signing and run on simulator
```

**Android Setup**:
```bash
npx cap add android
npx cap sync android
npx cap open android
# Opens Android Studio - run on emulator
```

**Location Permissions** (required for visit tracking):
- iOS: Add location usage descriptions in `ios/App/App/Info.plist`
- Android: Add location permissions in `android/app/src/main/AndroidManifest.xml`

---

### 10. Test the Application

**Web PWA Test** (in browser with service workers):
1. Open http://localhost:4200 in Chrome/Firefox
2. Create account (Supabase Auth magic link)
3. Grant location permission when prompted
4. View map with nearby venues (requires geolocation)
5. Test offline mode by toggling network in DevTools

**Mobile Emulator Test** (full geofence simulation):
1. Open app in Xcode (iOS) or Android Studio (Android)
2. Enable simulated location in debug settings
3. Set location near a venue (use GPX file or manual coordinates)
4. App should detect arrival and create visit

**API Test**:
```bash
# Get nearby venues
curl -X GET "http://localhost:3000/api/v1/venues/nearby?lat=37.7749&lng=-122.4194&radius_km=5" \
  -H "Authorization: Bearer <your-jwt-token>"

# Health check
curl http://localhost:3000/health
```

---

## Common Issues

### Port Already in Use

```bash
# Find and kill process using port 4200 or 3000
lsof -ti:4200 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Redis Connection Failed

```bash
# Restart Redis container
docker restart app-redis

# Check Redis logs
docker logs app-redis
```

### Supabase Authentication Failed

- Verify `SUPABASE_URL` and API keys in `.env` files
- Check Supabase project is not paused (free tier auto-pauses after inactivity)
- Test connection: `curl https://your-project.supabase.co/rest/v1/`

### Venue Data Not Loading

```bash
# Re-run venue sync
npx nx run api:seed-venues

# Check Postgres venues table
# Supabase dashboard > Table Editor > venues
```

### Geolocation Not Working in Browser

- Use Chrome/Firefox (best geolocation support)
- Enable location permission when browser prompts
- If behind VPN, geolocation may be inaccurate
- Use browser DevTools to simulate location: DevTools > Sensors > Location

---

## Development Workflow

### Running Tests

```bash
# Run all tests (Jest for unit tests)
npx nx run-many --target=test --all

# Test specific project
npx nx test web         # Jest tests for web app
npx nx test mobile      # Jest tests for mobile app
npx nx test api         # Jest tests for Node.js backend

# Test feature libraries
npx nx test features-visits   # Visit tracking feature
npx nx test features-map      # Map feature
npx nx test data              # Data access layer

# Watch mode during development
npx nx test web --watch

# Coverage report
npx nx test web --coverage

# E2E tests with Playwright (requires apps running)
npx nx e2e web-e2e
npx nx e2e api-e2e
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

### Building for Production

```bash
# Build web PWA
npx nx build web --configuration=production

# Build mobile app
npx nx build mobile --configuration=production

# Build API
npx nx build api --configuration=production

# Build Docker image
docker build -f docker/api.Dockerfile -t venue-tracker-api:latest .

# Build affected projects only (efficient CI/CD)
npx nx affected:build --base=origin/main
```

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│  Frontend (2 deployment targets)                            │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │  apps/web (PWA)      │    │  apps/mobile         │      │
│  │  - Service Workers   │    │  - Capacitor iOS     │      │
│  │  - Browser Geoloc    │    │  - Capacitor Android │      │
│  │  - IndexedDB         │    │  - Native Geofence   │      │
│  └──────────────────────┘    └──────────────────────┘      │
│             │                            │                   │
│             └────────────┬───────────────┘                   │
│                          │                                   │
│         Uses: libs/features, libs/ui, libs/data, libs/shared│
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTP / REST API
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Backend (apps/api - Node.js + Express 5)                    │
│                                                               │
│  Uses: libs/data (Redis/Supabase repos), libs/shared         │
│  - Venue proximity search (Redis GEORADIUS)                  │
│  - Visit sync (Supabase Postgres)                            │
│  - Anonymized sharing                                        │
│  - Auth middleware (Supabase JWT)                            │
└─────────┬─────────────────────────┬───────────────────────────┘
          │                         │
          │                         │
┌─────────▼─────────┐    ┌─────────▼─────────┐
│   Supabase        │    │    Redis          │
│   - Postgres 15+  │    │    - Geospatial   │
│   - Auth (JWT)    │    │    - Cache        │
│   - Row-Level     │    │    - Pub/Sub      │
│     Security      │    │    - Session      │
└───────────────────┘    └───────────────────┘

Nx Libraries (libs/*):
├── shared/       → Models, types, utils (all apps)
├── ui/           → DaisyUI components (web + mobile)
├── features/     → Feature modules (auth, visits, map, sharing, settings)
├── data/         → Data access (Supabase, Redis, API clients, IndexedDB)
└── workers/      → Background sync, location workers
```

---

## Next Steps

1. **Read the Spec**: `specs/001-venue-visit-tracker/spec.md`
2. **Review Data Model**: `specs/001-venue-visit-tracker/data-model.md`
3. **Explore API Contracts**: `specs/001-venue-visit-tracker/contracts/api.openapi.yaml`
4. **Understand Nx Structure**: Review `specs/001-venue-visit-tracker/plan.md` Project Structure
5. **Implement User Story 1**: Automatic visit detection (P1)
   - Feature lib: `libs/features/visits/` (geofence, visit-tracker services)
   - Data layer: `libs/data/local/` (IndexedDB for offline storage)
   - UI components: `libs/features/visits/components/` (timeline, visit-card)
   - Integrate in: `apps/web/` or `apps/mobile/`

---

## Support

- **Issues**: File bug reports in GitHub Issues
- **Documentation**: See `/docs` folder for detailed guides
- **API Reference**: http://localhost:3000/api-docs when server is running

---

## License

[Your License Here]
