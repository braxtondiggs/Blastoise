import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom form validators for authentication forms
 * Provides email validation, password strength validation, and password match validation
 */

/**
 * Password strength validator
 * Requires:
 * - Minimum 8 characters
 * - At least one letter (a-z or A-Z)
 * - At least one number (0-9)
 */
export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';

  const hasMinLength = value.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  const valid = hasMinLength && hasLetter && hasNumber;

  if (valid) {
    return null;
  }

  return {
    passwordStrength: {
      hasMinLength,
      hasLetter,
      hasNumber,
      valid: false,
    },
  };
}

/**
 * Password match validator (for confirm password fields)
 * Checks if the value matches another control's value
 *
 * Usage:
 * ```typescript
 * confirmPassword: ['', [Validators.required, passwordMatchValidator('password')]]
 * ```
 */
export function passwordMatchValidator(matchTo: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }

    const matchControl = parent.get(matchTo);
    if (!matchControl) {
      return null;
    }

    const value = control.value;
    const matchValue = matchControl.value;

    if (value !== matchValue) {
      return { passwordMatch: { match: false } };
    }

    return null;
  };
}

/**
 * Email format validator (stricter than Angular's default)
 * RFC 5322 compliant email validation with additional practical restrictions
 */
export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';

  // Empty is valid (use Validators.required for required check)
  if (!value) {
    return null;
  }

  // Reject consecutive dots (not practical even if technically allowed in quoted strings)
  if (/\.\./.test(value)) {
    return { email: { valid: false } };
  }

  // RFC 5322 simplified email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(value)) {
    return { email: { valid: false } };
  }

  return null;
}

/**
 * Form-level validator to check if two password fields match
 * Used at the FormGroup level, not individual control level
 *
 * Usage:
 * ```typescript
 * this.fb.group({
 *   password: ['', Validators.required],
 *   confirmPassword: ['', Validators.required]
 * }, {
 *   validators: [passwordsMatchValidator('password', 'confirmPassword')]
 * })
 * ```
 */
export function passwordsMatchValidator(
  passwordField: string,
  confirmPasswordField: string
): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const password = formGroup.get(passwordField);
    const confirmPassword = formGroup.get(confirmPasswordField);

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      return { passwordsMismatch: true };
    }

    return null;
  };
}

/**
 * Extract password strength details from validation errors
 * Useful for displaying password requirements checklist
 */
export interface PasswordStrengthDetails {
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

export function getPasswordStrength(control: AbstractControl): PasswordStrengthDetails {
  const value = control.value || '';

  return {
    hasMinLength: value.length >= 8,
    hasLetter: /[a-zA-Z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    isValid: value.length >= 8 && /[a-zA-Z]/.test(value) && /[0-9]/.test(value),
  };
}
