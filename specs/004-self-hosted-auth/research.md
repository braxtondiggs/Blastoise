# Research: Self-Hosted Authentication System

**Feature**: Replace Supabase Auth with self-hosted NestJS authentication
**Date**: 2025-01-18
**Status**: Complete

## Overview

This document consolidates research findings for implementing a self-hosted NestJS authentication system to replace Supabase Auth. The research covers backend authentication patterns, frontend integration, and migration strategies.

---

## Backend: NestJS Authentication Best Practices

### Decision 1: NestJS + Passport JWT Integration

**What was chosen**: Implement Passport JWT strategy with @nestjs/passport and @nestjs/jwt packages, using JWT guards and custom decorators for route protection with a whitelisting approach (public routes opt-out via @Public() decorator rather than blacklisting protected routes).

**Rationale**:
- Passport is the industry-standard authentication middleware for Node.js, providing a plug-and-play architecture that allows adding new authentication methods without major code modifications
- JWT enables stateless authentication, making it lightweight and scalable across distributed systems
- Whitelisting approach reduces attack surface by explicitly permitting only known necessary entities, making code security policies more transparent and maintainable
- Custom decorators (like @Public()) improve code readability and allow reusable, DRY authentication logic across controllers

**Alternatives considered**:
- Custom authentication implementation: Rejected because it increases complexity, maintenance burden, and introduces security vulnerabilities compared to battle-tested Passport.js
- OAuth/OAuth2: Not chosen for initial MVP as it adds external dependency complexity; can be added later for social login features
- Blacklisting protected routes: Rejected in favor of whitelisting because blacklisting is error-prone (easy to forget to protect new routes) and exposes more attack surface

---

### Decision 2: Access/Refresh Token Pattern and Storage

**What was chosen**: Implement dual-token pattern with access tokens valid for 15 minutes and refresh tokens valid for 7 days. Store refresh tokens in HTTP-only cookies with secure flag; store access token in memory or HTTP-only cookie. Store hashed refresh tokens in RefreshToken entity in database keyed by user ID.

**Rationale**:
- Short-lived access tokens (15 minutes) minimize exposure if a token is compromised
- Long-lived refresh tokens (7 days) provide good user experience without requiring frequent re-login
- HTTP-only cookies are critical security: even if XSS vulnerabilities exist, attackers cannot read the refresh token via JavaScript, preventing session theft
- Hashing refresh tokens in the database prevents attackers from reusing stolen tokens if they gain database access
- Stateful refresh tokens (stored in DB) allow token revocation and multi-device session management
- This pattern balances security with user experience and enables proper logout functionality

**Alternatives considered**:
- Single JWT with long expiration: Rejected because long-lived tokens with no revocation mechanism pose security risk; if token is stolen, attacker has access for the full duration
- Storing tokens in localStorage: Rejected because localStorage is vulnerable to XSS attacks; any injected JavaScript can access tokens
- Storing tokens in sessionStorage: Rejected for same reason as localStorage; also lost on page refresh
- Token rotation on every refresh: Considered but adds database load; rotation on logout is sufficient for most use cases
- Storing unencrypted refresh tokens: Rejected as it violates security best practices; database compromise would expose all sessions

---

### Decision 3: Password Security with Bcrypt Configuration

**What was chosen**: Use bcrypt with 10 salt rounds as the default, with option to increase to 12+ rounds for security-critical systems. Always use async API (bcrypt.hash() and bcrypt.compare()) and hash passwords in the service layer before database insertion. Target hashing time of 250ms per password.

**Rationale**:
- Bcrypt is specifically designed for password hashing with built-in salting, making it resistant to rainbow table and dictionary attacks
- 10 rounds (2^10 = 1024 iterations) provides strong security (~10 hashes/sec performance) while maintaining acceptable login performance
- 12+ rounds recommended for systems with heightened security requirements, though trades off performance (~2-3 hashes/sec)
- Async API is mandatory on servers to prevent blocking the Node.js event loop during CPU-intensive hashing operations
- 250ms hashing time is the security industry standard target, providing strong brute-force resistance without degrading UX
- Service layer hashing maintains separation of concerns and makes code easier to test

**Alternatives considered**:
- Synchronous bcrypt (bcrypt.hashSync): Rejected because it blocks the entire Node.js event loop, causing application freezes
- 15+ salt rounds: Rejected for default as it creates 3+ seconds per hash, making login unacceptably slow; only use for special cases
- Argon2: Considered but bcrypt is more widely implemented, well-understood, and sufficient for most applications; Argon2 adds complexity
- Simple salted SHA256: Rejected because bcrypt's iterative approach is specifically designed to be slow, making brute force impractical
- Hashing in entities with @BeforeInsert(): Rejected in favor of service layer because it's harder to test and less explicit; business logic belongs in services

---

### Decision 4: TypeORM User Entity Architecture

**What was chosen**: Create three TypeORM entities: User (with password field, validated before save), RefreshToken (stores hashed tokens keyed by user ID with expiration), and PasswordResetToken (for password reset flow). Hash passwords in the authentication service layer before calling repository.save(). Use database-level unique constraints and indexes for email/username for data integrity.

**Rationale**:
- Separating RefreshToken and PasswordResetToken into distinct entities provides cleaner data modeling and allows independent expiration/lifecycle management
- Service-layer hashing (not entity hooks) keeps business logic centralized and testable
- Database constraints ensure data integrity and prevent duplicate accounts/tokens at the DB level
- Storing hashed refresh tokens prevents token reuse if database is compromised
- Indexed fields (email, username) enable fast lookups and enforce uniqueness at DB level
- This design supports multiple concurrent refresh tokens per user (one per device) if needed in the future

**Alternatives considered**:
- Storing plaintext passwords: Rejected as fundamental security violation; always unacceptable
- Single table for all token types: Rejected because it couples unrelated token lifecycles; separate tables provide flexibility
- Using @BeforeInsert() for hashing in User entity: Rejected because it's implicit, harder to test, and makes service-layer logic unclear
- Storing unhashed refresh tokens: Rejected because it violates defense-in-depth principle; if DB is compromised, all sessions are immediately compromised
- No RefreshToken entity, storing in JWT claims: Rejected because it prevents token revocation; stateless tokens cannot be revoked

---

### Decision 5: Error Handling for Authentication

**What was chosen**: Use NestJS built-in HttpException classes (UnauthorizedException for invalid credentials, BadRequestException for validation errors) with global exception filters. Create custom authentication-specific exception classes extending HttpException for structured, consistent error responses. Return minimal information in error messages (no user enumeration: don't reveal whether email exists).

**Rationale**:
- Built-in HTTP exceptions map to correct HTTP status codes (401 Unauthorized, 400 Bad Request) following REST standards
- Global exception filters ensure all authentication errors are handled consistently across the application
- Custom exception classes allow domain-specific error information while maintaining a standardized response format
- Returning minimal error details prevents user enumeration attacks (attackers can't discover which emails are registered)
- Logging full error details server-side while returning generic messages to clients balances debugging and security
- Structured error responses enable client-side handling (retry logic, user messaging)

**Alternatives considered**:
- Returning different errors for "user not found" vs "password incorrect": Rejected because it enables user enumeration attacks; use generic "Invalid credentials"
- Returning verbose error messages with stack traces: Rejected as it leaks sensitive implementation details to potential attackers
- Using middleware for all authentication: Rejected because guards and filters are more composable and enable route-specific logic
- Silent failure (200 OK with error in response body): Rejected because HTTP status codes communicate intent to clients and intermediaries
- Custom HTTP status codes: Rejected because using standard codes (401, 400) improves client compatibility and clarity

---

### Decision 6: Rate Limiting Authentication Endpoints

**What was chosen**: Use @nestjs/throttler package globally configured with sensible defaults (10 requests/60 seconds), then override with strict limits on authentication endpoints (3 login attempts/60 seconds, 5 registration attempts/60 seconds). Use custom RedisThrottleStorage for distributed systems or default in-memory storage for single-server deployments. Return HTTP 429 Too Many Requests status when limits exceeded.

**Rationale**:
- @nestjs/throttler is NestJS's official, well-maintained rate limiting solution that integrates seamlessly with guards and decorators
- Strict limits on login/registration (3-5 per minute) make brute-force attacks computationally infeasible while allowing legitimate users
- Redis is the recommended storage backend for distributed systems where multiple servers share throttle state
- HTTP 429 status code is the standard for rate limiting, properly communicating the issue to clients for retry-after logic
- Decorators (@Throttle, @SkipThrottle) provide explicit, per-route control rather than implicit configuration
- This approach prevents common brute-force attacks without requiring expensive external services

**Alternatives considered**:
- Captcha-based protection: Considered but rate limiting is simpler, faster, and effective; CAPTCHA can be added as secondary layer
- Account lockout after N failures: Rejected because it enables denial-of-service attacks (attacker locks out legitimate users); rate limiting is better
- IP-based blocking: Rejected as sole solution because VPNs and shared IPs can affect legitimate users; rate limiting per endpoint is better
- No rate limiting: Rejected as brute-force attacks are trivial without it; modern applications require protection
- Very loose limits (100+ per minute): Rejected because it provides minimal protection; 3-5 attempts per minute is industry standard for auth

---

## Frontend: Angular JWT Authentication Patterns

### Decision 7: HTTP Interceptors for Token Attachment

**What was chosen**: Functional HTTP interceptors (not class-based) that use `inject()` API to attach Authorization Bearer tokens to outgoing requests, registered via `withInterceptors()` in the application bootstrap configuration.

**Rationale**: Modern Angular (v14+) recommends functional interceptors over class-based DI-based interceptors because they have more predictable behavior in complex setups. Functional interceptors allow clean separation of concerns and easier composition. The inject() API eliminates the need for constructor injection and avoids circular dependency issues that commonly arise when HttpClient is needed within interceptors. All requests can be intercepted at a single point, reducing code duplication across services.

**Alternatives considered**:
- Class-based CanActivate/CanDeactivate guards - deprecated and less flexible
- Manual header attachment in individual services - violates DRY principle and creates maintenance burden
- Custom HTTP wrapper classes - adds unnecessary abstraction layers

---

### Decision 8: Automatic Token Refresh with 401 Error Detection

**What was chosen**: HTTP interceptor pattern that detects 401 Unauthorized responses, automatically invokes a token refresh endpoint, retries the failed request with the new token, and queues subsequent requests during refresh using RxJS `shareReplay()` to prevent multiple simultaneous refresh requests.

**Rationale**: This pattern provides seamless user experience without requiring manual intervention. Using a flag (e.g., `isRefreshingToken`) or `shareReplay()` operator prevents multiple refresh requests when multiple HTTP calls fail simultaneously with 401. The interceptor catches 401 errors before they reach the application, making token expiration transparent to components. RxJS operators like `catchError`, `switchMap`, and `retryWhen` allow chaining requests (refresh → retry original) atomically. Important: The interceptor will not loop infinitely because a failed refresh attempt's 401 error won't be caught by itself again, preventing recursion.

**Alternatives considered**:
- Silent token refresh (proactive refresh 1 minute before expiration) - adds complexity of background timing, may not work for long-lived sessions
- Manual refresh in component - violates separation of concerns, creates scattered logic
- Force logout on 401 without retry - poor UX, loses request context
- Single refresh attempt without queuing - causes thundering herd with multiple simultaneous requests

---

### Decision 9: Token Storage Strategy

**What was chosen**: Hybrid dual-token approach: Store **access token in memory** (JavaScript variable) and **refresh token in httpOnly secure cookie**. Server returns access token in HTTP response body and refresh token in a Set-Cookie header with httpOnly and secure flags.

**Rationale**: This approach balances security and usability:
- **Access token in memory**: Prevents XSS attacks from stealing tokens (lost on page refresh, not persistent), requires manual addition to request headers via interceptor
- **Refresh token in httpOnly cookie**: Protected from JavaScript access (cannot be read by malicious scripts), automatically sent with requests, survives page refreshes, enables silent token refresh
- **httpOnly flag**: Prevents JavaScript from reading the cookie even with XSS, mitigates XSS risk
- **Secure flag**: Transmitted only over HTTPS, preventing man-in-the-middle interception
- **SameSite flag**: Mitigates CSRF attacks (when applicable)

This combination follows OWASP recommendations and is widely recommended in 2024-2025 security guidance.

**Alternatives considered**:
- localStorage only - convenient but vulnerable to XSS (JavaScript can directly access and steal tokens)
- sessionStorage only - same XSS vulnerability plus lost on browser close
- httpOnly cookies only - violates 4KB size limit for large JWT tokens, and still vulnerable to CSRF
- in-memory only - convenient but lost on page refresh, requires re-authentication
- localStorage + httpOnly cookie combo - adds complexity without clear security benefit

---

### Decision 10: Auth Service Refactoring Pattern

**What was chosen**: Create a centralized `AuthService` that encapsulates all authentication logic: login/logout methods using HttpClient REST calls, token management (storing/retrieving tokens), token validation (JWT decoding via `jwt-decode` package), and expiration checking. The service exposes an `isAuthenticated$` observable that components can subscribe to for reactive authentication state updates.

**Rationale**: Centralizes authentication concerns, making the codebase maintainable and testable. Using observables allows reactive updates across the application without tight coupling. The service becomes the single source of truth for authentication state. By delegating to HttpClient (instead of Supabase SDK), you gain full control over request/response handling, interceptors, and error handling. Token operations (encode/decode) are isolated in one place, preventing duplication.

Implementation pattern:
1. **Login method**: POST to `/auth/login` with credentials, stores access token in memory and refresh token is stored by server in httpOnly cookie
2. **Logout method**: Calls `/auth/logout` to invalidate server-side tokens, clears memory storage
3. **Refresh method**: POST to `/auth/refresh` (cookie automatically included), receives new access token
4. **Token helpers**: Decode JWT, check expiration, validate signature format
5. **Observable state**: BehaviorSubject tracks `isAuthenticated` and current user

**Alternatives considered**:
- Keep Supabase SDK with HttpClient wrapper - mixing SDKs adds complexity
- Scatter auth logic across multiple services - reduces cohesion, harder to maintain
- State management library (NgRx/Akita) - adds boilerplate for simple auth needs
- Stateless approach with token-only checks - misses reactive state updates

---

### Decision 11: Route Guards with Modern Functional Pattern

**What was chosen**: Function-based route guards using `CanActivateFn` with `inject()` dependency injection (not class-based `CanActivate` interface). Guards return `true` (allow navigation), `false` (deny with redirect), `UrlTree` (redirect to specific route), or `Observable<boolean>` (async checks like API validation).

**Rationale**: The class-based `CanActivate` interface is deprecated as of Angular v15+. Function-based guards are simpler, more composable, and use the modern `inject()` API for dependency injection without constructor boilerplate. Guards can check authentication status synchronously and redirect to login if not authenticated. Multiple guards can be stacked on a single route for authentication + role-based authorization. Returning `UrlTree` is preferred over returning false then programmatically navigating.

**Alternatives considered**:
- Class-based guards - deprecated, requires constructor injection boilerplate
- Route resolvers - better for loading data before route activation, not for authorization
- Component-level checks - scattered logic, no prevent-before-load optimization
- Middleware approach - not applicable in browser context

---

### Decision 12: Error Handling and Graceful Degradation

**What was chosen**: Implement a centralized error-handling interceptor that:
1. Detects error type (HTTP response error vs network error)
2. Handles 401 (token expired) → trigger refresh + retry
3. Handles 403 (insufficient permissions) → show forbidden message
4. Handles 5xx errors → log to Sentry, show generic error UI
5. Handles network errors → show offline indicator
6. Uses `catchError` with RxJS to transform errors into user-friendly messages

**Rationale**: Centralizing error handling in an interceptor prevents duplicated error handling code across services and components. Different HTTP status codes require different responses (401 needs token refresh, 403 is an authorization issue not a token problem, 5xx requires logging). Distinguishing between client-side errors (network down, JSON parse failure) and server errors allows appropriate handling. Using RxJS `catchError` with `throwError()` preserves the error chain while allowing transformation.

**Alternatives considered**:
- Try-catch in individual services - scattered logic, inconsistent error responses
- Component-level error handling - UI component shouldn't handle HTTP errors
- Suppress all errors silently - poor UX, undetected bugs
- Log all errors to console - no production visibility, data lost on refresh

---

## Migration: Supabase to Self-Hosted

### Decision 13: User Migration Strategy

**What was chosen**: Direct password hash preservation with bcrypt-to-bcrypt portability, supplemented by on-the-fly migration for legacy systems.

**Rationale**: Supabase uses bcrypt for password hashing with salts embedded in the hash itself. Since bcrypt hashes are portable across systems using the same algorithm, users' existing bcrypt hashes can be directly migrated to the self-hosted system without requiring password resets. This allows seamless continuity for users while preserving security. For any users with weaker hashing algorithms from legacy systems, on-the-fly re-hashing upon successful login ensures gradual strengthening of password security without forcing mass resets.

**Alternatives considered**:
- Forcing password resets for all users (rejected - creates poor UX and increases support burden)
- Hash wrapping legacy passwords in bcrypt (rejected - adds unnecessary complexity when direct bcrypt migration is possible)
- Keying new hashes with the old system as fallback during transition (considered but unnecessary given direct portability)

---

### Decision 14: Database Schema Migration

**What was chosen**: TypeORM entities with `synchronize: false` for auth schema, separate custom user table with foreign key references to auth schema, bulk pg_dump for initial data transfer.

**Rationale**: PostgreSQL's pg_dump provides a complete schema and data export including the auth.users table with encrypted password fields intact. By creating TypeORM entities that reference but don't synchronize the auth schema, you maintain a bridge between legacy Supabase auth structure and custom entities without corrupting managed schemas. Custom user tables with foreign key references (using UUID primary keys with CASCADE DELETE) preserve relationships while allowing metadata extension. This staged approach prevents data loss while maintaining referential integrity.

**Alternatives considered**:
- Direct TypeORM schema synchronization (rejected - would corrupt Supabase's managed auth schema)
- Separate disconnected user tables with manual ID mapping (rejected - creates data consistency risks)
- Migrating all auth data to public schema immediately (rejected - increases risk of downtime during schema changes)

---

### Decision 15: Zero-Downtime Deployment

**What was chosen**: Dual authentication provider support with API gateway pattern, progressive traffic shifting using feature flags, blue-green deployment for service infrastructure.

**Rationale**: Supporting both Supabase Auth and self-hosted JWT authentication simultaneously during transition allows clients to migrate at their own pace without service disruption. The API gateway enforces authentication regardless of provider source, enabling seamless switching. Feature flags allow percentage-based traffic shifting (starting at 5%, incrementally increasing) to validate new auth system stability before full cutover. Blue-green deployments maintain two complete production environments, allowing instant rollback if issues arise. This multi-layered approach isolates risk and provides multiple rollback paths.

**Alternatives considered**:
- Big-bang cutover (rejected - single point of failure, no rollback path)
- Maintenance window downtime (rejected - violates zero-downtime requirement)
- Shadow mode reads only (rejected - insufficient validation of auth logic before cutover)
- Rolling deployment without feature flags (rejected - lacks granular control and monitoring)

---

### Decision 16: Anonymous User Preservation

**What was chosen**: Preserve anonymous session tokens with automatic upgrade path to authenticated state, persist anonymous user IDs in client storage independent of auth provider.

**Rationale**: Anonymous users in Supabase receive temporary session tokens tied to a transient user ID. By preserving these tokens during migration and mapping them to self-hosted anonymous sessions, users can continue their experience uninterrupted. The self-hosted system should maintain an "anonymous" auth state that mirrors Supabase's behavior, allowing users to upgrade to authenticated accounts while retaining their session context. This is achieved by:
1. Issuing self-hosted JWT tokens that mirror the temporary nature of Supabase anonymous sessions
2. Storing the anonymous user ID in client-side persistent storage (IndexedDB) independent of auth system
3. Implementing a seamless upgrade path where authentication links the anonymous session to a permanent account

**Alternatives considered**:
- Forcing re-authentication for anonymous users (rejected - loses user data, breaks UX)
- OAuth Client Credentials Flow (rejected - inappropriate for client-side apps)
- Separate anonymous database (rejected - duplicates complexity)
- Session token reuse (rejected - doesn't bridge the auth provider gap)

---

## Technology Choices Summary

### Backend Stack
- **JWT Library**: @nestjs/jwt for token generation/validation
- **Passport Strategy**: passport-jwt for stateless validation
- **Password Hashing**: bcrypt with 10 rounds (default) or 12+ (high-security systems)
- **ORM**: TypeORM with PostgreSQL
- **Rate Limiting**: @nestjs/throttler with Redis storage (distributed) or in-memory (single-server)
- **Exception Handling**: NestJS built-in HttpException classes with global filters
- **Authorization Pattern**: Whitelisting with @Public() decorator for public routes

### Frontend Stack
- **HTTP Client**: Angular HttpClient (replacing @supabase/supabase-js)
- **Token Storage**: Access token in memory, refresh token in httpOnly cookies
- **Interceptors**: Functional interceptors with inject() API
- **Route Guards**: CanActivateFn (function-based, not class-based)
- **JWT Decoding**: jwt-decode package
- **Error Handling**: Centralized error interceptor with RxJS operators

### Token Lifecycle
- **Access Token TTL**: 15 minutes
- **Refresh Token TTL**: 7 days
- **Refresh Token Storage**: Database (hashed) + httpOnly cookie (client)
- **Token Refresh Strategy**: Automatic on 401 error via interceptor

### Migration Strategy
- **User Data**: Direct bcrypt hash migration from Supabase
- **Deployment**: Dual-provider support with feature flags
- **UUID Preservation**: Maintain existing Supabase UUIDs
- **Rollback Plan**: Blue-green deployment with instant rollback capability
