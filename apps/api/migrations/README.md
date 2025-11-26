# Database Migrations

This project uses **TypeORM** for database migrations with PostgreSQL.

## Migration Files Location

TypeORM migrations are auto-generated and stored in: **`apps/api/src/migrations/`**

## Running Migrations

### Using TypeORM CLI (Recommended)

```bash
# Generate a new migration based on entity changes
npx typeorm migration:generate -d apps/api/src/database/typeorm.config.ts -n MigrationName

# Run all pending migrations
npx typeorm migration:run -d apps/api/src/database/typeorm.config.ts

# Revert the last migration
npx typeorm migration:revert -d apps/api/src/database/typeorm.config.ts

# Show all migrations and their status
npx typeorm migration:show -d apps/api/src/database/typeorm.config.ts
```

### Using psql directly (Alternative)

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blastoise"

# Connect to database
psql $DATABASE_URL
```

## Schema Overview

### Tables

- **users** - User accounts with bcrypt-hashed passwords
- **refresh_tokens** - JWT refresh tokens for session management
- **password_reset_tokens** - Secure password reset tokens
- **venues** - Brewery and winery locations with coordinates
- **visits** - User visit records (privacy-first: only venue_id, no GPS)
- **user_preferences** - User settings and notification preferences
- **shared_visits** - Anonymized visit sharing links
- **import_history** - Google Timeline import tracking

### Row-Level Security

Access control is enforced at the application level via JWT authentication:
- **venues**: Public read, authenticated write
- **visits**: Users can only access their own visits
- **user_preferences**: Users can only access their own preferences
- **shared_visits**: Public read (via share link), owner write/delete

### Privacy Features

- No GPS coordinates stored in visits table (only venue_id)
- Timestamps rounded to 15-minute intervals
- Shared visits only expose venue name and date (no time)
- User preferences control data sharing

### Indexes

All tables have appropriate indexes for:
- Primary keys (UUID)
- Foreign key relationships
- Common query patterns (email lookups, token lookups)
- Geospatial lookups (venues)
- Temporal queries (visits by date, token expiration)

## Development

For local development, use Docker Compose to run PostgreSQL and Redis:

```bash
cd docker
docker-compose up -d postgres redis
```

Then configure your `apps/api/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=blastoise
```
