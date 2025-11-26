# Feature Specification: Self-Hosted Authentication System

**Feature Branch**: `004-self-hosted-auth`
**Created**: 2025-01-18
**Status**: Draft
**Input**: User description: "Replace Supabase Auth (managed authentication service) with a self-hosted NestJS authentication system using Passport JWT strategy, bcrypt for password hashing, and direct PostgreSQL database access via TypeORM."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Email/Password Sign In (Priority: P1)

An existing user wants to sign into their Blastoise account using their registered email and password. They navigate to the login page, enter their credentials, receive a JWT access token and refresh token, and are authenticated into their account with all their synced visits visible.

**Why this priority**: This is the foundation of the self-hosted authentication system. Without this, users cannot access their accounts. This is the most critical user flow and must work independently before any other features.

**Independent Test**: Can be fully tested by creating a test account via API, then signing in with email/password through the login form. Success criteria: user receives valid JWT tokens and can access protected resources.

**Acceptance Scenarios**:

1. **Given** I have an existing account with valid credentials, **When** I submit email and password to the login endpoint, **Then** I receive both an access token (short-lived) and refresh token (long-lived) in the response
2. **Given** I entered invalid credentials, **When** I submit the login form, **Then** I receive a 401 Unauthorized error with message "Invalid email or password"
3. **Given** I entered an email that doesn't exist in the database, **When** I submit the login form, **Then** I receive a 401 Unauthorized error without revealing whether the email exists
4. **Given** I successfully authenticated, **When** I include the access token in subsequent API requests, **Then** I can access protected resources
5. **Given** My access token expires, **When** I make an API request, **Then** I receive a 401 error prompting me to refresh the token

---

### User Story 2 - New Account Registration (Priority: P1)

A new user wants to create a Blastoise account to access cloud sync and multi-device support. They submit their email and password to the registration endpoint, the system hashes their password securely, stores the user in PostgreSQL, and returns JWT tokens for immediate authentication.

**Why this priority**: Required for user growth and new account creation. Works alongside P1 sign-in by providing the account creation flow. Can be tested independently by submitting new email/password combinations.

**Independent Test**: Can be fully tested by submitting registration requests with unique emails. Success: account is created in PostgreSQL with bcrypt-hashed password, user receives JWT tokens immediately, and can sign in with those credentials.

**Acceptance Scenarios**:

1. **Given** I submit valid email and password to registration endpoint, **When** the request processes, **Then** my password is hashed with bcrypt (with appropriate work factor), account is created in database, and I receive JWT tokens
2. **Given** I enter a password that doesn't meet requirements, **When** I submit registration, **Then** I receive a 400 Bad Request error with specific validation messages
3. **Given** I enter an email that's already registered, **When** I submit registration, **Then** I receive a 409 Conflict error with message "This email is already registered"
4. **Given** I successfully register, **When** my account is created, **Then** default user preferences are initialized in the database
5. **Given** I just registered, **When** I use my new credentials to sign in, **Then** authentication succeeds with the same JWT token format

---

### User Story 3 - Token Refresh Flow (Priority: P1)

An authenticated user's access token expires after the configured TTL (e.g., 15 minutes). Rather than forcing them to re-enter credentials, they can use their refresh token to obtain a new access token seamlessly, maintaining their session without interruption.

**Why this priority**: Critical for user experience - prevents constant re-authentication. Required for production-ready auth system. Can be tested independently by waiting for token expiry or manually testing with expired tokens.

**Independent Test**: Can be fully tested by obtaining tokens, waiting for access token to expire, then using refresh token to get new access token. Success: new access token is valid and grants access to protected resources without requiring password re-entry.

**Acceptance Scenarios**:

1. **Given** I have a valid refresh token, **When** I submit it to the token refresh endpoint, **Then** I receive a new access token with extended expiry
2. **Given** My refresh token is invalid or expired, **When** I attempt to refresh, **Then** I receive a 401 Unauthorized error requiring full re-authentication
3. **Given** I successfully refresh my token, **When** I use the new access token, **Then** I can access all protected resources as before
4. **Given** A refresh token has been used, **When** I attempt to use it again, **Then** it remains valid (refresh tokens should be reusable unless explicitly revoked)
5. **Given** I sign out, **When** my refresh token is invalidated, **Then** I cannot use it to obtain new access tokens

---

### User Story 4 - Password Reset Flow (Priority: P2)

A user forgot their password and needs to reset it. They request a password reset via email, receive a secure reset token with expiration, click the link in their email, enter a new password, and the system updates their bcrypt-hashed password in the database.

**Why this priority**: Required for account recovery but lower priority than initial auth flows. Most users won't need this immediately. Can be tested independently once P1 email/password auth exists.

**Independent Test**: Can be fully tested by requesting password reset for a test account, receiving the reset token, submitting new password, and verifying the old password no longer works while new password succeeds.

**Acceptance Scenarios**:

1. **Given** I request a password reset for my email, **When** the request processes, **Then** a secure, time-limited reset token is generated and sent to my email
2. **Given** I receive the reset email, **When** I click the reset link with valid token, **Then** I am taken to a page where I can enter a new password
3. **Given** I enter a valid new password with reset token, **When** I submit, **Then** my password is updated (bcrypt hashed) and I can immediately sign in with new credentials
4. **Given** I clicked an expired reset token (>1 hour old), **When** I try to use it, **Then** I receive an error message prompting me to request a new reset link
5. **Given** I successfully reset my password, **When** the token is used, **Then** it is invalidated and cannot be reused for additional password changes

---

### User Story 5 - Protected Route Authorization (Priority: P1)

A user attempts to access protected API endpoints that require authentication. The system validates their JWT access token on each request, extracts their user ID from the token payload, and either grants or denies access based on token validity.

**Why this priority**: Essential for securing the API and implementing proper authorization. Cannot have a working auth system without this. Can be tested independently by making requests with valid/invalid/missing tokens.

**Independent Test**: Can be fully tested by making API requests to protected endpoints with various token states (valid, expired, invalid, missing). Success: valid tokens grant access, invalid states are properly rejected with appropriate error codes.

**Acceptance Scenarios**:

1. **Given** I include a valid access token in Authorization header, **When** I request a protected endpoint, **Then** the request succeeds and I receive the requested data
2. **Given** I provide no authentication token, **When** I request a protected endpoint, **Then** I receive a 401 Unauthorized error
3. **Given** I provide an expired access token, **When** I request a protected endpoint, **Then** I receive a 401 Unauthorized error with message indicating token expiration
4. **Given** I provide a malformed or invalid token, **When** I request a protected endpoint, **Then** I receive a 401 Unauthorized error
5. **Given** I have a valid token, **When** the system extracts my user ID from token payload, **Then** it correctly identifies me for user-specific operations (e.g., fetching my visits)

---

### User Story 6 - Anonymous Mode Compatibility (Priority: P2)

An anonymous user continues to use the app with local-only storage without requiring authentication. The system allows unauthenticated access to core features while restricting cloud-sync features to authenticated users only.

**Why this priority**: Maintains existing functionality and user acquisition strategy. Lower priority than core auth flows but important for user experience. Can be tested independently by using the app without signing in.

**Independent Test**: Can be fully tested by opening the app without authentication and verifying core features work (local visit tracking) while cloud features are disabled. Success: anonymous users are not forced to authenticate.

**Acceptance Scenarios**:

1. **Given** I am using the app anonymously, **When** I access local-only features (visit tracking, map view), **Then** no authentication is required
2. **Given** I am anonymous, **When** I attempt to access cloud-sync features, **Then** I see a prompt to create an account or sign in
3. **Given** I have local visits as anonymous user, **When** I later create an account, **Then** I have the option to migrate my local visits to the cloud
4. **Given** I am anonymous, **When** the app makes API calls, **Then** it does not include authentication tokens for public endpoints

---

### User Story 7 - Sign Out and Token Revocation (Priority: P2)

An authenticated user wants to sign out of their account for security or to switch accounts. They click sign out, the system revokes their refresh token, clears client-side tokens, and redirects them to the landing page.

**Why this priority**: Important for security and multi-user scenarios but not blocking for initial authentication. Can be tested independently once authentication flows exist.

**Independent Test**: Can be fully tested by signing in, then signing out and verifying tokens no longer work. Success: after sign out, both access and refresh tokens are invalid and user cannot access protected resources.

**Acceptance Scenarios**:

1. **Given** I am authenticated, **When** I click "Sign Out", **Then** my refresh token is revoked in the database and I am redirected to landing page
2. **Given** I signed out, **When** I attempt to use my old access token, **Then** I receive a 401 Unauthorized error
3. **Given** I signed out, **When** I attempt to refresh using my old refresh token, **Then** I receive a 401 Unauthorized error
4. **Given** I sign out on one device, **When** I remain signed in on another device, **Then** that session continues to work (device-specific sign out)

---

### Edge Cases

- **What happens when a user enters a SQL injection attempt in email field?**
  TypeORM parameterized queries should prevent SQL injection. System should safely handle malicious input without error or security breach.

- **What happens when concurrent sign-in attempts occur for the same user?**
  Each successful authentication should generate independent tokens. Both sessions should remain valid and work independently.

- **What happens when the JWT secret key is rotated?**
  All existing tokens become invalid and users must re-authenticate. System should handle this gracefully with clear error messages prompting re-login.

- **What happens when a user has an extremely long password (e.g., 10,000 characters)?**
  System should enforce reasonable maximum password length (e.g., 128 characters) to prevent bcrypt DoS attacks, rejecting longer passwords with validation error.

- **What happens when database connection is lost during authentication?**
  System should return a 503 Service Unavailable error with message "Authentication service temporarily unavailable. Please try again."

- **What happens when bcrypt hashing takes too long and request times out?**
  Use appropriate bcrypt work factor (10-12 rounds) to balance security and performance. Monitor hash times and adjust if needed.

- **What happens when a user's refresh token is stolen?**
  Stolen token can be used until expiry or manual revocation. System should provide token revocation endpoints for security incidents. Consider implementing refresh token rotation for additional security.

- **What happens when password reset token is used multiple times?**
  Token should be single-use. After successful password reset, token is invalidated and subsequent attempts are rejected.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication Endpoints

- **FR-001**: System MUST provide a POST `/auth/login` endpoint accepting email and password, returning access token and refresh token on success
- **FR-002**: System MUST provide a POST `/auth/register` endpoint accepting email and password, creating user account with bcrypt-hashed password
- **FR-003**: System MUST provide a POST `/auth/refresh` endpoint accepting refresh token and returning new access token
- **FR-004**: System MUST provide a POST `/auth/logout` endpoint that revokes the refresh token for the authenticated user
- **FR-005**: System MUST provide a POST `/auth/forgot-password` endpoint accepting email and generating password reset token
- **FR-006**: System MUST provide a POST `/auth/reset-password` endpoint accepting reset token and new password

#### Password Security

- **FR-007**: System MUST hash all passwords using bcrypt with work factor of at least 10 rounds before storing in database
- **FR-008**: System MUST enforce password requirements: minimum 8 characters, at least one letter and one number
- **FR-009**: System MUST validate password strength on registration and password reset, rejecting weak passwords with clear error messages
- **FR-010**: System MUST never log, transmit, or expose plain-text passwords in any form
- **FR-011**: System MUST enforce maximum password length of 128 characters to prevent bcrypt DoS attacks

#### JWT Token Management

- **FR-012**: System MUST generate JWT access tokens with configurable expiration (recommended: 15 minutes)
- **FR-013**: System MUST generate JWT refresh tokens with longer expiration (recommended: 7 days)
- **FR-014**: System MUST include user ID in JWT payload to identify authenticated user for protected endpoints
- **FR-015**: System MUST sign all JWT tokens with secure secret key stored in environment configuration
- **FR-016**: System MUST validate JWT signature, expiration, and format on every protected route request
- **FR-017**: Refresh tokens MUST be stored in database with user association for revocation capability

#### User Account Management

- **FR-018**: System MUST store user accounts in PostgreSQL with fields: id (UUID), email (unique), password_hash, created_at, updated_at
- **FR-019**: System MUST validate email format on registration and login, rejecting invalid emails with 400 Bad Request
- **FR-020**: System MUST prevent duplicate email registration, returning 409 Conflict error if email already exists
- **FR-021**: System MUST initialize default user preferences when new account is created
- **FR-022**: System MUST create database indexes on email field for efficient login queries

#### Password Reset

- **FR-023**: System MUST generate secure, cryptographically random password reset tokens (minimum 32 bytes entropy)
- **FR-024**: System MUST store reset tokens in database with expiration timestamp (recommended: 1 hour)
- **FR-025**: System MUST invalidate reset tokens after successful password change (single-use tokens)
- **FR-026**: Password reset endpoint MUST send email with reset link containing token (email integration required)
- **FR-027**: System MUST validate reset token existence, expiration, and user association before allowing password change

#### Authorization and Guards

- **FR-028**: System MUST implement Passport JWT strategy to validate access tokens on protected routes
- **FR-029**: System MUST extract user ID from validated JWT and attach to request context for use in controllers
- **FR-030**: System MUST protect all user-specific endpoints (visits, preferences, sharing) with JWT authentication guard
- **FR-031**: System MUST return 401 Unauthorized with appropriate error message for missing, invalid, or expired tokens
- **FR-032**: Public endpoints (venue search, anonymous usage) MUST NOT require authentication

#### Error Handling

- **FR-033**: System MUST return consistent error responses with appropriate HTTP status codes (400, 401, 403, 409, 500)
- **FR-034**: Authentication errors MUST NOT reveal whether email exists in database (return generic "Invalid credentials" message)
- **FR-035**: System MUST log authentication failures for security monitoring without exposing sensitive data
- **FR-036**: System MUST implement rate limiting on auth endpoints to prevent brute force attacks (e.g., 5 attempts per minute per IP)

#### Migration from Supabase

- **FR-037**: System MUST maintain compatibility with existing user_preferences table structure in PostgreSQL
- **FR-038**: System MUST migrate existing Supabase users to new auth system without data loss (migration script required)
- **FR-039**: Existing frontend AuthService MUST be updated to work with new NestJS auth endpoints instead of Supabase client
- **FR-040**: System MUST maintain anonymous mode functionality without changes to existing anonymous user flow

### Key Entities

- **User**: Represents registered user account with fields: id (UUID primary key), email (unique, indexed), password_hash (bcrypt), created_at, updated_at. Related to user_preferences table via user_id foreign key.

- **RefreshToken**: Represents long-lived JWT refresh tokens with fields: id (UUID primary key), token (hashed for security), user_id (foreign key to User), expires_at, created_at. Allows token revocation and session management.

- **PasswordResetToken**: Represents temporary password reset tokens with fields: id (UUID primary key), token (hashed), user_id (foreign key to User), expires_at, used (boolean), created_at. Single-use tokens with 1-hour expiration.

- **JWTPayload**: Data structure embedded in JWT tokens containing: user_id (UUID), email (string), iat (issued at timestamp), exp (expiration timestamp). Used for stateless authentication.

- **UserPreferences**: Existing entity storing user settings. Linked to User via user_id. No structural changes required, but now managed by self-hosted auth instead of Supabase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete sign-in with email/password in under 3 seconds from form submission to authenticated state
- **SC-002**: New account registration completes in under 2 seconds including bcrypt hashing and database insertion
- **SC-003**: Token refresh operation completes in under 500ms to provide seamless user experience
- **SC-004**: System handles 100 concurrent authentication requests without performance degradation or timeout errors
- **SC-005**: Password hashing with bcrypt completes in 200-500ms per hash (balance between security and UX)
- **SC-006**: 100% of passwords are stored as bcrypt hashes with no plain-text passwords in database or logs
- **SC-007**: Authentication endpoints are protected by rate limiting, blocking more than 5 failed attempts per minute per IP address
- **SC-008**: JWT tokens are successfully validated on protected routes with less than 5ms overhead per request
- **SC-009**: Password reset flow completes in under 2 minutes from request to successful sign-in with new password
- **SC-010**: Anonymous mode continues to work without any disruption or forced authentication
- **SC-011**: Migration from Supabase Auth completes with zero user data loss or account lockouts
- **SC-012**: Security audit shows no critical vulnerabilities (SQL injection, XSS, CSRF, JWT vulnerabilities)

## Assumptions

1. **PostgreSQL Configuration**: Assumes PostgreSQL database is already configured and accessible via TypeORM connection from NestJS API
2. **Email Service**: Assumes email service (e.g., SendGrid, AWS SES) is configured for sending password reset emails
3. **Environment Security**: Assumes JWT secret key is stored securely in environment variables and not committed to version control
4. **TypeORM Setup**: Assumes TypeORM is already configured in NestJS app with proper entity management and migrations
5. **Passport Integration**: Assumes Passport.js and passport-jwt packages are compatible with current NestJS version
6. **bcrypt Performance**: Assumes server has adequate CPU resources to handle bcrypt hashing without impacting response times
7. **Database Indexes**: Assumes database supports proper indexing on email field for efficient authentication queries
8. **Existing User Base**: Assumes relatively small existing user base that can be migrated in a single maintenance window
9. **Frontend Compatibility**: Assumes frontend AuthService can be refactored to use REST endpoints instead of Supabase SDK without major rewrites
10. **Token Storage**: Assumes frontend has secure storage mechanism for JWT tokens (httpOnly cookies recommended, or secure localStorage)
11. **Single-Server Deployment**: Initial implementation assumes single-server deployment. Horizontal scaling may require additional session management strategy (e.g., Redis for token blacklist).

## Dependencies

- **NestJS Framework**: Requires @nestjs/common, @nestjs/core, @nestjs/passport for auth implementation
- **Passport.js**: Requires passport, passport-jwt, @nestjs/jwt for JWT strategy
- **bcrypt**: Requires bcrypt package for password hashing
- **TypeORM**: Requires typeorm, @nestjs/typeorm for database access
- **PostgreSQL Database**: Requires running Postgres instance with connection credentials
- **Email Service**: Requires configured email provider for password reset emails (SendGrid, AWS SES, or similar)
- **Environment Configuration**: Requires .env variables: JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION, DATABASE_URL
- **Frontend AuthService**: Frontend must be updated to work with new auth endpoints (libs/features/auth/src/lib/services/auth.ts)
- **User Preferences Table**: Existing user_preferences table structure must remain compatible
- **Supabase Client Removal**: Must remove Supabase Auth SDK dependencies from frontend and backend after migration

## Out of Scope

- Social authentication (Google, Apple, Facebook OAuth) - remains out of scope
- Two-factor authentication (2FA) - future enhancement
- Biometric authentication - future enhancement
- Email verification on registration - future enhancement (users can sign in immediately)
- Account deletion endpoint - separate feature
- Password strength meter UI - frontend enhancement
- Remember me / persistent sessions beyond token expiry - future enhancement
- Magic link / passwordless authentication - removed with Supabase (could be re-implemented later)
- Session management across devices - basic support via refresh tokens, advanced features (view all sessions, revoke specific sessions) are future enhancements
- Token rotation strategy - future security enhancement
- Refresh token reuse detection - future security enhancement
- Role-based access control (RBAC) - future enhancement when admin features are added

## Notes

- All password handling must follow OWASP best practices for secure password storage
- JWT secret key must be at least 256 bits (32 characters) for HS256 algorithm
- Consider using httpOnly cookies for token storage on frontend to prevent XSS token theft
- Rate limiting should be implemented at both API gateway level and auth endpoint level for defense in depth
- Database migrations must be carefully planned to avoid downtime during Supabase to self-hosted migration
- Monitor bcrypt work factor impact on response times and adjust if necessary (10-12 rounds recommended)
- Consider implementing refresh token rotation in future for enhanced security
- Password reset emails should include expiration time in user-friendly format
- Frontend error handling must be updated to parse new API error response format
- All existing tests relying on Supabase Auth SDK must be updated to mock new auth endpoints
