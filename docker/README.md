# Docker Infrastructure

This directory contains the Docker Compose configuration for running the full Blastoise stack locally and deploying to Railway.

## 🚀 Quick Start

### 1. Setup Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

**⚠️ IMPORTANT:** The `.env.example` file contains **demo credentials** that are **NOT secure** for production use.

### 2. For Local Development

The default values in `.env.example` are fine for local development:
- Default database password: `postgres`
- Demo JWT secrets from Supabase (publicly available)
- Demo API keys (safe for local testing)

```bash
# Just copy and use
cp .env.example .env
docker-compose up -d
```

### 3. For Production (Railway/Cloud)

**🔐 CRITICAL: Generate new secrets before deploying to production!**

#### Required Changes in `.env`:

1. **Database Password** - Change from default:
   ```env
   POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>
   ```

2. **JWT Secret** - Generate a new 32+ character secret:
   ```env
   JWT_SECRET=<YOUR_RANDOM_SECRET_AT_LEAST_32_CHARS>
   ```

3. **Generate New Supabase Keys** - Create new JWT tokens:

   Visit https://supabase.com/docs/guides/self-hosting#api-keys or use this:

   ```bash
   # Install jwt-cli: https://github.com/mike-engel/jwt-cli

   # Generate ANON key (public, read-only access)
   jwt encode --secret="YOUR_JWT_SECRET" --exp="+10 years" '{"role":"anon","iss":"supabase"}'

   # Generate SERVICE_ROLE key (admin access, keep secret!)
   jwt encode --secret="YOUR_JWT_SECRET" --exp="+10 years" '{"role":"service_role","iss":"supabase"}'
   ```

   Update in `.env`:
   ```env
   ANON_KEY=<YOUR_NEW_ANON_KEY>
   SERVICE_ROLE_KEY=<YOUR_NEW_SERVICE_ROLE_KEY>
   ```

4. **Update kong.yml** - Replace the hardcoded demo keys:

   In `kong.yml`, update lines 96 and 99 with your new keys:
   ```yaml
   consumers:
     - username: anon
       keyauth_credentials:
         - key: <YOUR_NEW_ANON_KEY>
     - username: service_role
       keyauth_credentials:
         - key: <YOUR_NEW_SERVICE_ROLE_KEY>
   ```

5. **Update Application Environment Variables**:

   Update `apps/api/.env`, `apps/web/.env`, and `apps/mobile/.env` with production URLs and keys.

## 📦 What's Included

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| Kong | kong:2.8.1 | 8000 | API Gateway (main entry point) |
| Postgres | supabase/postgres | 5432 | Database with auth & storage schemas |
| PostgREST | postgrest | 3001 | Auto-generated REST API |
| GoTrue | supabase/gotrue | 9999 | Authentication service |
| Storage | supabase/storage-api | 5000 | File storage |
| Realtime | supabase/realtime | 4000 | WebSocket subscriptions |
| Redis | redis:7-alpine | 6379 | Geospatial indexing & caching |

## 🔧 Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker logs blastoise-postgres -f

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Restart a service
docker-compose restart postgres

# Check status
docker-compose ps
```

## 🗄️ Database Migrations

Migrations are in `../supabase/migrations/`. Apply them with:

```bash
# Apply all migrations
for file in ../supabase/migrations/*.sql; do
  echo "Applying $(basename $file)..."
  docker exec -i blastoise-postgres psql -U postgres -d postgres < "$file"
done
```

## 🔐 Security Best Practices

### ✅ What's Safe to Commit:
- `docker-compose.yml` - Uses environment variable substitution
- `kong.yml` - Contains only demo keys (publicly available)
- `.env.example` - Template without real secrets

### ❌ What's Ignored (Never Commit):
- `.env` - Contains actual secrets (in `.gitignore`)

### 🛡️ Production Checklist:

- [ ] Generate new `JWT_SECRET` (32+ characters)
- [ ] Change `POSTGRES_PASSWORD` from default
- [ ] Generate new `ANON_KEY` and `SERVICE_ROLE_KEY`
- [ ] Update hardcoded keys in `kong.yml`
- [ ] Set `SITE_URL` to your production domain
- [ ] Configure `API_EXTERNAL_URL` for your deployment
- [ ] Enable SSL/TLS for Kong gateway
- [ ] Set up proper SMTP credentials for emails
- [ ] Review and limit CORS origins in `kong.yml`

## 🚂 Railway Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Supabase docker-compose configuration"
   git push
   ```

2. **Create Railway Project:**
   - Import from GitHub repository
   - Railway auto-detects `docker-compose.yml`

3. **Set Environment Variables in Railway:**
   - Copy from your production `.env`
   - Railway provides service discovery via internal DNS
   - Update `API_EXTERNAL_URL` with Railway public URL

4. **Deploy:**
   - Railway automatically deploys all services
   - Each service gets an internal hostname
   - Kong service gets a public URL

## 📚 Additional Resources

- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Kong Gateway Documentation](https://docs.konghq.com/)
- [Railway Documentation](https://docs.railway.app/)
- [Generate JWT Keys](https://github.com/mike-engel/jwt-cli)
