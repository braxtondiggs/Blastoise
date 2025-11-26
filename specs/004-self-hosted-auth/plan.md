# Implementation Plan: Self-Hosted Authentication System

**Branch**: `004-self-hosted-auth` | **Date**: 2025-01-18 | **Spec**: [spec.md](./spec.md)

## Summary

Replace Supabase Auth with a self-hosted NestJS authentication system using Passport JWT strategy, bcrypt password hashing, and TypeORM for direct PostgreSQL access. This migration provides full control over authentication logic, eliminates external authentication dependencies, and maintains backward compatibility with existing user accounts through bcrypt hash portability. The frontend will replace the @supabase/supabase-js SDK with standard Angular HttpClient, using HTTP interceptors for token attachment and automatic refresh.

**Key Benefits**:
- Full control over authentication flows and security policies
- No vendor lock-in or external API dependencies
- Direct PostgreSQL access via TypeORM instead of Supabase client
- Industry-standard JWT + bcrypt authentication
- Seamless user migration (bcrypt hashes are portable)
- Enhanced security with httpOnly cookies for refresh tokens

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 22 LTS for backend, Angular 20+ for frontend)

**Primary Dependencies**:
- **Backend**: @nestjs/passport, @nestjs/jwt, passport-jwt, bcrypt, @nestjs/typeorm, typeorm, pg, @nestjs/throttler
- **Frontend**: @angular/common/http (HttpClient), jwt-decode
- **Removed**: @supabase/supabase-js (replaced)

**Storage**: PostgreSQL 15+ (existing database, new auth tables via TypeORM migrations)

**Testing**: Jest for backend unit/integration tests, Playwright for frontend E2E (tests RECOMMENDED but not required)

**Target Platform**:
- Backend: Node.js 22 LTS server (Linux/Docker)
- Frontend: Angular 20+ PWA (web browsers) + Capacitor 7+ (iOS/Android)

**Project Type**: Web application (monorepo with separate backend API and frontend web app)

**Performance Goals**:
- Login/registration: < 3 seconds total (including bcrypt hashing)
- Token refresh: < 500ms
- JWT validation overhead: < 5ms per request
- Bcrypt hashing: 200-500ms (10 rounds)

**Constraints**:
- Zero user data loss during Supabase migration
- Maintain anonymous mode functionality
- No forced re-authentication for existing users
- Bcrypt work factor: 10-12 rounds (balance security/performance)
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days

**Scale/Scope**:
- Support existing Supabase user base (estimated small scale, <1000 users)
- Handle 100 concurrent authentication requests
- Rate limiting: 3-5 login attempts/minute per IP
- 6 REST API endpoints for authentication
- 3 TypeORM entities (User, RefreshToken, PasswordResetToken)
- Frontend: Update existing AuthService, add 2 HTTP interceptors

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality & Structure ✓ PASS

**Compliance**: All code will follow Nx workspace conventions, TypeScript best practices, and established linting rules. No task numbers will be included in code comments. Business logic will be properly separated into service layers, with clear module boundaries between auth, entities, and DTOs.

**Actions**:
- Follow NestJS module organization (auth module with services, controllers, strategies, guards, DTOs)
- Angular standalone components with signals for reactive auth state
- TypeORM entities with service-layer business logic (no entity hooks)
- Comprehensive ESLint and Prettier compliance

---

### II. Testing Excellence ⚠️ NOTED (Non-Blocking)

**Status**: Tests are RECOMMENDED but not required for initial implementation.

**Recommendation**: Given the security-critical nature of authentication, comprehensive testing is strongly encouraged:
- Unit tests for AuthService (login, registration, token validation, password hashing)
- Integration tests for auth endpoints (E2E API testing)
- Contract tests for JWT validation and token refresh flows
- E2E tests for frontend login/logout flows (Playwright)

**Note**: Tests can be added progressively after MVP is functional. TDD approach is encouraged but not mandatory.

---

### III. User Experience Consistency ✓ PASS

**Compliance**: Authentication flows will maintain consistent UX across web and mobile platforms. All auth forms will use DaisyUI components with inline Tailwind CSS classes. Form validation errors will be displayed clearly with accessibility support (ARIA labels, keyboard navigation). Loading states will use DaisyUI spinner components.

**Actions**:
- Reuse existing login/registration UI components from 002-auth-ui spec
- Ensure WCAG 2.1 AA accessibility (already implemented in auth UI components)
- Responsive design for all screen sizes (320px+)
- Clear error messages (no user enumeration: "Invalid email or password" for all login failures)

---

### IV. Performance Optimization ✓ PASS

**Compliance**: Authentication performance meets constitutional requirements:
- Login < 3 seconds (bcrypt hashing ~250ms + database query ~50ms + JWT generation ~5ms)
- Token validation < 5ms overhead per request (stateless JWT validation)
- Database indexes on email field for fast lookups
- Rate limiting prevents brute force without impacting legitimate users

**Actions**:
- Use bcrypt async API to prevent event loop blocking
- Implement database indexes on frequently queried fields (email, token_hash, expires_at)
- Use Redis for distributed rate limiting (low latency)
- HTTP-only cookies for refresh tokens (no client-side overhead)

---

### V. Privacy & Ethical Data Handling ✓ PASS

**Compliance**: Authentication system adheres to privacy-first principles:
- Passwords never stored in plaintext (bcrypt with 10+ rounds)
- Password hashes never logged or exposed in API responses
- Tokens transmitted only over HTTPS with Secure flag
- Refresh tokens stored in httpOnly cookies (XSS protection)
- User enumeration prevention (generic error messages)
- Audit logging for authentication failures (security monitoring)

**Actions**:
- Never log passwords or password hashes
- Use generic "Invalid email or password" for all login failures (no enumeration)
- Set httpOnly, Secure, and SameSite flags on refresh token cookies
- Implement rate limiting to prevent brute force attacks
- Store hashed refresh tokens in database (not plaintext)
- HTTPS-only in production (enforced by Secure flag)

---

### Post-Design Re-Evaluation

**Status**: ✅ All constitutional principles satisfied

**Summary**: The self-hosted authentication system complies with all constitutional requirements. Code quality, UX consistency, performance, and privacy standards are maintained. Testing is recommended but not blocking. No complexity violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-self-hosted-auth/
├── spec.md                    # Feature specification (✓ Complete)
├── plan.md                    # This file (✓ Complete)
├── research.md                # Technology research and decisions (✓ Complete)
├── data-model.md              # Entity definitions and relationships (✓ Complete)
├── quickstart.md              # Implementation guide and testing (✓ Complete)
├── contracts/                 # API contracts (✓ Complete)
│   └── api.openapi.yaml       # OpenAPI 3.0 spec for auth endpoints
└── tasks.md                   # Task breakdown (⏳ Created via /speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── api/                       # NestJS Backend API
│   ├── src/
│   │   ├── auth/              # NEW: Auth module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts       # Login, registration, token management
│   │   │   ├── auth.controller.ts    # REST API endpoints
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts   # Passport JWT strategy
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts # Global JWT authentication guard
│   │   │   │   └── public.decorator.ts # @Public() decorator for public routes
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       ├── forgot-password.dto.ts
│   │   │       └── reset-password.dto.ts
│   │   ├── entities/          # NEW: TypeORM entities
│   │   │   ├── user.entity.ts          # User with password_hash
│   │   │   ├── refresh-token.entity.ts  # Refresh tokens (hashed)
│   │   │   └── password-reset-token.entity.ts # Reset tokens
│   │   ├── modules/
│   │   │   └── user/          # UPDATED: Remove Supabase client
│   │   │       └── user.service.ts     # Use TypeORM repositories
│   │   ├── migrations/        # NEW: Database migrations
│   │   │   └── 1705568400000-CreateAuthTables.ts
│   │   └── main.ts            # UPDATED: Register global JWT guard
│   └── .env                   # UPDATED: Add JWT_SECRET, remove Supabase keys
│
├── web/                       # Angular PWA Frontend
│   ├── src/
│   │   └── app/
│   │       ├── auth/          # UPDATED: Replace Supabase with HttpClient
│   │       │   └── interceptors/
│   │       │       ├── token.interceptor.ts      # NEW: Attach JWT to requests
│   │       │       └── refresh.interceptor.ts    # NEW: Auto-refresh on 401
│   │       └── main.ts        # UPDATED: Register HTTP interceptors
│   └── .env                   # UPDATED: Remove Supabase URL/key
│
└── libs/
    ├── features/auth/         # UPDATED: AuthService refactoring
    │   └── src/lib/services/
    │       └── auth.ts        # Replace Supabase SDK with HttpClient
    └── data-backend/          # UPDATED: Remove Supabase client
        └── src/supabase/
            └── supabase.client.ts # DELETE: No longer needed
```

**Structure Decision**: This is a web application with separate backend (NestJS API) and frontend (Angular PWA). The monorepo structure uses Nx with clear boundaries between `apps/api` (backend), `apps/web` (frontend), and shared `libs/`. Authentication logic is centralized in `apps/api/src/auth` module with TypeORM entities, DTOs, strategies, and guards. Frontend authentication is handled via HTTP interceptors and the refactored `AuthService` in `libs/features/auth`.

---

## Complexity Tracking

**No constitutional violations requiring justification.**

All complexity is justified by feature requirements and follows established patterns:
- TypeORM entities: Standard ORM pattern for database access
- Passport JWT strategy: Industry-standard authentication middleware
- HTTP interceptors: Angular best practice for cross-cutting concerns
- Refresh token pattern: Security best practice for long-lived sessions

---

## Phase 0: Research (✓ Complete)

### Artifacts Generated

- ✅ **research.md**: Comprehensive research on NestJS authentication, Angular JWT patterns, and Supabase migration strategies

### Key Decisions

1. **NestJS + Passport JWT**: Industry-standard authentication with @nestjs/passport and passport-jwt
2. **Dual-Token Pattern**: 15-minute access tokens + 7-day refresh tokens
3. **Bcrypt (10 rounds)**: Balance security and performance (~250ms hashing time)
4. **TypeORM Entities**: User, RefreshToken, PasswordResetToken with service-layer hashing
5. **HTTP Interceptors**: Functional interceptors with inject() API for token attachment and refresh
6. **Token Storage**: Access token in memory, refresh token in httpOnly cookie
7. **Migration Strategy**: Direct bcrypt hash migration from Supabase (portable)

---

## Phase 1: Design & Contracts (✓ Complete)

### Artifacts Generated

- ✅ **data-model.md**: Entity definitions (User, RefreshToken, PasswordResetToken, UserPreferences)
- ✅ **contracts/api.openapi.yaml**: OpenAPI 3.0 specification for 6 auth endpoints
- ✅ **quickstart.md**: Implementation guide with installation, configuration, and testing

### Entity Summary

**User**:
- Fields: id (UUID), email (unique, indexed), password_hash (bcrypt), created_at, updated_at
- Relationships: 1:N RefreshToken, 1:N PasswordResetToken, 1:1 UserPreferences
- Validation: Email format, unique email, password min 8 chars + letter + number

**RefreshToken**:
- Fields: id (UUID), token_hash (SHA256, indexed), user_id (FK), expires_at (indexed), revoked_at, created_at
- Lifecycle: 7-day TTL, revoked on logout, cleaned up after 30 days post-expiration

**PasswordResetToken**:
- Fields: id (UUID), token_hash (SHA256, indexed), user_id (FK), expires_at (indexed), used (boolean), created_at
- Lifecycle: 1-hour TTL, single-use, cleaned up after 7 days post-expiration

### API Endpoints

1. `POST /auth/register` - Create new user account (returns JWT tokens)
2. `POST /auth/login` - Authenticate with email/password (returns JWT tokens)
3. `POST /auth/refresh` - Refresh access token using refresh token cookie
4. `POST /auth/logout` - Revoke refresh token and sign out
5. `POST /auth/forgot-password` - Request password reset email
6. `POST /auth/reset-password` - Reset password with token from email

### Agent Context Update

✅ Updated CLAUDE.md with new technology:
- Database: PostgreSQL (TypeORM)
- Project type: Web application (backend + frontend)

---

## Implementation Roadmap

### Backend Implementation (apps/api)

**1. Dependencies**:
- Install: @nestjs/passport, @nestjs/jwt, passport-jwt, bcrypt, @nestjs/typeorm, typeorm, pg, @nestjs/throttler

**2. Entities**:
- Create User, RefreshToken, PasswordResetToken entities
- Generate TypeORM migration for auth tables
- Add indexes: users(email), refresh_tokens(token_hash, user_id, expires_at), password_reset_tokens(token_hash, expires_at)

**3. Auth Module**:
- AuthService: Login, registration, token generation/validation, password hashing
- AuthController: REST endpoints for all auth operations
- JwtStrategy: Passport JWT strategy for token validation
- JwtAuthGuard: Global guard with @Public() decorator for public routes
- DTOs: Register, Login, ForgotPassword, ResetPassword with validation

**4. Configuration**:
- Add JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION to .env
- Configure TypeORM with new entities
- Set up rate limiting with @nestjs/throttler
- Configure email service for password reset

**5. Migration**:
- Remove Supabase client from user.service.ts
- Replace Supabase queries with TypeORM repositories
- Update user_preferences table to reference new users table

---

### Frontend Implementation (apps/web)

**1. Dependencies**:
- Install: jwt-decode
- Remove: @supabase/supabase-js (after migration complete)

**2. HTTP Interceptors**:
- Token attachment interceptor: Add Authorization header to all requests
- Refresh interceptor: Catch 401 errors, refresh token, retry request

**3. AuthService Refactoring** (libs/features/auth):
- Replace Supabase SDK methods with HttpClient REST calls
- Store access token in memory (service property)
- Implement token refresh logic
- Update isAuthenticated signal based on token validity

**4. Route Guards**:
- Update existing auth guards to work with new JWT validation
- Ensure protected routes redirect to login on 401

**5. Error Handling**:
- Parse new API error response format
- Display user-friendly messages for auth errors
- Handle token expiration gracefully

---

### Database Migration

**1. Export Supabase Users**:
- Use pg_dump with service role key to export auth.users table
- Verify bcrypt hashes are preserved

**2. Transform and Import**:
- Map Supabase fields to new User entity (id → id, email → email, encrypted_password → password_hash)
- Import data into new users table
- Verify UUID preservation and foreign key integrity

**3. Migrate User Preferences**:
- Update user_preferences.user_id foreign key to reference new users table
- Verify all user_id values exist in migrated users table

**4. Cleanup**:
- Remove Supabase Auth dependencies from package.json
- Delete Supabase client initialization code
- Update environment variable documentation

---

## Testing Strategy (RECOMMENDED)

### Backend Tests

**Unit Tests** (Jest):
- AuthService: register(), login(), refreshToken(), forgotPassword(), resetPassword()
- Password hashing: verify bcrypt with 10 rounds
- Token generation: verify JWT payload structure
- Token validation: verify expired/invalid tokens rejected

**Integration Tests** (Jest + Supertest):
- POST /auth/register: verify user created, tokens returned
- POST /auth/login: verify authentication, httpOnly cookie set
- POST /auth/refresh: verify new access token issued
- POST /auth/logout: verify refresh token revoked
- Rate limiting: verify brute force protection

**Contract Tests**:
- Verify API responses match OpenAPI specification
- Test all error scenarios (400, 401, 409, 429)

---

### Frontend Tests

**Unit Tests** (Jest):
- AuthService: signInWithPassword(), signUp(), refreshToken(), signOut()
- Token interceptor: verify Authorization header added
- Refresh interceptor: verify 401 handled and retry occurs

**E2E Tests** (Playwright - OPTIONAL):
- User registration flow: form submission → account created → dashboard
- Login flow: credentials → authenticated → protected route accessible
- Token expiration: wait for expiration → auto-refresh → continue session
- Logout flow: sign out → redirected to login → cannot access protected routes

---

## Performance Monitoring

### Metrics to Track

- Login latency (p50, p95, p99)
- Token refresh latency
- Bcrypt hashing time
- Database query performance (login, token validation)
- Rate limit effectiveness (blocked requests)

### Alerts

- Error rate > 5% on auth endpoints
- Login latency p95 > 5 seconds
- Refresh token validation failure rate > 1%
- Rate limit violations spike (potential attack)

---

## Security Considerations

### Password Security
- ✅ Bcrypt with 10+ rounds (configurable)
- ✅ Never log passwords or hashes
- ✅ Async hashing (non-blocking)
- ✅ Max password length 128 chars (prevent bcrypt DoS)

### Token Security
- ✅ Access tokens: 15-minute TTL (short-lived)
- ✅ Refresh tokens: 7-day TTL (revocable)
- ✅ Tokens stored hashed in database (SHA256)
- ✅ httpOnly cookies for refresh tokens (XSS protection)
- ✅ Secure flag (HTTPS-only)
- ✅ SameSite flag (CSRF protection)

### API Security
- ✅ Rate limiting (3 login attempts/minute per IP)
- ✅ Generic error messages (no user enumeration)
- ✅ HTTPS-only in production
- ✅ CORS whitelist (no wildcard origins)

### Defense in Depth
- ✅ Database constraints (unique email, foreign keys)
- ✅ Application-level validation (DTOs)
- ✅ Service-layer business logic (password rules)
- ✅ Guards and interceptors (authentication)

---

## Rollback Plan

### If Migration Fails

**Scenario**: Critical issues discovered after deployment

**Actions**:
1. Revert to Supabase Auth (dual-provider support maintained during transition)
2. Restore frontend to use @supabase/supabase-js SDK
3. Investigate root cause in staging environment
4. Fix issues and re-deploy with feature flag (gradual rollout)

**Mitigation**:
- Maintain dual-provider support for 2 weeks post-migration
- Blue-green deployment for instant rollback
- Database backups before and after migration
- Comprehensive monitoring and alerting

---

## Success Criteria

### Technical Success

- ✅ All 6 auth endpoints functional and tested
- ✅ User migration complete with zero data loss
- ✅ Frontend successfully authenticates with new backend
- ✅ Token refresh works seamlessly (no user disruption)
- ✅ Anonymous mode continues to function
- ✅ Rate limiting prevents brute force attacks

### Performance Success

- ✅ Login < 3 seconds (meets SC-001 from spec)
- ✅ Registration < 2 seconds (meets SC-002 from spec)
- ✅ Token refresh < 500ms (meets SC-003 from spec)
- ✅ 100 concurrent requests handled (meets SC-004 from spec)

### Security Success

- ✅ 100% passwords stored as bcrypt hashes (meets SC-006 from spec)
- ✅ No critical security vulnerabilities (meets SC-012 from spec)
- ✅ Rate limiting active and functional (meets SC-007 from spec)

---

## Next Phase

**Ready for**: `/speckit.tasks` - Generate detailed task breakdown for implementation

This plan provides the complete technical design, architecture decisions, and implementation roadmap for the self-hosted authentication system. All research, data modeling, and API contracts are complete and ready for task-level execution.
