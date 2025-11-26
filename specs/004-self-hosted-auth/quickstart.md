# Quickstart: Self-Hosted Authentication System

**Feature**: 004-self-hosted-auth
**Date**: 2025-01-18

## Overview

This guide provides step-by-step instructions for implementing and testing the self-hosted NestJS authentication system that replaces Supabase Auth.

---

## Prerequisites

- Node.js 22 LTS installed
- PostgreSQL 15+ running (via Docker or local install)
- Redis 7+ running (for rate limiting in distributed systems)
- Email service configured (SendGrid, AWS SES, or Mailtrap for dev)
- Existing Blastoise project cloned and dependencies installed

---

## Installation

### 1. Install Backend Dependencies

```bash
cd apps/api

# Authentication packages
npm install @nestjs/passport passport passport-jwt @nestjs/jwt bcrypt
npm install @types/passport-jwt @types/bcrypt --save-dev

# TypeORM and PostgreSQL
npm install @nestjs/typeorm typeorm pg

# Rate limiting
npm install @nestjs/throttler @nestjs/throttler-redis-storage ioredis
```

### 2. Install Frontend Dependencies

```bash
cd apps/web

# JWT decoding (no Supabase SDK needed)
npm install jwt-decode

# Remove Supabase dependency (after migration)
# npm uninstall @supabase/supabase-js
```

---

## Backend Configuration

### 1. Environment Variables

Create or update `apps/api/.env`:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/blastoise
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=blastoise_user
DATABASE_PASSWORD=secure_password
DATABASE_NAME=blastoise

# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-minimum-32-characters-long
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Redis Configuration (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@blastoise.app

# Application
NODE_ENV=development
PORT=3000
```

### 2. Generate Secure JWT Secret

```bash
# Generate a cryptographically random secret (32+ bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy output to JWT_SECRET in .env
```

### 3. TypeORM Configuration

Update `apps/api/src/main.ts` or create `apps/api/src/database/typeorm.config.ts`:

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, RefreshToken, PasswordResetToken],
  synchronize: false, // NEVER true in production
  migrations: ['dist/migrations/*.js'],
  migrationsRun: true,
  logging: process.env.NODE_ENV === 'development',
};
```

### 4. Database Migration

```bash
cd apps/api

# Generate initial migration
npx typeorm migration:generate -n CreateAuthTables

# Run migrations
npx typeorm migration:run

# Verify tables created
psql -U blastoise_user -d blastoise -c "\dt"
# Should show: users, refresh_tokens, password_reset_tokens
```

---

## Backend Implementation

### 1. Create Auth Module

```bash
cd apps/api/src

# Generate module, service, controller
npx nest g module auth
npx nest g service auth
npx nest g controller auth
```

File structure:
```
apps/api/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── public.decorator.ts
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       ├── forgot-password.dto.ts
│       └── reset-password.dto.ts
├── entities/
│   ├── user.entity.ts
│   ├── refresh-token.entity.ts
│   └── password-reset-token.entity.ts
└── migrations/
    └── 1705568400000-CreateAuthTables.ts
```

### 2. Key Implementation Files

**JWT Strategy** (`auth/strategies/jwt.strategy.ts`):
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return { userId: payload.user_id, email: payload.email };
  }
}
```

**JWT Auth Guard** (`auth/guards/jwt-auth.guard.ts`):
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

**Public Decorator** (`auth/guards/public.decorator.ts`):
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 3. Register Guard Globally

Update `apps/api/src/main.ts`:
```typescript
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

---

## Frontend Implementation

### 1. Update Auth Service

Replace Supabase calls in `libs/features/auth/src/lib/services/auth.ts`:

**Before** (Supabase):
```typescript
async signInWithPassword(email: string, password: string) {
  const { error } = await this.supabase.auth.signInWithPassword({ email, password });
  // ...
}
```

**After** (HttpClient):
```typescript
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

private readonly http = inject(HttpClient);
private readonly apiUrl = environment.apiBaseUrl;

signInWithPassword(email: string, password: string): Observable<AuthResponse> {
  return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
    email,
    password
  }).pipe(
    tap(response => {
      this.accessToken = response.access_token;
      this.authState.setCurrentUser(response.user);
      this.authState.setSession({ /* session data */ });
    })
  );
}
```

### 2. Create HTTP Interceptors

**Token Attachment Interceptor** (`apps/web/src/app/auth/interceptors/token.interceptor.ts`):
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@blastoise/features/auth';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
```

**Token Refresh Interceptor** (`apps/web/src/app/auth/interceptors/refresh.interceptor.ts`):
```typescript
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@blastoise/features/auth';
import { catchError, switchMap, throwError } from 'rxjs';

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const token = authService.getAccessToken();
            const clonedReq = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            });
            return next(clonedReq);
          }),
          catchError(refreshError => {
            authService.signOut();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
```

### 3. Register Interceptors

Update `apps/web/src/main.ts`:
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './app/auth/interceptors/token.interceptor';
import { refreshInterceptor } from './app/auth/interceptors/refresh.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withInterceptors([tokenInterceptor, refreshInterceptor])
    )
  ]
});
```

---

## Testing

### 1. Start Development Servers

```bash
# Terminal 1: Start PostgreSQL and Redis (if using Docker)
cd docker
docker-compose up -d postgres redis

# Terminal 2: Start API
cd apps/api
npm run start:dev

# Terminal 3: Start Web App
cd apps/web
npm run start
```

### 2. Manual API Testing with cURL

**Register**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}' \
  -v
# Look for Set-Cookie header with refreshToken
# Copy access_token from response
```

**Login**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}' \
  -v
```

**Access Protected Route**:
```bash
export ACCESS_TOKEN="eyJhbGc..."

curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Refresh Token**:
```bash
export REFRESH_TOKEN="eyJhbGc..."

curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Cookie: refreshToken=$REFRESH_TOKEN"
```

**Logout**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Cookie: refreshToken=$REFRESH_TOKEN"
```

### 3. Frontend Testing

1. Open browser to `http://localhost:4200`
2. Open DevTools Network tab
3. Click "Sign Up" and create account
4. Verify:
   - POST to `/auth/register` returns 201
   - `Set-Cookie` header contains `refreshToken` with `HttpOnly` flag
   - Response body contains `access_token`
   - Redirected to dashboard
5. Refresh page
6. Verify:
   - New requests include `Authorization: Bearer <token>` header
   - If access token expired, automatic refresh occurs
7. Click "Sign Out"
8. Verify:
   - POST to `/auth/logout` returns 200
   - Refresh token cookie is cleared
   - Redirected to login page

### 4. Password Reset Testing

**Request Reset**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Check email inbox for reset link
```

**Reset Password**:
```bash
# Extract token from email link
export RESET_TOKEN="a1b2c3..."

curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"'$RESET_TOKEN'","new_password":"NewSecurePass456"}'
```

**Verify New Password**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"NewSecurePass456"}'
# Should succeed
```

---

## Database Inspection

### Check User Creation

```bash
psql -U blastoise_user -d blastoise

-- View all users
SELECT id, email, created_at FROM users;

-- Check password is hashed (bcrypt format: $2b$10$...)
SELECT id, email, LEFT(password_hash, 20) as hash_preview FROM users;

-- View active refresh tokens for user
SELECT rt.id, rt.expires_at, rt.revoked_at, rt.created_at
FROM refresh_tokens rt
JOIN users u ON rt.user_id = u.id
WHERE u.email = 'test@example.com';

-- View password reset tokens
SELECT prt.id, prt.expires_at, prt.used, prt.created_at
FROM password_reset_tokens prt
JOIN users u ON prt.user_id = u.id
WHERE u.email = 'test@example.com';
```

---

## Migration from Supabase

### 1. Export Supabase Users

```bash
# Using Supabase service role key
export SUPABASE_SERVICE_KEY="your-service-role-key"
export SUPABASE_PROJECT_ID="your-project-id"

# Export users table
pg_dump "postgresql://postgres:$SUPABASE_SERVICE_KEY@db.$SUPABASE_PROJECT_ID.supabase.co:5432/postgres" \
  -t auth.users \
  -t auth.identities \
  --data-only \
  --column-inserts \
  > supabase_users_export.sql
```

### 2. Transform and Import

```bash
# Create transformation script
cat > transform_users.sql << 'EOF'
INSERT INTO users (id, email, password_hash, created_at, updated_at)
SELECT
  id,
  LOWER(email),
  encrypted_password, -- bcrypt hash (compatible)
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (email) DO NOTHING;
EOF

# Run transformation
psql -U blastoise_user -d blastoise -f transform_users.sql
```

### 3. Verify Migration

```bash
psql -U blastoise_user -d blastoise

-- Count migrated users
SELECT COUNT(*) FROM users;

-- Verify password hashes are bcrypt format
SELECT email, LEFT(password_hash, 7) as hash_prefix
FROM users
LIMIT 5;
-- Should all show: $2a$10$ or $2b$10$
```

---

## Troubleshooting

### Issue: JWT Secret Not Found

**Error**: `JWT_SECRET is not defined`

**Solution**:
```bash
# Verify .env file exists and is loaded
cat apps/api/.env | grep JWT_SECRET

# Ensure ConfigModule is imported in AppModule
```

### Issue: Cannot Connect to Database

**Error**: `Connection terminated unexpectedly`

**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -U blastoise_user -h localhost -d blastoise -c "SELECT 1;"
```

### Issue: Rate Limit Not Working

**Error**: Too many requests not blocked

**Solution**:
```bash
# Check Redis is running (for distributed rate limiting)
docker ps | grep redis

# Test Redis connection
redis-cli -h localhost PING
# Should return: PONG
```

### Issue: Refresh Token Not Sent

**Error**: `refreshToken` cookie not in request

**Solution**:
- Verify `withCredentials: true` in Angular HttpClient
- Check CORS settings allow credentials
- Ensure cookie has `SameSite` and `Secure` flags appropriate for environment

---

## Next Steps

1. **Run Full Test Suite**: `npx nx test api && npx nx test web`
2. **Set Up CI/CD**: Configure automated testing and deployment
3. **Security Audit**: Run OWASP ZAP or similar security scanner
4. **Performance Testing**: Load test auth endpoints with k6 or Artillery
5. **Documentation**: Update API documentation with new auth endpoints
6. **Remove Supabase**: Uninstall `@supabase/supabase-js` after full migration

---

## Reference Links

- [OpenAPI Contract](./contracts/api.openapi.yaml)
- [Data Model](./data-model.md)
- [Research Document](./research.md)
- [Feature Specification](./spec.md)
