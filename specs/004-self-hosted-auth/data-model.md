# Data Model: Self-Hosted Authentication System

**Feature**: 004-self-hosted-auth
**Date**: 2025-01-18
**Status**: Design Complete

## Overview

This document defines the data entities and relationships for the self-hosted authentication system replacing Supabase Auth. All entities use PostgreSQL with TypeORM for object-relational mapping.

---

## Entity Definitions

### User

Represents a registered user account with authentication credentials.

**Fields**:
- `id` (UUID, PK): Unique user identifier
- `email` (string, unique, indexed): User's email address (lowercase, validated)
- `password_hash` (string): Bcrypt-hashed password (never store plaintext)
- `created_at` (timestamp): Account creation timestamp
- `updated_at` (timestamp): Last account modification timestamp

**Relationships**:
- One-to-Many with `RefreshToken` (user can have multiple active sessions)
- One-to-Many with `PasswordResetToken` (user can have multiple pending reset requests)
- One-to-One with `UserPreferences` (via user_id foreign key)

**Validation Rules**:
- Email must be valid format (regex: RFC 5322)
- Email is case-insensitive (stored as lowercase)
- Password must meet requirements before hashing: min 8 chars, at least one letter and one number
- Password hash must be bcrypt format with 10+ rounds
- Cannot have duplicate emails (enforced by unique constraint)

**Indexes**:
- Primary key index on `id`
- Unique index on `email` (for fast login lookups)
- Index on `created_at` (for user analytics)

**State Transitions**:
- Created → Active (upon successful registration)
- Active → Locked (after rate limit violations, if implemented)
- Active → Deleted (soft delete, if account deletion feature added)

---

### RefreshToken

Represents long-lived refresh tokens for session management and token revocation.

**Fields**:
- `id` (UUID, PK): Unique token identifier
- `token_hash` (string, indexed): Hashed refresh token (SHA256 of actual token)
- `user_id` (UUID, FK to User): Owner of this refresh token
- `expires_at` (timestamp, indexed): Token expiration time
- `created_at` (timestamp): Token issuance time
- `revoked_at` (timestamp, nullable): Time token was revoked (null if active)

**Relationships**:
- Many-to-One with `User` (multiple tokens per user for multi-device support)

**Validation Rules**:
- Token hash must be SHA256 format (64 hex characters)
- Expires_at must be in the future at creation time
- Token must be unique (enforced by unique constraint on token_hash)
- User_id must reference existing user (foreign key constraint)

**Indexes**:
- Primary key index on `id`
- Unique index on `token_hash` (for fast token validation)
- Index on `user_id` (for user session queries)
- Index on `expires_at` (for cleanup jobs)
- Composite index on `(user_id, revoked_at)` (for active session queries)

**State Transitions**:
- Created → Active (immediately upon issuance)
- Active → Expired (when current time > expires_at)
- Active → Revoked (on logout or security event, revoked_at set)

**Lifecycle**:
- Created on login or token refresh
- Automatically expired after 7 days
- Revoked on logout
- Cleaned up by background job (delete tokens where expires_at < now() - 30 days)

---

### PasswordResetToken

Represents temporary tokens for password reset flow with single-use enforcement.

**Fields**:
- `id` (UUID, PK): Unique token identifier
- `token_hash` (string, indexed): Hashed reset token (SHA256 of actual token)
- `user_id` (UUID, FK to User): User requesting password reset
- `expires_at` (timestamp, indexed): Token expiration time (1 hour from creation)
- `used` (boolean, default false): Whether token has been used
- `created_at` (timestamp): Token creation time

**Relationships**:
- Many-to-One with `User` (user can have multiple pending reset requests)

**Validation Rules**:
- Token hash must be SHA256 format (64 hex characters)
- Expires_at must be exactly 1 hour from created_at
- Token must be unique (enforced by unique constraint on token_hash)
- User_id must reference existing user (foreign key constraint)
- Used flag cannot transition from true to false (one-way state)

**Indexes**:
- Primary key index on `id`
- Unique index on `token_hash` (for fast token lookups)
- Index on `user_id` (for user reset history)
- Index on `expires_at` (for cleanup jobs)
- Composite index on `(user_id, used, expires_at)` (for valid token queries)

**State Transitions**:
- Created → Active (immediately upon request)
- Active → Expired (after 1 hour)
- Active → Used (on successful password reset, used = true)
- Active → Superseded (when new reset requested, previous becomes invalid)

**Lifecycle**:
- Created on password reset request
- Automatically expires after 1 hour
- Marked as used after successful password change
- Only one active (unused, non-expired) token per user at a time
- Cleaned up by background job (delete tokens where expires_at < now() - 7 days)

---

### UserPreferences (Existing Entity)

Represents user settings and preferences. This entity already exists in the codebase and will be preserved during migration.

**Fields** (from existing schema):
- `user_id` (UUID, PK, FK to User): User identifier
- `location_tracking_enabled` (boolean): Whether location tracking is enabled
- `background_tracking_enabled` (boolean): Background location tracking permission
- `sharing_preference` (enum: 'never' | 'ask' | 'always'): Default sharing behavior
- `data_retention_months` (integer, nullable): Custom data retention period
- `notifications_enabled` (boolean): Master notification toggle
- `notification_preferences` (JSONB): Detailed notification settings
- `created_at` (timestamp): Preferences creation time
- `updated_at` (timestamp): Last preference update

**Relationships**:
- One-to-One with `User` (each user has one preferences record)

**Migration Notes**:
- No schema changes required
- Foreign key remains `user_id` (pointing to new User entity)
- Existing data is preserved during Supabase to self-hosted migration
- Default preferences are created automatically on user registration

---

## Relationships Diagram

```text
┌─────────────────┐
│      User       │
│  (id, email,    │
│  password_hash) │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴─────────────────────┬─────────────────────┐
    │                          │                     │
    │                          │                     │
    v                          v                     v
┌───────────────┐    ┌──────────────────┐    ┌────────────────┐
│ RefreshToken  │    │PasswordResetToken│    │UserPreferences │
│ (token_hash,  │    │   (token_hash,   │    │  (settings,    │
│  expires_at)  │    │   used, expires) │    │   preferences) │
└───────────────┘    └──────────────────┘    └────────────────┘
    N tokens              N tokens                 1:1
   per user              per user
```

---

## Database Constraints

### Foreign Keys
- `RefreshToken.user_id` → `User.id` (CASCADE DELETE)
- `PasswordResetToken.user_id` → `User.id` (CASCADE DELETE)
- `UserPreferences.user_id` → `User.id` (CASCADE DELETE)

**Rationale**: CASCADE DELETE ensures referential integrity. When a user is deleted, all associated tokens and preferences are automatically removed.

### Unique Constraints
- `User.email` (UNIQUE, case-insensitive)
- `RefreshToken.token_hash` (UNIQUE)
- `PasswordResetToken.token_hash` (UNIQUE)
- `UserPreferences.user_id` (UNIQUE, enforces 1:1 with User)

### Check Constraints
- `User.email` must match email regex pattern
- `RefreshToken.expires_at` > `RefreshToken.created_at`
- `PasswordResetToken.expires_at` > `PasswordResetToken.created_at`

---

## TypeORM Entity Examples

### User Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'varchar', length: 255 })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
  refresh_tokens: RefreshToken[];

  @OneToMany(() => PasswordResetToken, (token) => token.user, { cascade: true })
  password_reset_tokens: PasswordResetToken[];

  @OneToOne(() => UserPreferences, (prefs) => prefs.user, { cascade: true })
  preferences: UserPreferences;
}
```

### RefreshToken Entity

```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'varchar', length: 64 })
  @Index()
  token_hash: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'timestamp' })
  @Index()
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  revoked_at: Date | null;

  @ManyToOne(() => User, (user) => user.refresh_tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

### PasswordResetToken Entity

```typescript
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'varchar', length: 64 })
  @Index()
  token_hash: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'timestamp' })
  @Index()
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.password_reset_tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

---

## Data Migration Strategy

### From Supabase Auth to Self-Hosted

**User Migration**:
1. Export Supabase `auth.users` table via pg_dump
2. Map Supabase fields to new User entity:
   - `id` → `id` (preserve UUIDs)
   - `email` → `email` (lowercase)
   - `encrypted_password` → `password_hash` (bcrypt compatible)
   - `created_at` → `created_at`
   - `updated_at` → `updated_at`
3. Import data into new `users` table

**UserPreferences Migration**:
1. No schema changes required
2. Update foreign key reference from Supabase auth.users to new users table
3. Verify all user_id values exist in migrated users table

**RefreshToken Creation**:
- Not migrated (fresh start)
- All users will need to re-authenticate once to receive new refresh tokens
- Existing Supabase sessions gracefully expire

**PasswordResetToken**:
- Not migrated (invalidate all pending resets)
- Users with pending resets must request new reset after migration

---

## Security Considerations

### Password Storage
- Never store plaintext passwords
- Use bcrypt with 10+ rounds (service layer hashing)
- Never log password_hash values
- Password validation happens before hashing

### Token Security
- Store hashed tokens (SHA256) in database, not plaintext
- Actual tokens are 32+ bytes of cryptographically random data
- Tokens transmitted only over HTTPS
- Refresh tokens stored in httpOnly cookies (XSS protection)
- Expired tokens cleaned up regularly to minimize DB bloat

### Rate Limiting
- Login attempts: 3 per 60 seconds per IP
- Registration: 5 per 60 seconds per IP
- Password reset requests: 3 per 60 seconds per email
- Token refresh: 10 per 60 seconds per user

### Defense in Depth
- Database-level constraints prevent data corruption
- Application-level validation provides user-friendly errors
- Service-layer business logic enforces security rules
- Guards and interceptors enforce authentication at API level

---

## Indexes for Performance

### Query Patterns and Indexes

**Login (find user by email)**:
```sql
SELECT * FROM users WHERE email = ?
```
Index: `users(email)` UNIQUE

**Token Validation (find refresh token)**:
```sql
SELECT * FROM refresh_tokens
WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
```
Index: `refresh_tokens(token_hash)` UNIQUE

**User Sessions (find all active tokens for user)**:
```sql
SELECT * FROM refresh_tokens
WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
```
Index: `refresh_tokens(user_id, revoked_at, expires_at)` COMPOSITE

**Password Reset Validation**:
```sql
SELECT * FROM password_reset_tokens
WHERE token_hash = ? AND used = false AND expires_at > NOW()
```
Index: `password_reset_tokens(token_hash)` UNIQUE

**Cleanup Jobs (delete expired tokens)**:
```sql
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days'
DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL '7 days'
```
Index: `refresh_tokens(expires_at)`, `password_reset_tokens(expires_at)`

---

## Background Jobs

### Token Cleanup Job
**Schedule**: Daily at 2:00 AM UTC
**Purpose**: Remove expired tokens to prevent database bloat

```sql
-- Remove refresh tokens expired more than 30 days ago
DELETE FROM refresh_tokens
WHERE expires_at < NOW() - INTERVAL '30 days';

-- Remove password reset tokens expired more than 7 days ago
DELETE FROM password_reset_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';
```

### User Analytics Job (Future)
**Schedule**: Weekly
**Purpose**: Generate user growth and retention metrics
**Queries**:
- New users per week: `COUNT(*) WHERE created_at > NOW() - INTERVAL '7 days'`
- Active users: `COUNT(DISTINCT user_id) FROM refresh_tokens WHERE created_at > NOW() - INTERVAL '30 days'`

---

## Schema Evolution

### Future Enhancements

**User Entity Additions**:
- `email_verified` (boolean): Email verification status
- `last_login_at` (timestamp): Track user activity
- `failed_login_attempts` (integer): Account lockout support
- `locked_until` (timestamp): Temporary account locks

**RefreshToken Enhancements**:
- `device_info` (JSONB): Track device/browser for session management
- `ip_address` (string): Geolocation and security auditing
- `last_used_at` (timestamp): Track inactive sessions

**New Entities**:
- `EmailVerificationToken`: Email verification flow
- `TwoFactorAuth`: 2FA secrets and backup codes
- `AuditLog`: Security event logging
- `UserRole`: Role-based access control (RBAC)

**Migration Strategy**:
- Use TypeORM migrations for schema changes
- Version migrations with timestamps
- Test migrations on staging before production
- Maintain backward compatibility for API contracts
