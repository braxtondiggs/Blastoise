# Docker Infrastructure

This directory contains the Docker Compose configuration for running Blastoise's infrastructure services locally.

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Start Services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 15** - Primary database on port 5432
- **Redis 7** - Caching and geospatial indexing on port 6379

### 3. Verify Services

```bash
# Check status
docker-compose ps

# Test PostgreSQL connection
docker exec -it blastoise-postgres psql -U postgres -d blastoise -c "SELECT 1;"

# Test Redis connection
docker exec -it blastoise-redis redis-cli PING
```

## Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| Postgres | postgres:15-alpine | 5432 | Primary database (TypeORM) |
| Redis | redis:7-alpine | 6379 | Geospatial indexing & caching |

## Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker logs blastoise-postgres -f

# Stop all services
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v

# Restart a service
docker-compose restart postgres

# Check status
docker-compose ps
```

## Database Migrations

TypeORM handles migrations automatically. See `apps/api/migrations/README.md` for details.

```bash
# Run migrations manually
cd apps/api
npx typeorm migration:run -d src/database/typeorm.config.ts
```

## Security Notes

### What's Safe to Commit:
- `docker-compose.yml` - Uses environment variable substitution
- `.env.example` - Template without secrets

### What's Ignored (Never Commit):
- `.env` - Contains actual configuration (in `.gitignore`)

## Production Deployment

For production, use managed services:

- **PostgreSQL**: Neon, Railway, Render, or AWS RDS
- **Redis**: Redis Cloud, Upstash, or AWS ElastiCache

See `apps/api/.env.example` for full production configuration options.

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Reset PostgreSQL (WARNING: deletes data)
docker-compose down -v && docker-compose up -d
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps redis

# View Redis logs
docker-compose logs redis

# Test Redis
docker exec -it blastoise-redis redis-cli PING
```

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [TypeORM Migrations](https://typeorm.io/migrations)
