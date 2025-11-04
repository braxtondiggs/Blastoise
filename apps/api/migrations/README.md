# Database Migrations

**Note:** Migration files have been moved to `supabase/migrations/` to use Supabase CLI tooling.

## Migration Files Location

All SQL migration files are now in: **`supabase/migrations/`**

1. **001_create_venues_table.sql** - Venues table with geolocation data
2. **002_create_visits_table.sql** - User visits (privacy-first design)
3. **003_create_user_preferences_table.sql** - User settings and preferences
4. **004_create_shared_visits_table.sql** - Anonymized visit sharing
5. **005_create_analytics_tables.sql** - Optional analytics (opt-in only)

## Running Migrations

### Using Supabase CLI (Recommended)

```bash
# Login to Supabase (one-time)
npx supabase login

# Link to your cloud project (one-time)
npx supabase link --project-ref <your-project-ref>

# Push all pending migrations
npx supabase db push

# Reset database (WARNING: destroys data)
npx supabase db reset
```

### Using psql directly (Alternative)

```bash
export DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"

psql $DATABASE_URL -f supabase/migrations/001_create_venues_table.sql
psql $DATABASE_URL -f supabase/migrations/002_create_visits_table.sql
psql $DATABASE_URL -f supabase/migrations/003_create_user_preferences_table.sql
psql $DATABASE_URL -f supabase/migrations/004_create_shared_visits_table.sql
psql $DATABASE_URL -f supabase/migrations/005_create_analytics_tables.sql
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
