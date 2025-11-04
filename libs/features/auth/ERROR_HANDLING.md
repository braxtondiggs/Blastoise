# Authentication Error Handling & Loading States

**Last Updated**: 2025-11-03
**Purpose**: Document error handling patterns, loading states, and accessibility standards across all auth components

---

## Overview

All authentication components in `libs/features/auth` follow consistent patterns for:

- Loading state management
- Error handling and user-friendly messages
- Form disabling during async operations
- ARIA attributes for accessibility

---

## Loading State Pattern

### Standard Implementation

Every component with async operations must implement:

```typescript
// Component signal
readonly isLoading = signal(false);

// Async method pattern
async onSubmit(): Promise<void> {
  if (this.form.invalid) return;

  this.isLoading.set(true);
  this.error.set(null); // Clear previous errors

  try {
    await this.authService.someAsyncMethod();
    // Success handling
  } catch (err) {
    this.error.set(mapSupabaseError(err as Error));
  } finally {
    this.isLoading.set(false);
  }
}
```

### Components with Loading States

| Component           | Signal Name    | Purpose                            |
| ------------------- | -------------- | ---------------------------------- |
| `login.ts`          | `isLoading`    | Sign in with password/magic link   |
| `registration.ts`   | `isLoading`    | Account creation                   |
| `password-reset.ts` | `isLoading`    | Password reset request/update      |
| `upgrade-prompt.ts` | `isLoading`    | Anonymous to authenticated upgrade |
| `auth-callback.ts`  | `isProcessing` | Magic link callback processing     |

**Note**: `auth-callback` uses `isProcessing` instead of `isLoading` for semantic clarity.

---

## Error Handling Pattern

### Error Signal

```typescript
readonly error = signal<string | null>(null);
```

### Error Mapping Utility

All components use the `mapSupabaseError` utility from `@blastoise/shared`:

```typescript
import { mapSupabaseError } from '@blastoise/shared';

try {
  await this.authService.someMethod();
} catch (err) {
  this.error.set(mapSupabaseError(err as Error));
}
```

### Common Supabase Errors

| Supabase Error              | User-Friendly Message                                         |
| --------------------------- | ------------------------------------------------------------- |
| `Invalid login credentials` | "Incorrect email or password. Please try again."              |
| `User already registered`   | "An account with this email already exists."                  |
| `Email not confirmed`       | "Please check your email and click the confirmation link."    |
| `Invalid or expired OTP`    | "This link has expired. Please request a new one."            |
| Network errors              | "Connection issue. Please check your internet and try again." |

### Network Error Detection

```typescript
catch (err) {
  if (err instanceof TypeError || err.message.includes('fetch')) {
    this.error.set("Connection issue. Please check your internet and try again.");
  } else {
    this.error.set(mapSupabaseError(err as Error));
  }
}
```

---

## Form Disabling Pattern

### Template Implementation

All form inputs must be disabled during loading:

```html
<form [formGroup]="myForm" (ngSubmit)="onSubmit()" novalidate>
  <input formControlName="email" [disabled]="isLoading()" class="input input-bordered" />

  <button type="submit" [disabled]="myForm.invalid || isLoading()" class="btn btn-primary">
    @if (isLoading()) {
    <span class="loading loading-spinner"></span>
    Processing... } @else { Submit }
  </button>
</form>
```

---

## ARIA Attributes for Accessibility

### Form-Level ARIA Attributes

```html
<form [formGroup]="myForm" (ngSubmit)="onSubmit()" novalidate [attr.aria-busy]="isLoading()">
  <!-- form fields -->
</form>
```

### Input-Level ARIA Attributes

```html
<input
  id="email-input"
  formControlName="email"
  aria-required="true"
  [attr.aria-invalid]="emailControl.invalid && emailControl.touched"
  [attr.aria-describedby]="emailControl.invalid ? 'email-error' : null"
/>

@if (emailControl.invalid && emailControl.touched) {
<span id="email-error" class="label-text-alt text-error" role="alert"> {{ errorMessage }} </span>
}
```

### Error Alert ARIA Attributes

```html
@if (error()) {
<div class="alert alert-error" role="alert" aria-live="polite">
  <span>{{ error() }}</span>
</div>
}
```

### Success Message ARIA Attributes

```html
@if (showSuccessMessage()) {
<div class="alert alert-success" role="alert" aria-live="polite">
  <span>{{ successMessage }}</span>
</div>
}
```

---

## Component-Specific Patterns

### Login Component

**Loading States**:

- Sign in with password
- Sign in with magic link

**Error Handling**:

- Invalid credentials → User-friendly message
- Network errors → Connection issue message
- Magic link success → Auto-dismiss after 5 seconds

```typescript
// Auto-dismiss success message
setTimeout(() => this.showSuccessMessage.set(false), 5000);
```

### Registration Component

**Loading States**:

- Account creation

**Error Handling**:

- Duplicate email → "An account with this email already exists"
- Weak password → Inline checklist validation
- Password mismatch → Form-level validator

**Validation Signals**:

```typescript
readonly hasMinLength = computed(() =>
  this.registrationForm.controls.password.value?.length >= 8
);
readonly hasLetter = computed(() =>
  /[a-zA-Z]/.test(this.registrationForm.controls.password.value || '')
);
readonly hasNumber = computed(() =>
  /[0-9]/.test(this.registrationForm.controls.password.value || '')
);
```

### Password Reset Component

**Modes**:

- `request`: Request password reset email
- `reset`: Set new password (after clicking email link)

**Loading States**:

- Email request submission
- Password update submission

**Error Handling**:

- Invalid token → "This link has expired. Please request a new one."
- Network errors → Connection issue message

### Upgrade Prompt Component

**Loading States**:

- Account creation
- Visit migration (shows progress)

**Migration Status**:

```typescript
readonly migrationStatus = signal<'pending' | 'in-progress' | 'complete' | 'failed'>('pending');
```

**Progress Indicators**:

- "Creating account..."
- "Migrating visits..."
- "Complete!"

### Auth Callback Component

**Loading States**:

- `isProcessing`: Magic link token validation

**Error Handling**:

- Invalid/expired token → "Invalid or expired authentication link"
- Network errors → Connection issue message

**Auto-redirect**: On success, redirects to `/` after session validation

---

## Accessibility Compliance

### WCAG 2.1 AA Standards

All components comply with WCAG 2.1 AA:

✅ **Keyboard Navigation**: All forms fully navigable with Tab/Shift+Tab
✅ **Screen Reader Support**: ARIA labels on all interactive elements
✅ **Error Identification**: Inline error messages with `role="alert"`
✅ **Loading States**: `aria-busy` attribute during async operations
✅ **Focus Management**: Logical tab order, no keyboard traps
✅ **Color Contrast**: DaisyUI ensures sufficient contrast ratios

### Testing Accessibility

```bash
# Run accessibility audit
npx nx test auth --testNamePattern="accessibility"

# Manual keyboard testing
# 1. Tab through all forms
# 2. Verify logical tab order
# 3. Submit with Enter key
# 4. Verify error messages are announced
```

---

## Common Patterns Summary

### ✅ DO

- Use `isLoading` signal for async operations
- Use `error` signal for error messages
- Map Supabase errors to user-friendly messages
- Disable forms during loading
- Add `aria-busy` to forms
- Add `role="alert"` to error messages
- Auto-dismiss success messages after 5 seconds
- Clear errors before new submissions

### ❌ DON'T

- Show raw Supabase error messages to users
- Leave forms enabled during async operations
- Forget to set `isLoading.set(false)` in finally block
- Skip ARIA attributes for accessibility
- Show loading states without disabling inputs
- Use technical jargon in error messages

---

## Future Enhancements

- [ ] Add retry logic for network errors
- [ ] Implement exponential backoff for failed requests
- [ ] Add success toast notifications
- [ ] Implement form field-level loading states
- [ ] Add animation transitions for error/success messages
- [ ] Implement error telemetry/logging

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [DaisyUI Components](https://daisyui.com/components/)
- [Supabase Auth Errors](https://supabase.com/docs/reference/javascript/auth-error-codes)
