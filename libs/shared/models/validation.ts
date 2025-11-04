/**
 * Validation error codes for authentication forms
 * Used to standardize error messages across the application
 */
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

/**
 * Form validation error interface
 * Provides structured error information for form fields
 */
export interface FormValidationError {
  /** Field name (null for form-level errors) */
  field: string | null;
  /** Error code for programmatic handling */
  code: ValidationErrorCode;
  /** User-friendly error message */
  message: string;
}

/**
 * Predefined error messages for common validation scenarios
 * Maps error codes to user-friendly messages
 */
export const VALIDATION_ERROR_MESSAGES: Record<ValidationErrorCode, string> = {
  REQUIRED: '{Field} is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  EMAIL_ALREADY_REGISTERED: 'This email is already registered. Try signing in instead.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_NO_LETTER: 'Password must contain at least one letter',
  PASSWORD_NO_NUMBER: 'Password must contain at least one number',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  TERMS_NOT_ACCEPTED: 'You must agree to the terms of service',
  NETWORK_ERROR: 'Connection issue. Please check your internet and try again.',
  AUTH_FAILED: 'Invalid email or password',
  TOKEN_EXPIRED: 'This link has expired. Please request a new one.',
};

/**
 * Helper function to create a FormValidationError
 */
export function createValidationError(
  field: string | null,
  code: ValidationErrorCode,
  customMessage?: string
): FormValidationError {
  return {
    field,
    code,
    message: customMessage || VALIDATION_ERROR_MESSAGES[code],
  };
}

/**
 * Helper function to format validation error message for a specific field
 */
export function formatValidationMessage(code: ValidationErrorCode, fieldName: string): string {
  const message = VALIDATION_ERROR_MESSAGES[code];
  return message.replace('{Field}', fieldName);
}
