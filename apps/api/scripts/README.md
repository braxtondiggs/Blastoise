# Venue Data Scripts

Scripts for fetching and seeding venue data from external sources.

## Prerequisites

```bash
# Install dependencies
npm install

# Set environment variables
export DATABASE_HOST="localhost"
export DATABASE_PORT="5432"
export DATABASE_USERNAME="postgres"
export DATABASE_PASSWORD="postgres"
export DATABASE_NAME="blastoise"
# OR use a connection URL:
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/blastoise"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
```

## Data Sources

1. **Open Brewery DB** - https://www.openbrewerydb.org/
   - Free, public API for brewery data
   - Covers primarily US, UK, and some international breweries

2. **OpenStreetMap (Overpass API)** - https://overpass-api.de/
   - Worldwide winery data tagged with `craft=winery`
   - Free, public API with rate limiting

## Usage

### 1. Fetch Venue Data

```bash
# Fetch breweries from Open Brewery DB (~8,000+ breweries)
npx tsx apps/api/scripts/fetch-brewerydb.ts

# Fetch wineries from OpenStreetMap (~2,000+ wineries)
npx tsx apps/api/scripts/fetch-osm-wineries.ts
```

Data will be saved to `apps/api/data/breweries.json` and `apps/api/data/wineries.json`.

### 2. Seed Database

```bash
# Seed PostgreSQL and Redis with venue data
npx tsx apps/api/scripts/seed-venues.ts
```

This script will:
- Insert venues into PostgreSQL `venues` table (with deduplication)
- Add venue coordinates to Redis geospatial index
- Display progress and statistics

### 3. Rebuild Geo Index

If you need to rebuild the Redis geospatial index from existing PostgreSQL data:

```bash
npx tsx apps/api/scripts/rebuild-geo-index.ts
```

## Data Pipeline

```
┌─────────────────┐     ┌──────────────────┐
│ Open Brewery DB │────→│ breweries.json   │
└─────────────────┘     └──────────────────┘
                                │
                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│ OSM Overpass    │────→│ wineries.json    │────→│ seed-venues  │
└─────────────────┘     └──────────────────┘     └──────────────┘
                                                        │
                                                        ▼
                        ┌────────────────────────────────────────┐
                        │  PostgreSQL (venues table)             │
                        │  Redis (geospatial index)              │
                        └────────────────────────────────────────┘
```

## Rate Limiting

- **Open Brewery DB**: 1 request/second (self-imposed)
- **Overpass API**: Timeout set to 300 seconds for large queries
- Both APIs are free but please be respectful of rate limits

## Output Files

- `apps/api/data/breweries.json` - Raw brewery data
- `apps/api/data/wineries.json` - Raw winery data

These files are gitignored and should not be committed.

## Manual Venue Addition

Users can also manually add venues through the API once authenticated.

## Future Enhancements

- Incremental updates (fetch only new/updated venues)
- Additional data sources (Google Places, Yelp, etc.)
- Venue verification and quality scoring
- User-submitted venue corrections
