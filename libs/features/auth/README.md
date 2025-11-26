# Auth Feature Library

**Location**: `libs/features/auth`
**Purpose**: Reusable authentication components, services, and guards for web and mobile platforms

## Components

### 1. LoginComponent (`login.ts`)

**Purpose**: Email/password and magic link sign-in

**Features**:

- ✅ Email/password authentication
- ✅ Magic link (passwordless) authentication
- ✅ Mode toggle (password | magic-link)
- ✅ "Continue as Guest" anonymous mode
- ✅ Form validation with inline errors
- ✅ Loading states with disabled inputs
- ✅ Error message mapping
- ✅ ARIA attributes for accessibility

**Signals**:

- `mode`: `'password' | 'magic-link'`
- `isLoading`: `boolean`
- `error`: `string | null`
- `showSuccessMessage`: `boolean` (for magic link sent confirmation)

**Forms**:

- Email: required, email format
- Password: required, min 8 characters (only when mode === 'password')

**Usage**:

```typescript
import { LoginComponent } from '@blastoise/features/auth';

// In template
<lib-login></lib-login>
```

---

### 2. RegistrationComponent (`registration.ts`)

**Purpose**: New account creation with password strength validation

**Features**:

- ✅ Email, password, confirmPassword, agreeToTerms fields
- ✅ Password strength checklist (min length, letter, number)
- ✅ Password confirmation matching
- ✅ Terms of service checkbox
- ✅ Loading states with disabled inputs
- ✅ Error message mapping
- ✅ ARIA attributes

**Signals**:

- `isLoading`: `boolean`
- `error`: `string | null`
- `passwordStrength`: `PasswordStrengthDetails`

**Forms**:

- Email: required, email format
- Password: required, min 8 chars, password strength validator
- ConfirmPassword: required, must match password
- AgreeToTerms: required (checkbox)

**Usage**:

```typescript
import { RegistrationComponent } from '@blastoise/features/auth';

<lib-registration></lib-registration>
```

---

### 3. AuthCallbackComponent (`auth-callback.ts`)

**Purpose**: Handle magic link email callback authentication

**Features**:

- ✅ Processes magic link token from URL
- ✅ Validates session after email link click
- ✅ Loading indicator while processing
- ✅ Error display for invalid/expired tokens
- ✅ Automatic redirect to main app on success
- ✅ ARIA live regions

**Signals**:

- `isProcessing`: `boolean`
- `error`: `string | null`

**Usage**:

```typescript
import { AuthCallbackComponent } from '@blastoise/features/auth';

// Route: /auth/callback
<lib-auth-callback></lib-auth-callback>
```

---

### 4. UpgradePromptComponent (`upgrade-prompt.ts`)

**Purpose**: Upgrade anonymous users to authenticated accounts

**Features**:

- ✅ Shows local visit count from IndexedDB
- ✅ Email, password, confirmPassword form
- ✅ Migration status tracking (pending | in-progress | complete | failed)
- ✅ Progress indicators during migration
- ✅ Retry button on failure
- ✅ Benefits list (sync, backup, sharing)
- ✅ Loading states and error handling
- ✅ ARIA attributes

**Signals**:

- `localVisitCount`: `number`
- `migrationStatus`: `'pending' | 'in-progress' | 'complete' | 'failed'`
- `isLoading`: `boolean`
- `error`: `string | null`
- `visible`: `computed` (based on AuthStateService.isAnonymous)

**Forms**:

- Email: required, email format
- Password: required, min 8 chars, password strength
- ConfirmPassword: required, must match password

**Usage**:

```typescript
import { UpgradePromptComponent } from '@blastoise/features/auth';

// Only shows when user is anonymous
<lib-upgrade-prompt></lib-upgrade-prompt>
```

---

### 5. OnboardingComponent (`onboarding.ts`)

**Purpose**: First-time user onboarding wizard (4 steps)

**Features**:

- ✅ 4-step wizard (Welcome, Location, Privacy, Get Started)
- ✅ Progress indicator with animated dots
- ✅ Back/Skip/Next navigation
- ✅ localStorage completion tracking
- ✅ Auth options on final step (Sign In / Continue as Guest)
- ✅ ARIA progressbar and labels
- ✅ Skippable flow

**Signals**:

- `currentStep`: `number` (0-3)

**Steps**:

1. Welcome to Blastoise
2. Location Permissions explanation
3. Privacy-first approach
4. Get Started (auth options)

**Usage**:

```typescript
import { OnboardingComponent } from '@blastoise/features/auth';

// Show on first visit
<lib-onboarding></lib-onboarding>
```

---

### 6. PasswordResetComponent (`password-reset.ts`)

**Purpose**: Two-step password reset flow

**Features**:

- ✅ Step 1: Request reset link (email form)
- ✅ Step 2: Set new password (after clicking email link)
- ✅ Mode detection from URL session
- ✅ Success messages for both steps
- ✅ Loading states and error handling
- ✅ Password strength validation
- ✅ ARIA attributes

**Signals**:

- `mode`: `'request' | 'reset'`
- `isLoading`: `boolean`
- `error`: `string | null`
- `success`: `boolean`

**Forms**:

- **Request mode**: Email (required, email format)
- **Reset mode**: NewPassword, ConfirmPassword (required, min 8 chars, strength validation)

**Usage**:

```typescript
import { PasswordResetComponent } from '@blastoise/features/auth';

// Route: /auth/password-reset
<lib-password-reset></lib-password-reset>
```

---

## Services

### AuthService (`services/auth.ts`)

**Purpose**: Core authentication service using self-hosted JWT authentication

**Methods**:

- `signInWithPassword(email, password)`: Email/password login
- `signUp(email, password)`: Create new account
- `signOut()`: Sign out current user
- `refreshToken()`: Refresh access token using httpOnly cookie
- `getAccessToken()`: Get current access token from memory
- `enableAnonymousMode()`: Enable anonymous mode with localStorage
- `upgradeToAuthenticated(email, password)`: Upgrade anonymous to authenticated
- `forgotPassword(email)`: Request password reset email
- `resetPassword(token, newPassword)`: Reset password with token

**Signals** (from AuthStateService):

- `isAuthenticated`: `Signal<boolean>`
- `isAnonymous`: `Signal<boolean>`
- `currentUser`: `Signal<User | null>`
- `session`: `Signal<AuthSession | null>`

---

### FormValidators (`services/form-validators.ts`)

**Custom validators for authentication forms**:

- `passwordStrengthValidator`: Requires 8+ chars, letter, number
- `passwordMatchValidator`: Individual control validator for confirm password
- `passwordsMatchValidator`: Form-level validator for password matching
- `emailValidator`: Stricter email validation (RFC 5322 compliant)
- `getPasswordStrength(control)`: Returns password strength details

---

## Loading States & Error Handling Audit (Phase 10)

### ✅ Loading State Consistency (T136-T137)

All components implement:

- `isLoading` signal
- Form disable during loading: `[disabled]="isLoading()"`
- Submit button disable: `[disabled]="form.invalid || isLoading()"`
- Loading spinner in submit button: `@if (isLoading()) { <span class="loading loading-spinner loading-sm"></span> }`

**Verified in**:

- ✅ LoginComponent
- ✅ RegistrationComponent
- ✅ UpgradePromptComponent
- ✅ PasswordResetComponent
- ✅ AuthCallbackComponent (uses `isProcessing` instead of `isLoading`)

---

### ✅ Error Message Display (T138)

All components implement:

- `error` signal: `Signal<string | null>`
- Error mapping via `mapErrorMessage()` method
- Display with `role="alert"` for screen readers
- User-friendly messages (no technical jargon)

**Common error mappings**:

- "already registered" → "This email is already registered. Try signing in instead."
- "network"/"fetch" → "Connection issue. Please check your internet and try again."
- "invalid credentials" → "Invalid email or password"
- "expired"/"invalid token" → "This link has expired. Please request a new one."

---

### ✅ ARIA Attributes (T139)

All forms implement:

- `[attr.aria-busy]="isLoading()"` on `<form>` element
- `aria-required="true"` on required inputs
- `[attr.aria-invalid]="controlInvalid"` on inputs with errors
- `[attr.aria-describedby]="error-id"` linking inputs to error messages
- `role="alert"` on error spans
- `aria-label` on submit buttons (changes during loading)

---

### ✅ Network Error Detection (T140)

All API calls wrapped in try/catch with error mapping:

```typescript
try {
  const result = await this.authService.method();
  if (result.error) {
    this.error.set(mapAuthError(result.error));
  }
} catch (err) {
  this.error.set('An unexpected error occurred. Please try again.');
  console.error('Operation failed:', err);
}
```

---

### ✅ Success Message Auto-Dismiss (T141)

Implemented where appropriate:

- **LoginComponent**: Magic link success message auto-dismisses after 5 seconds
- **PasswordResetComponent**: Success messages show with manual navigation
- **UpgradePromptComponent**: Success shown briefly before redirect (1.5 seconds)

---

## Styling Guidelines

All components follow strict Tailwind CSS v4 conventions:

**✅ DO**:

- Use inline Tailwind utility classes directly in templates
- Use DaisyUI component classes (`btn`, `card`, `input`, `alert`, `modal`)
- Use semantic HTML with proper roles and ARIA labels

**❌ DON'T**:

- Create separate CSS files for components
- Use `@apply` directives
- Use `styleUrls` in component decorators

**Exception**: Custom CSS allowed only for animations or third-party library integration (must document why)

---

## Accessibility Standards

All components meet **WCAG 2.1 AA** requirements:

- ✅ Semantic HTML (form, label, button)
- ✅ Keyboard navigation (tab order, Enter to submit)
- ✅ Screen reader support (ARIA labels, live regions, role="alert")
- ✅ Focus indicators (DaisyUI default focus styles)
- ✅ Color contrast (DaisyUI theme compliant)
- ✅ Error announcements (role="alert" on error messages)

---

## Common Patterns

### Loading State Pattern

```typescript
readonly isLoading = signal(false);

async onSubmit() {
  this.isLoading.set(true);
  try {
    // Perform operation
  } finally {
    this.isLoading.set(false);
  }
}
```

### Error Handling Pattern

```typescript
readonly error = signal<string | null>(null);

async onSubmit() {
  this.error.set(null); // Clear previous errors
  try {
    const { error } = await this.authService.method();
    if (error) {
      this.error.set(this.mapErrorMessage(error));
    }
  } catch (err) {
    this.error.set('An unexpected error occurred. Please try again.');
  }
}

private mapErrorMessage(error: Error): string {
  return mapAuthError(error);
}
```

### Form Validation Pattern

```typescript
readonly form = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
});

get emailInvalid(): boolean {
  const control = this.form.controls.email;
  return control.invalid && control.touched;
}
```

---

## Testing (Recommended but Optional per Constitution v1.1.0)

Unit tests exist for all components and services but are not required for deployment.

Run tests: `npx nx test auth`

---

## Version History

- **v1.2.0** (2025-11-03): Added password reset, onboarding, upgrade prompt, comprehensive README
- **v1.1.0** (2025-11-02): Added registration component, magic link, anonymous mode
- **v1.0.0** (2025-10-31): Initial release with login component and AuthService

---

## License

Internal use only - Blastoise project
