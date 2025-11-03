# Blastoise

> Privacy-first brewery and winery visit tracking with automatic geofencing

A mobile and web application that helps you track and discover brewery and winery visits while maintaining complete privacy and control over your location data.

## Features

- **Automatic Visit Tracking**: Geofence-based detection when you arrive at breweries and wineries
- **Visual Timeline**: Beautiful chronological view of your visit history
- **Venue Discovery**: Interactive map showing nearby venues with proximity search
- **Privacy First**: No GPS coordinates stored—only venue references and rounded timestamps
- **Offline Ready**: Works without internet connection, syncs when online
- **Cross-Platform**: Progressive Web App (PWA) and native iOS/Android apps
- **Anonymized Sharing**: Share visits with friends without revealing your identity

## Tech Stack

**Frontend**
- Angular 20+ (Standalone components, Signals)
- Capacitor 7+ (Native iOS/Android)
- Leaflet (Interactive maps)
- DaisyUI + Tailwind CSS (UI components)

**Backend**
- Node.js 22 + Express 5 (REST API)
- Supabase (Authentication + PostgreSQL)
- Redis 7+ (Geospatial indexing)

**Infrastructure**
- Nx Monorepo (Build orchestration)
- Jest (Testing)
- Docker Compose (Local development)

## Quick Start

### Prerequisites

- Node.js 22 LTS
- Docker Desktop
- Git

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd Blastoise

# Install dependencies
npm install

# Start infrastructure services (Supabase + Redis)
cd docker
cp .env.example .env  # ⚠️  For production: See docker/README.md for security setup
docker-compose up -d
cd ..

# Configure application environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit .env files with your local Supabase credentials (http://localhost:8000)

# Start development servers
npx nx run-many --target=serve --projects=api,web --parallel
```

**Access:**
- Web App: http://localhost:4200
- API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

For detailed setup instructions, see [Quick Start Guide](specs/001-venue-visit-tracker/quickstart.md).

## Project Structure

```text
apps/
├── web/           # Angular PWA for desktop/mobile browsers
├── mobile/        # Capacitor wrapper for iOS/Android
└── api/           # Node.js REST API backend

libs/
├── shared/        # Models, types, utilities
├── ui/            # Reusable UI components
├── features/      # Feature modules (auth, visits, map, sharing, settings)
├── data/          # Data access layer (Supabase, Redis, API clients)
└── workers/       # Background sync and location workers

specs/
└── 001-venue-visit-tracker/  # Complete feature documentation
```

## Development

### Run Tests

```bash
# All tests
npx nx run-many --target=test --all

# Specific project
npx nx test web
npx nx test api

# E2E tests
npx nx e2e web-e2e
```

### Code Quality

```bash
# Lint
npx nx run-many --target=lint --all

# Format
npx nx format:write

# Type check
npx nx run-many --target=type-check --all
```

### Build

```bash
# Production build
npx nx build web --configuration=production
npx nx build api --configuration=production

# Build only affected projects
npx nx affected:build --base=origin/main
```

## Architecture

### Privacy by Design

- **No GPS Coordinates Stored**: Only venue IDs are stored, never raw location data
- **Timestamp Rounding**: All timestamps rounded to 15 minutes to prevent timing attacks
- **On-Device Processing**: Geofence logic runs entirely on the device
- **Optional Authentication**: Anonymous usage supported with local-only storage
- **Row-Level Security**: Supabase RLS ensures users can only access their own data

### Offline-First

- **IndexedDB Storage**: Local visit history with background sync
- **Service Workers**: PWA capabilities for offline web app
- **Cached Venues**: Venue data stored locally to reduce API calls
- **Automatic Retry**: Failed requests queued and retried when online

### Performance Targets

- Visit detection: < 30 seconds after geofence entry/exit
- Timeline/map load: < 3 seconds on 3G networks
- First Contentful Paint: < 1.5 seconds
- Battery usage: < 5% over 8 hours with background tracking
- Bundle size: < 2MB initial load

## Documentation

- **[Feature Specification](specs/001-venue-visit-tracker/spec.md)**: Complete requirements and user stories
- **[Implementation Plan](specs/001-venue-visit-tracker/plan.md)**: Architecture and technical decisions
- **[Data Model](specs/001-venue-visit-tracker/data-model.md)**: Entity definitions and database schemas
- **[API Reference](specs/001-venue-visit-tracker/contracts/api.openapi.yaml)**: OpenAPI specification
- **[API Interactive Docs](http://localhost:3000/api-docs)**: Swagger UI for testing endpoints (development)
- **[Quick Start Guide](specs/001-venue-visit-tracker/quickstart.md)**: 15-minute local setup
- **[Development Guidelines](CLAUDE.md)**: Comprehensive developer documentation
- **[Troubleshooting Guide](docs/troubleshooting.md)**: Common issues and solutions

## Key Features Overview

### P0: Authentication & Onboarding
- Supabase authentication (email/password + magic links)
- Anonymous usage with local-only storage
- Clear location permission education
- Seamless account upgrade flow

### P1: Automatic Visit Detection
- Native geofencing (100-200m radius)
- 10-15 minute dwell time threshold
- Background location monitoring
- Offline visit recording with sync

### P2: Visual Timeline
- Chronological visit history
- Date grouping with statistics
- Infinite scroll with lazy loading
- Search and filter capabilities

### P3: Venue Discovery Map
- Interactive Leaflet map with markers
- Proximity search (1-50km radius)
- Marker clustering for performance
- Venue details with visit history

### P4: Anonymized Sharing
- Generate public share links
- No user identity exposed
- Only venue name and approximate date shared
- Optional expiration dates

## Contributing

1. Follow the [Development Guidelines](CLAUDE.md)
2. Write tests for all new features (required per project constitution)
3. Ensure code passes linting and type checks
4. Update documentation as needed

## Deployment (T255)

### Production Deployment

#### Prerequisites
- Node.js 22 LTS
- Supabase account (https://supabase.com)
- Redis Cloud or Upstash account
- Vercel/Railway/Fly.io account (API)
- Vercel/Netlify account (Web PWA)
- Apple Developer & Google Play accounts (Mobile, optional)

#### Backend Deployment (API)

**1. Setup Database (Supabase)**
```bash
# Create production project at https://supabase.com
# Apply migrations
cd apps/api/migrations
supabase db push

# Configure Row-Level Security policies
supabase db execute --file rls-policies.sql
```

**2. Setup Redis**
```bash
# Option A: Redis Cloud (https://redis.com)
# Option B: Upstash (https://upstash.com)
# Get connection string and configure in environment
```

**3. Deploy API (Vercel Example)**
```bash
# Install Vercel CLI
npm i -g vercel

# Build API
npx nx build api --configuration=production

# Deploy
cd dist/apps/api
vercel --prod

# Configure environment variables in Vercel dashboard:
# SUPABASE_URL=your-production-url
# SUPABASE_SERVICE_KEY=your-service-key
# REDIS_HOST=your-redis-host
# REDIS_PORT=6379
# CORS_ORIGINS=https://your-web-app.com
# NODE_ENV=production
```

**4. Warm Redis Cache**
```bash
# Run cache warming script after deployment
ts-node apps/api/src/scripts/cache-warming.ts
```

#### Frontend Deployment (Web PWA)

**Deploy to Vercel**
```bash
# Build web app
npx nx build web --configuration=production

# Deploy
cd dist/apps/web
vercel --prod

# Configure environment variables:
# SUPABASE_URL=your-production-url
# SUPABASE_ANON_KEY=your-anon-key
# API_BASE_URL=https://your-api.vercel.app/api/v1
```

**Deploy to Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
npx nx build web --configuration=production

# Deploy
cd dist/apps/web/browser
netlify deploy --prod
```

#### Mobile Deployment (iOS/Android)

**1. Build Capacitor Apps**
```bash
# iOS
npx nx build mobile --configuration=production
cd apps/mobile
npx cap sync ios
npx cap open ios
# Build in Xcode and submit to App Store

# Android
npx nx build mobile --configuration=production
cd apps/mobile
npx cap sync android
npx cap open android
# Build in Android Studio and submit to Google Play
```

**2. Configure App Store Metadata**
- App name: Blastoise
- Category: Food & Drink / Travel
- Privacy policy: Include location usage explanation
- Screenshots: Include map, timeline, and venue discovery

### Environment Variables

#### API (.env)
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Server
PORT=3000
NODE_ENV=production

# Security
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
JWT_SECRET=your-jwt-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

#### Web/Mobile (.env)
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key

# API
API_BASE_URL=https://your-api.vercel.app/api/v1

# Environment
ENVIRONMENT=production
```

### Post-Deployment Checklist

- [ ] Health checks responding: /health, /health/db, /health/redis
- [ ] CORS configured for production domains
- [ ] SSL certificates active (HTTPS)
- [ ] Supabase RLS policies enabled
- [ ] Redis cache warmed with popular regions
- [ ] Sentry error tracking configured
- [ ] Rate limiting active (100/min auth, 20/min anon)
- [ ] Bundle size < 2MB verified
- [ ] Lighthouse score > 90 (Performance, Accessibility)
- [ ] PWA installable on mobile
- [ ] Offline mode functional
- [ ] Background sync working

### Monitoring

**Health Checks**
```bash
# API health
curl https://your-api.vercel.app/api/v1/health

# Database health
curl https://your-api.vercel.app/api/v1/health/db

# Redis health
curl https://your-api.vercel.app/api/v1/health/redis
```

**Sentry Dashboard**
- Monitor error rates and exceptions
- Set up alerts for > 5% error rate
- Track API response times

**Uptime Monitoring**
- Configure uptime monitors (UptimeRobot, Pingdom)
- Alert on API downtime
- Monitor database connection

### Scaling

**API Scaling**
- Horizontal scaling: Deploy multiple API instances
- Load balancer: Configure in Vercel/Railway settings
- Database: Supabase handles scaling automatically
- Redis: Upgrade plan for higher throughput

**Caching**
- CDN: Cloudflare or Fastly for static assets
- Redis cache: Increase memory for more cached regions
- HTTP caching: Already configured with Cache-Control headers

## License

[Your License Here]

---

**Project Status**: ✅ Production-Ready - 269/275 tasks complete (97.8%)

For questions or issues, please open a GitHub issue.
