# Technical Research: Authentication UI Components

**Feature**: 002-auth-ui
**Date**: 2025-01-03
**Status**: Complete

## Research Questions

This document consolidates technical research for implementing authentication UI components in the Blastoise application. The research focuses on best practices for Angular reactive forms, accessibility patterns, form validation strategies, and integration with existing Supabase authentication.

---

## 1. Angular Reactive Forms with Signals

### Decision
Use Angular Reactive Forms with FormBuilder and integrate with Angular signals for reactive state management.

### Rationale
- **Type Safety**: Reactive forms provide compile-time type checking for form controls
- **Signals Integration**: Angular 20+ signals work seamlessly with reactive forms through `toSignal()` helper
- **Testability**: Reactive forms are easier to test than template-driven forms (no DOM required)
- **Validation Control**: Fine-grained control over validation timing and error messages
- **Best Practice**: Angular team recommends reactive forms for complex forms with dynamic validation

### Alternatives Considered
1. **Template-Driven Forms**: Rejected because they lack type safety, harder to test, and less control over validation timing
2. **FormGroup without FormBuilder**: Rejected because FormBuilder reduces boilerplate and improves readability
3. **Pure Signals without Forms API**: Rejected because it requires reimplementing validation logic that reactive forms provide

### Implementation Pattern
```typescript
// Example: Login component with reactive forms + signals
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  // Form definition with typed controls
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // Convert form state to signals for reactive templates
  readonly isValid = toSignal(this.loginForm.statusChanges.pipe(
    map(() => this.loginForm.valid)
  ), { initialValue: false });

  readonly isLoading = signal(false);

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    const { email, password } = this.loginForm.value;
    const { error } = await this.authService.signInWithPassword(email!, password!);
    this.isLoading.set(false);

    if (error) {
      // Handle error (show in template)
    }
  }
}
```

**Sources**:
- Angular Documentation: "Reactive Forms" (https://angular.io/guide/reactive-forms)
- Angular Blog: "Signals in Angular" (https://blog.angular.io/angular-signals)

---

## 2. Real-Time Form Validation with Error Messages

### Decision
Use reactive form validators with `updateOn: 'blur'` for most fields and immediate validation for critical fields (email format). Display inline error messages below each field.

### Rationale
- **User Experience**: Validating on blur (when user leaves field) is less intrusive than validating on every keystroke
- **Immediate Feedback**: Email/password format validation on blur provides quick feedback without being annoying
- **Accessibility**: Inline errors are announced by screen readers when they appear
- **Best Practice**: Material Design and Nielsen Norman Group recommend "on blur" validation as the sweet spot

### Alternatives Considered
1. **Validate on Submit Only**: Rejected because users don't discover errors until they try to submit
2. **Validate on Every Keystroke**: Rejected because it's frustrating (shows errors while user is still typing)
3. **Validate After 500ms Debounce**: Rejected because blur validation is simpler and equally effective

### Implementation Pattern
```typescript
// Form configuration
readonly loginForm = this.fb.group({
  email: ['', {
    validators: [Validators.required, Validators.email],
    updateOn: 'blur' // Validate when user leaves the field
  }],
  password: ['', {
    validators: [Validators.required, Validators.minLength(8)],
    updateOn: 'blur'
  }],
});

// Template error display
<input
  formControlName="email"
  class="input input-bordered w-full"
  type="email"
  placeholder="Email"
  aria-describedby="email-error"
/>
@if (loginForm.controls.email.invalid && loginForm.controls.email.touched) {
  <span id="email-error" class="text-error text-sm" role="alert">
    @if (loginForm.controls.email.errors?.['required']) {
      Email is required
    }
    @if (loginForm.controls.email.errors?.['email']) {
      Please enter a valid email address
    }
  </span>
}
```

**Sources**:
- Nielsen Norman Group: "Website Forms Usability: Top 10 Recommendations"
- W3C Web Accessibility Initiative: "Form Instructions and Validation"

---

## 3. Password Validation Requirements

### Decision
Enforce minimum 8 characters with at least one letter and one number. Display requirements as a checklist below the password field with real-time updates.

### Rationale
- **Security Baseline**: NIST guidelines recommend minimum 8 characters
- **Balance**: More complex than "8 chars only" but less frustrating than requiring symbols/uppercase/lowercase
- **User Feedback**: Checklist provides clear guidance on what's needed
- **Consistency**: Matches Supabase default password policy

### Alternatives Considered
1. **Minimum 12 Characters, No Complexity**: Rejected because users prefer shorter passwords with some complexity
2. **8 Chars + Upper + Lower + Number + Symbol**: Rejected because research shows this frustrates users and leads to weaker passwords (e.g., "Password1!")
3. **Passphrase Only (3+ words)**: Rejected because it's harder to enforce and explain

### Implementation Pattern
```typescript
// Custom validator
export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';

  const hasMinLength = value.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  const valid = hasMinLength && hasLetter && hasNumber;

  return valid ? null : {
    passwordStrength: {
      hasMinLength,
      hasLetter,
      hasNumber
    }
  };
}

// Template checklist
<ul class="text-sm mt-2 space-y-1">
  <li class="flex items-center gap-2">
    <span class="{{hasMinLength ? 'text-success' : 'text-base-content/50'}}">
      {{hasMinLength ? '✓' : '○'}} At least 8 characters
    </span>
  </li>
  <li class="flex items-center gap-2">
    <span class="{{hasLetter ? 'text-success' : 'text-base-content/50'}}">
      {{hasLetter ? '✓' : '○'}} At least one letter
    </span>
  </li>
  <li class="flex items-center gap-2">
    <span class="{{hasNumber ? 'text-success' : 'text-base-content/50'}}">
      {{hasNumber ? '✓' : '○'}} At least one number
    </span>
  </li>
</ul>
```

**Sources**:
- NIST Special Publication 800-63B: Digital Identity Guidelines
- Microsoft Research: "Do Strong Web Passwords Accomplish Anything?"

---

## 4. Loading States and Disabled Form Inputs

### Decision
Show loading spinner in submit button, disable all form inputs during submission, and preserve button text with spinner overlay.

### Rationale
- **Visual Feedback**: Spinner indicates progress, disabled inputs prevent duplicate submissions
- **Button Label Preservation**: Keeping "Sign In" text with spinner is clearer than replacing text with "Loading..."
- **Best Practice**: Disabling the entire form prevents user confusion about which fields they can still modify
- **Accessibility**: `aria-busy` attribute announces loading state to screen readers

### Alternatives Considered
1. **Only Disable Submit Button**: Rejected because users might edit form during submission (creates race condition)
2. **Replace Button Text with "Loading..."**: Rejected because it's less informative than button text + spinner
3. **Overlay Entire Form**: Rejected because it's too heavy-handed for short operations (<2 seconds)

### Implementation Pattern
```typescript
// Template
<form [formGroup]="loginForm" (ngSubmit)="onSubmit()" [attr.aria-busy]="isLoading()">
  <input
    formControlName="email"
    [disabled]="isLoading()"
    class="input input-bordered w-full"
  />

  <button
    type="submit"
    class="btn btn-primary w-full"
    [disabled]="loginForm.invalid || isLoading()"
  >
    @if (isLoading()) {
      <span class="loading loading-spinner loading-sm"></span>
    }
    Sign In
  </button>
</form>
```

**Sources**:
- Material Design: "Buttons: Loading State"
- Luke Wroblewski: "Web Form Design Best Practices"

---

## 5. ARIA Labels and Keyboard Navigation

### Decision
Use semantic HTML (`<form>`, `<label>`, `<button>`) with explicit ARIA labels, roles, and live regions for dynamic content. Ensure tab order is logical and Enter key submits forms.

### Rationale
- **Accessibility First**: Semantic HTML provides baseline accessibility for free
- **Screen Reader Support**: ARIA labels and live regions ensure screen readers announce form states
- **Keyboard Users**: Proper tab order and Enter-to-submit are essential for keyboard-only users
- **WCAG 2.1 AA Compliance**: Required by project constitution (Principle III)

### Alternatives Considered
1. **Rely Only on Semantic HTML**: Rejected because dynamic error messages need `role="alert"` to be announced
2. **Use aria-label on Every Element**: Rejected because it's redundant when `<label>` is sufficient
3. **Skip Keyboard Navigation Testing**: Rejected because it violates accessibility requirements

### Implementation Pattern
```typescript
// Template with ARIA
<form
  [formGroup]="loginForm"
  (ngSubmit)="onSubmit()"
  role="form"
  aria-labelledby="login-heading"
>
  <h2 id="login-heading" class="text-2xl font-bold mb-4">Sign In</h2>

  <label for="email-input" class="label">
    <span class="label-text">Email</span>
  </label>
  <input
    id="email-input"
    formControlName="email"
    type="email"
    class="input input-bordered w-full"
    aria-required="true"
    aria-invalid="{{emailInvalid()}}"
    aria-describedby="email-error"
  />
  @if (emailInvalid()) {
    <span id="email-error" role="alert" class="text-error text-sm">
      Please enter a valid email address
    </span>
  }

  <button
    type="submit"
    class="btn btn-primary w-full mt-4"
    [disabled]="loginForm.invalid || isLoading()"
    aria-label="{{isLoading() ? 'Signing in...' : 'Sign in to your account'}}"
  >
    Sign In
  </button>
</form>
```

**Sources**:
- W3C WAI-ARIA Authoring Practices 1.2: "Form Properties"
- WebAIM: "Creating Accessible Forms"
- WCAG 2.1: Success Criterion 4.1.2 (Name, Role, Value)

---

## 6. DaisyUI Component Usage for Consistent Styling

### Decision
Use DaisyUI component classes (`btn`, `card`, `input`, `alert`, `modal`) with inline Tailwind utilities for layout and spacing. No custom CSS files.

### Rationale
- **Design System**: DaisyUI provides consistent component styling across the app
- **Tailwind v4 Compliance**: Project requires inline Tailwind classes only (no separate CSS files)
- **Maintainability**: Using established component classes reduces custom styling code
- **Theming**: DaisyUI themes work automatically (light/dark mode support)

### Alternatives Considered
1. **Pure Tailwind Without DaisyUI**: Rejected because it requires more custom classes and lacks component theming
2. **Separate CSS Files**: Rejected because it violates project's Tailwind v4 conventions
3. **@apply Directives**: Rejected because project explicitly forbids `@apply` usage

### Implementation Pattern
```typescript
// Login component with DaisyUI classes
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-base-100">
      <div class="card w-96 bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl font-bold mb-4">Sign In</h2>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <!-- Email Input -->
            <div class="form-control w-full mb-4">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input
                formControlName="email"
                type="email"
                placeholder="you@example.com"
                class="input input-bordered w-full"
              />
              @if (emailInvalid()) {
                <label class="label">
                  <span class="label-text-alt text-error">Invalid email</span>
                </label>
              }
            </div>

            <!-- Password Input -->
            <div class="form-control w-full mb-6">
              <label class="label">
                <span class="label-text">Password</span>
              </label>
              <input
                formControlName="password"
                type="password"
                placeholder="••••••••"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn btn-primary w-full"
              [disabled]="loginForm.invalid || isLoading()"
            >
              @if (isLoading()) {
                <span class="loading loading-spinner loading-sm"></span>
              }
              Sign In
            </button>
          </form>

          <!-- Divider -->
          <div class="divider">OR</div>

          <!-- Magic Link Button -->
          <button class="btn btn-outline w-full">
            Sign in with Magic Link
          </button>

          <!-- Guest Button -->
          <button class="btn btn-ghost w-full mt-2">
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {}
```

**Sources**:
- DaisyUI Documentation: "Components" (https://daisyui.com/components/)
- Tailwind CSS v4: "Utility-First Fundamentals"
- Project CLAUDE.md: "Tailwind CSS v4 Conventions"

---

## 7. Onboarding Wizard Multi-Step Flow

### Decision
Implement onboarding as a single component with step counter, navigation buttons (Back/Next/Skip), and localStorage-based completion tracking.

### Rationale
- **Single Component**: Easier to manage state and transitions within one component
- **Step Counter**: Visual progress indicator improves user confidence
- **Skip Option**: Respects user agency (some users want to explore immediately)
- **localStorage**: Simple persistence solution (no backend needed for onboarding state)

### Alternatives Considered
1. **Multi-Component Router-Based**: Rejected because it adds complexity with multiple routes for what's essentially one flow
2. **No Skip Button**: Rejected because forcing users through onboarding increases bounce rate
3. **Backend Tracking**: Rejected because onboarding doesn't need to be synced across devices

### Implementation Pattern
```typescript
export class OnboardingComponent {
  readonly currentStep = signal(0);
  readonly totalSteps = 4;

  readonly steps = [
    { title: 'Welcome', content: 'Track your brewery visits automatically' },
    { title: 'Location', content: 'We need location permissions to detect visits' },
    { title: 'Privacy', content: 'Your location data never leaves your device' },
    { title: 'Get Started', content: 'Choose how you want to use Blastoise' },
  ];

  nextStep() {
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.update(s => s + 1);
    }
  }

  previousStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  skip() {
    this.complete();
  }

  complete() {
    localStorage.setItem('onboarding_complete', 'true');
    // Navigate to main app
  }
}

// Template
<div class="card w-full max-w-lg bg-base-200 shadow-xl">
  <div class="card-body">
    <!-- Progress Indicator -->
    <div class="flex justify-center gap-2 mb-4">
      @for (step of steps; track $index) {
        <div class="w-2 h-2 rounded-full {{$index === currentStep() ? 'bg-primary' : 'bg-base-300'}}"></div>
      }
    </div>

    <!-- Step Content -->
    <h2 class="card-title text-2xl">{{steps[currentStep()].title}}</h2>
    <p class="text-base-content/70">{{steps[currentStep()].content}}</p>

    <!-- Navigation -->
    <div class="card-actions justify-between mt-6">
      @if (currentStep() > 0) {
        <button class="btn btn-ghost" (click)="previousStep()">Back</button>
      } @else {
        <button class="btn btn-ghost" (click)="skip()">Skip</button>
      }

      @if (currentStep() < totalSteps - 1) {
        <button class="btn btn-primary" (click)="nextStep()">Next</button>
      } @else {
        <button class="btn btn-primary" (click)="complete()">Get Started</button>
      }
    </div>
  </div>
</div>
```

**Sources**:
- Nielsen Norman Group: "Onboarding User Experience"
- Interaction Design Foundation: "How to Design Onboarding Flows"

---

## 8. Anonymous Mode Implementation Strategy

### Decision
Use localStorage to store `anonymous_mode` flag and `anonymous_user_id`. AuthService already implements this pattern (verified in existing code at libs/features/auth/src/lib/services/auth.ts:8-10).

### Rationale
- **Existing Pattern**: AuthService already uses localStorage for anonymous mode
- **No Backend Required**: Anonymous mode is device-specific, doesn't need server storage
- **Fast**: localStorage is synchronous and instant
- **Privacy**: No network requests means no data leaves the device

### Alternatives Considered
1. **SessionStorage**: Rejected because anonymous mode should persist across browser sessions
2. **IndexedDB**: Rejected because it's overkill for simple boolean flags
3. **Cookies**: Rejected because localStorage is simpler for single-device data

### Implementation Pattern
```typescript
// Already implemented in AuthService
const ANONYMOUS_USER_KEY = 'anonymous_user_id';
const ANONYMOUS_MODE_KEY = 'anonymous_mode';

enableAnonymousMode(): void {
  localStorage.setItem(ANONYMOUS_MODE_KEY, 'true');
  this.authState.setAnonymousMode(true);
  this.loadAnonymousUser();
}

// UI component calls this
onContinueAsGuest() {
  this.authService.enableAnonymousMode();
  this.router.navigate(['/']);
}
```

**Sources**:
- Existing codebase: `libs/features/auth/src/lib/services/auth.ts`
- MDN Web Docs: "Using the Web Storage API"

---

## 9. Magic Link Email Callback Handling

### Decision
Create a dedicated callback component at `/auth/callback` that processes the magic link token from URL parameters and completes authentication.

### Rationale
- **Supabase Pattern**: Supabase redirects to a callback URL after magic link click
- **User Feedback**: Callback page shows loading state while processing token
- **Error Handling**: Dedicated page can display clear error messages if token is invalid/expired
- **Routing**: Separate route keeps authentication logic isolated

### Alternatives Considered
1. **Handle in Login Component**: Rejected because it mixes concerns (login form + callback handling)
2. **Handle in App Root**: Rejected because it clutters the main app component
3. **No Callback Page**: Rejected because users would see blank page during token processing

### Implementation Pattern
```typescript
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen bg-base-100">
      @if (isLoading()) {
        <div class="card bg-base-200 shadow-xl p-8">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="mt-4 text-center">Signing you in...</p>
        </div>
      }

      @if (error()) {
        <div class="alert alert-error max-w-md">
          <span>{{error()}}</span>
          <button class="btn btn-sm" (click)="goToLogin()">Back to Login</button>
        </div>
      }
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    // Supabase automatically processes the token from URL hash
    // We just need to check if auth succeeded
    const { data: { session } } = await this.authService.supabase.auth.getSession();

    if (session) {
      // Success - redirect to app
      this.router.navigate(['/']);
    } else {
      // Token invalid or expired
      this.error.set('Magic link expired or invalid. Please request a new one.');
      this.isLoading.set(false);
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}

// Route configuration
{
  path: 'auth/callback',
  component: AuthCallbackComponent,
}
```

**Sources**:
- Supabase Documentation: "Auth with Magic Links"
- Existing codebase pattern (Supabase configured in `libs/data/supabase`)

---

## 10. Password Reset Flow Implementation

### Decision
Two-step process: (1) Request reset link via email form, (2) Handle reset link callback and show new password form.

### Rationale
- **Supabase Pattern**: Matches Supabase's built-in password reset flow
- **Security**: Reset link contains token, ensures user has email access
- **User Experience**: Clear two-step process (request → email → reset) is familiar pattern
- **Expiration**: Supabase tokens expire after 1 hour (configurable)

### Alternatives Considered
1. **In-App Reset Without Email**: Rejected because it's less secure (no email verification)
2. **Security Questions**: Rejected because they're less secure than email verification
3. **SMS Reset**: Rejected because phone auth is out of scope

### Implementation Pattern
```typescript
// Step 1: Request reset (password-reset.component.ts)
async requestReset() {
  const email = this.resetForm.value.email!;

  this.isLoading.set(true);
  const { error } = await this.authService.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  this.isLoading.set(false);

  if (!error) {
    this.showSuccessMessage.set(true);
    // Show: "Check your email for a password reset link"
  }
}

// Step 2: Handle reset callback (reset-password-callback.component.ts)
async ngOnInit() {
  // Check if user arrived via reset link (has valid session)
  const { data: { session } } = await this.authService.supabase.auth.getSession();

  if (!session) {
    this.error.set('Reset link expired. Please request a new one.');
    return;
  }

  // Show new password form
  this.showForm.set(true);
}

async submitNewPassword() {
  const newPassword = this.newPasswordForm.value.password!;

  this.isLoading.set(true);
  const { error } = await this.authService.supabase.auth.updateUser({
    password: newPassword,
  });
  this.isLoading.set(false);

  if (!error) {
    // Success - redirect to app
    this.router.navigate(['/']);
  }
}
```

**Sources**:
- Supabase Documentation: "Reset Password for Email"
- OWASP: "Forgot Password Cheat Sheet"

---

## Summary of Key Decisions

| Decision Area | Choice | Rationale |
|--------------|--------|-----------|
| Form Management | Reactive Forms + Signals | Type safety, testability, Angular 20+ best practice |
| Validation Timing | On blur (field exit) | UX sweet spot between too early and too late |
| Password Requirements | 8+ chars, letter + number | Balance security and usability (NIST baseline) |
| Loading States | Spinner + disabled inputs | Prevent duplicate submissions, clear feedback |
| Accessibility | Semantic HTML + ARIA | WCAG 2.1 AA compliance, screen reader support |
| Styling | DaisyUI + Inline Tailwind | Project convention, design system consistency |
| Onboarding | Single component, 4 steps | Simple state management, localStorage persistence |
| Anonymous Mode | localStorage flags | Device-specific, no backend, existing pattern |
| Magic Link Callback | Dedicated /auth/callback route | Clean separation, error handling, Supabase pattern |
| Password Reset | Two-step email flow | Security, Supabase pattern, user familiarity |

## No Outstanding Research Questions

All technical unknowns from the specification have been resolved. The implementation can proceed to Phase 1 (Design & Contracts).
