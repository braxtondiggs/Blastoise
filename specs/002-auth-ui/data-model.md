# Data Model: Authentication UI Components

**Feature**: 002-auth-ui
**Date**: 2025-01-03
**Status**: Complete

## Overview

This document defines the data entities and state management for the authentication UI components. The auth UI feature is primarily a frontend implementation that integrates with existing backend services (Supabase Auth, AuthService, AuthStateService).

**Note**: This feature does not introduce new database tables or backend entities. All data models are frontend TypeScript interfaces for form state, validation, and UI presentation.

---

## 1. LoginFormModel

**Purpose**: Represents the state of the login form including email/password inputs, magic link option, and validation state.

### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | `string` | Yes | Email format | User's email address for authentication |
| `password` | `string` | Yes (for password mode) | Min 8 chars | User's password (only for email/password mode) |
| `mode` | `'password' \| 'magic-link'` | Yes | Enum | Authentication mode selection |
| `rememberMe` | `boolean` | No | N/A | Whether to persist session (future enhancement) |

### Validation Rules

- **Email**: Must be valid email format (RFC 5322 compliant)
- **Password**: Required when `mode === 'password'`, min 8 characters
- **Mode**: Defaults to `'password'`

### State Transitions

```
Initial → Editing → Validating → Submitting → [Success | Error]
```

### Example TypeScript Interface

```typescript
export interface LoginFormModel {
  email: string;
  password: string;
  mode: 'password' | 'magic-link';
}

export interface LoginFormState {
  form: LoginFormModel;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
```

---

## 2. RegistrationFormModel

**Purpose**: Represents the state of the new account registration form with email, password, and confirmation fields.

### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | `string` | Yes | Email format, not already registered | User's email for new account |
| `password` | `string` | Yes | Password strength validator | User's chosen password |
| `confirmPassword` | `string` | Yes | Must match `password` | Password confirmation |
| `agreeToTerms` | `boolean` | Yes | Must be `true` | User consent to terms of service |

### Validation Rules

- **Email**: Valid format, unique (checked via Supabase on submit)
- **Password**: Min 8 chars, at least one letter, at least one number
- **ConfirmPassword**: Must exactly match `password` field
- **AgreeToTerms**: Must be `true` to enable submit button

### Password Strength Indicator

```typescript
export interface PasswordStrength {
  hasMinLength: boolean;    // >= 8 characters
  hasLetter: boolean;       // Contains a-zA-Z
  hasNumber: boolean;       // Contains 0-9
  isValid: boolean;         // All three above are true
}
```

### Example TypeScript Interface

```typescript
export interface RegistrationFormModel {
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface RegistrationFormState {
  form: RegistrationFormModel;
  passwordStrength: PasswordStrength;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
```

---

## 3. OnboardingStateModel

**Purpose**: Tracks the user's progress through the onboarding wizard and determines whether to show onboarding on app launch.

### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `currentStep` | `number` | Yes | 0 to totalSteps-1 | Current onboarding step index |
| `totalSteps` | `number` | Yes | Fixed at 4 | Total number of onboarding screens |
| `isComplete` | `boolean` | Yes | N/A | Whether user completed or skipped onboarding |
| `skipped` | `boolean` | Yes | N/A | Whether user clicked "Skip" vs "Get Started" |

### Onboarding Steps

| Step | Title | Content | Purpose |
|------|-------|---------|---------|
| 0 | "Welcome to Blastoise" | App overview and value proposition | Hook user interest |
| 1 | "Location Permissions" | Explanation of why location access is needed | Educate before requesting permission |
| 2 | "Privacy First" | Explanation of privacy approach (no GPS stored) | Build trust |
| 3 | "Get Started" | Choice between Sign In / Continue as Guest | Authentication decision |

### Persistence

- **Storage**: `localStorage` with key `onboarding_state`
- **Format**: JSON serialized `{ isComplete: boolean, skipped: boolean }`
- **Expiration**: Never (persists until user clears browser data)

### Example TypeScript Interface

```typescript
export interface OnboardingStep {
  title: string;
  content: string;
  iconClass?: string;    // DaisyUI icon class (optional)
}

export interface OnboardingStateModel {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  skipped: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Blastoise',
    content: 'Automatically track your brewery and winery visits with geofencing technology.',
  },
  {
    title: 'Location Permissions',
    content: 'Blastoise needs location access to detect when you visit breweries and wineries.',
  },
  {
    title: 'Privacy First',
    content: 'Your exact GPS coordinates are never stored. We only save venue references.',
  },
  {
    title: 'Get Started',
    content: 'Choose how you want to use Blastoise.',
  },
];
```

---

## 4. UpgradePromptModel

**Purpose**: Represents the state of the anonymous-to-authenticated account upgrade flow.

### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | `string` | Yes | Email format | Email for new account |
| `password` | `string` | Yes | Password strength | Password for new account |
| `confirmPassword` | `string` | Yes | Matches password | Password confirmation |
| `localVisitCount` | `number` | Yes | N/A | Number of local visits to migrate |
| `migrationStatus` | `'pending' \| 'in-progress' \| 'complete' \| 'failed'` | Yes | Enum | Data migration progress |

### Local Visit Count

The component queries IndexedDB to count anonymous visits before showing the upgrade prompt:

```typescript
// Pseudo-code for counting local visits
const localVisits = await visitRepository.getAll();
const localVisitCount = localVisits.length;
```

### Migration Status

- **pending**: Upgrade form displayed, user hasn't submitted yet
- **in-progress**: Account created, migrating local visits to cloud
- **complete**: All visits synced successfully
- **failed**: Migration error (shows retry option)

### Example TypeScript Interface

```typescript
export interface UpgradePromptModel {
  email: string;
  password: string;
  confirmPassword: string;
  localVisitCount: number;
  migrationStatus: 'pending' | 'in-progress' | 'complete' | 'failed';
}

export interface UpgradePromptState {
  form: UpgradePromptModel;
  isLoading: boolean;
  error: string | null;
  showPrompt: boolean;    // Whether to show upgrade prompt (only in anonymous mode)
}
```

---

## 5. PasswordResetModel

**Purpose**: Represents the two-step password reset flow (request email → reset password).

### Step 1: Request Reset Link

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | `string` | Yes | Email format | Email to send reset link to |

### Step 2: Set New Password (After Email Link Click)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `newPassword` | `string` | Yes | Password strength | New password |
| `confirmPassword` | `string` | Yes | Matches newPassword | Confirmation |
| `resetToken` | `string` | Yes (automatic) | N/A | Token from reset email URL |

### Example TypeScript Interface

```typescript
// Step 1: Request reset
export interface PasswordResetRequestModel {
  email: string;
}

export interface PasswordResetRequestState {
  form: PasswordResetRequestModel;
  isLoading: boolean;
  success: boolean;    // Email sent successfully
  error: string | null;
}

// Step 2: Set new password
export interface PasswordResetModel {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetState {
  form: PasswordResetModel;
  isLoading: boolean;
  success: boolean;
  error: string | null;
  tokenValid: boolean;    // Whether reset token from URL is valid
}
```

---

## 6. AuthCallbackModel

**Purpose**: Represents the state of the magic link callback handler.

### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `isProcessing` | `boolean` | Yes | N/A | Whether authentication is in progress |
| `error` | `string \| null` | No | N/A | Error message if token invalid/expired |
| `redirectUrl` | `string` | No | Valid URL | Where to redirect after successful auth |

### Token Validation

Supabase automatically processes the token from the URL hash fragment. The component only needs to:

1. Check if session exists after page load
2. Redirect to app if session valid
3. Show error if session invalid

### Example TypeScript Interface

```typescript
export interface AuthCallbackState {
  isProcessing: boolean;
  error: string | null;
  redirectUrl: string;    // Default: '/'
}
```

---

## 7. FormValidationError

**Purpose**: Standardized error messages for form validation across all auth components.

### Error Types

| Error Code | Field | Message |
|-----------|-------|---------|
| `REQUIRED` | Any | "{Field} is required" |
| `EMAIL_INVALID` | `email` | "Please enter a valid email address" |
| `EMAIL_ALREADY_REGISTERED` | `email` | "This email is already registered. Try signing in instead." |
| `PASSWORD_TOO_SHORT` | `password` | "Password must be at least 8 characters" |
| `PASSWORD_NO_LETTER` | `password` | "Password must contain at least one letter" |
| `PASSWORD_NO_NUMBER` | `password` | "Password must contain at least one number" |
| `PASSWORDS_DONT_MATCH` | `confirmPassword` | "Passwords do not match" |
| `TERMS_NOT_ACCEPTED` | `agreeToTerms` | "You must agree to the terms of service" |
| `NETWORK_ERROR` | N/A | "Connection issue. Please check your internet and try again." |
| `AUTH_FAILED` | N/A | "Invalid email or password" |
| `TOKEN_EXPIRED` | N/A | "This link has expired. Please request a new one." |

### Example TypeScript Interface

```typescript
export type ValidationErrorCode =
  | 'REQUIRED'
  | 'EMAIL_INVALID'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_NO_LETTER'
  | 'PASSWORD_NO_NUMBER'
  | 'PASSWORDS_DONT_MATCH'
  | 'TERMS_NOT_ACCEPTED'
  | 'NETWORK_ERROR'
  | 'AUTH_FAILED'
  | 'TOKEN_EXPIRED';

export interface FormValidationError {
  field: string | null;    // Null for form-level errors
  code: ValidationErrorCode;
  message: string;
}
```

---

## 8. AnonymousModeState (Existing)

**Purpose**: Existing auth state managed by `AuthStateService`. Included here for completeness.

### Fields (from libs/shared/auth-state)

| Field | Type | Description |
|-------|------|-------------|
| `isAnonymous` | `boolean` (signal) | Whether user is in anonymous mode |
| `isAuthenticated` | `boolean` (signal) | Whether user is authenticated |
| `currentUser` | `User \| null` (signal) | Current user object (authenticated or anonymous) |
| `session` | `Session \| null` (signal) | Supabase session (null for anonymous) |

### User Object Structure

```typescript
export interface User {
  id: string;                       // Supabase user ID or anonymous ID
  email: string;                    // Empty string for anonymous users
  created_at: string;               // ISO timestamp
  updated_at: string;               // ISO timestamp
  preferences: UserPreferences;     // User settings
}

export interface UserPreferences {
  location_tracking_enabled: boolean;
  sharing_default: 'private' | 'public' | 'friends';
  notification_settings: {
    visit_detected: boolean;
    visit_ended: boolean;
    new_venues_nearby: boolean;
    weekly_summary: boolean;
    sharing_notifications: boolean;
  };
  privacy_settings: {
    anonymous_mode: boolean;
    store_visit_history: boolean;
    share_location: boolean;
  };
  map_settings: {
    default_radius_km: number;
    show_visited_only: boolean;
    cluster_markers: boolean;
  };
}
```

**Source**: `libs/shared/models/user.ts` (existing)

---

## 9. Component State Hierarchy

```
AuthStateService (Global)
│
├── isAuthenticated: Signal<boolean>
├── isAnonymous: Signal<boolean>
├── currentUser: Signal<User | null>
└── session: Signal<Session | null>

LoginComponent (Local)
│
├── loginForm: FormGroup
├── isLoading: Signal<boolean>
├── error: Signal<string | null>
└── mode: Signal<'password' | 'magic-link'>

RegistrationComponent (Local)
│
├── registrationForm: FormGroup
├── passwordStrength: Signal<PasswordStrength>
├── isLoading: Signal<boolean>
└── error: Signal<string | null>

OnboardingComponent (Local)
│
├── currentStep: Signal<number>
├── isComplete: Signal<boolean>
└── steps: OnboardingStep[] (static)

UpgradePromptComponent (Local)
│
├── upgradeForm: FormGroup
├── localVisitCount: Signal<number>
├── migrationStatus: Signal<MigrationStatus>
├── isLoading: Signal<boolean>
└── error: Signal<string | null>

PasswordResetComponent (Local)
│
├── resetRequestForm: FormGroup (Step 1)
├── newPasswordForm: FormGroup (Step 2)
├── isLoading: Signal<boolean>
├── success: Signal<boolean>
└── error: Signal<string | null>

AuthCallbackComponent (Local)
│
├── isProcessing: Signal<boolean>
└── error: Signal<string | null>
```

---

## 10. Data Flow Diagrams

### Login Flow

```
User enters email/password
  ↓
LoginComponent validates form
  ↓
Calls AuthService.signInWithPassword()
  ↓
AuthService → Supabase Auth API
  ↓
Supabase returns session
  ↓
AuthService updates AuthStateService
  ↓
AuthStateService.isAuthenticated → true
  ↓
Router navigates to '/' (main app)
```

### Anonymous Mode Flow

```
User clicks "Continue as Guest"
  ↓
LoginComponent calls AuthService.enableAnonymousMode()
  ↓
AuthService sets localStorage flags
  ↓
AuthService creates anonymous user object
  ↓
AuthStateService.isAnonymous → true
  ↓
Router navigates to '/' (main app)
```

### Account Upgrade Flow

```
Anonymous user in settings
  ↓
Clicks "Upgrade to Account"
  ↓
UpgradePromptComponent displays
  ↓
User enters email/password
  ↓
Calls AuthService.upgradeToAuthenticated()
  ↓
AuthService creates Supabase account
  ↓
Visit Sync Service migrates local visits
  ↓
AuthStateService.isAnonymous → false
  ↓
AuthStateService.isAuthenticated → true
  ↓
Router navigates to '/'
```

---

## 11. Persistence Strategy

### localStorage Keys

| Key | Value Type | Purpose | Expiration |
|-----|-----------|---------|------------|
| `anonymous_mode` | `string` (`'true'` or `'false'`) | Anonymous mode flag | Never |
| `anonymous_user_id` | `string` (`anon_{uuid}`) | Anonymous user ID | Never |
| `onboarding_complete` | `string` (`'true'` or `'false'`) | Onboarding completion | Never |

### Supabase Storage (Existing)

| Table | Columns | Purpose |
|-------|---------|---------|
| `auth.users` | `id, email, created_at, ...` | Authenticated user accounts (managed by Supabase) |
| `user_preferences` | `user_id, location_tracking_enabled, sharing_default, ...` | User settings (existing) |

**Note**: Anonymous users do NOT create rows in these tables. Their data is local-only.

---

## Summary

This feature is primarily a **frontend-only** implementation with the following characteristics:

1. **No New Database Tables**: All data models are TypeScript interfaces for form state
2. **Existing Backend Integration**: Uses `AuthService` and `AuthStateService` (already implemented)
3. **localStorage for Anonymous Mode**: Device-specific state, no backend storage
4. **Supabase for Authenticated Users**: Existing `auth.users` and `user_preferences` tables
5. **Signal-Based State**: Angular signals for reactive UI updates
6. **Form-Driven Validation**: Reactive forms with custom validators

All entities defined here are ephemeral UI state except for:
- `anonymous_mode` and `anonymous_user_id` (localStorage)
- `onboarding_complete` (localStorage)
- Authenticated user data (Supabase `auth.users` table)
