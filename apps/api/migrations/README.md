# Database Migrations

This directory contains SQL migration files for the Blastoise Postgres database.

## Migration Files

1. **001_create_venues_table.sql** - Venues table with geolocation data
2. **002_create_visits_table.sql** - User visits (privacy-first design)
3. **003_create_user_preferences_table.sql** - User settings and preferences
4. **004_create_shared_visits_table.sql** - Anonymized visit sharing
5. **005_create_analytics_tables.sql** - Optional analytics (opt-in only)

## Running Migrations

### Using Supabase CLI

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref <your-project-ref>

# Apply migrations
npx supabase db push

# Or run individual migrations
psql $DATABASE_URL -f apps/api/migrations/001_create_venues_table.sql
```

### Using psql directly

```bash
export DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"

psql $DATABASE_URL -f apps/api/migrations/001_create_venues_table.sql
psql $DATABASE_URL -f apps/api/migrations/002_create_visits_table.sql
psql $DATABASE_URL -f apps/api/migrations/003_create_user_preferences_table.sql
psql $DATABASE_URL -f apps/api/migrations/004_create_shared_visits_table.sql
psql $DATABASE_URL -f apps/api/migrations/005_create_analytics_tables.sql
```

## Schema Overview

### Row-Level Security (RLS)

All tables have RLS enabled:
- **venues**: Public read, authenticated write
- **visits**: Users can only access their own visits
- **user_preferences**: Users can only access their own preferences
- **shared_visits**: Public read (if not expired), owner write/delete
- **visit_stats**: Users can only access their own stats

### Privacy Features

- No GPS coordinates stored in visits table (only venue_id)
- Timestamps rounded to 15-minute intervals
- Shared visits only expose venue name and date (no time)
- User preferences control data sharing

### Indexes

All tables have appropriate indexes for:
- Foreign key relationships
- Common query patterns
- Geospatial lookups (venues)
- Temporal queries (visits by date)

## Development

For local development, use Docker Compose to run Postgres:

```bash
cd docker
docker-compose up -d postgres
```

Then run migrations against `postgresql://postgres:postgres@localhost:5432/postgres`
