/**
 * Error message utility for authentication operations
 * Maps Supabase error codes and messages to user-friendly messages
 */

/**
 * Supabase error codes
 * Common error codes returned by Supabase Auth
 */
export const SUPABASE_ERROR_CODES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  USER_NOT_FOUND: 'user_not_found',
  USER_ALREADY_REGISTERED: 'user_already_registered',
  WEAK_PASSWORD: 'weak_password',
  INVALID_EMAIL: 'invalid_email',
  EMAIL_EXISTS: 'email_exists',
  OVER_REQUEST_RATE_LIMIT: 'over_request_rate_limit',
  OVER_EMAIL_SEND_RATE_LIMIT: 'over_email_send_rate_limit',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
} as const;

/**
 * User-friendly error messages mapped from Supabase errors
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // Authentication errors
  'Invalid login credentials': 'Invalid email or password. Please try again.',
  'Email not confirmed': 'Please check your email to confirm your account before signing in.',
  'User not found': 'No account found with this email. Try creating an account.',
  'User already registered': 'This email is already registered. Try signing in instead.',

  // Password errors
  'Password should be at least 6 characters':
    'Password must be at least 8 characters with a letter and number.',
  'Password is too weak': 'Password must contain at least one letter and one number.',

  // Email errors
  'Unable to validate email address': 'Please enter a valid email address.',
  'Email address invalid': 'Please enter a valid email address.',
  'A user with this email address has already been registered':
    'This email is already registered. Try signing in instead.',

  // Rate limiting
  'For security purposes, you can only request this once every 60 seconds':
    'Too many requests. Please wait a moment before trying again.',
  'Email rate limit exceeded': 'Too many emails sent. Please wait a few minutes before trying again.',

  // Token errors
  'Token has expired or is invalid': 'This link has expired. Please request a new one.',
  'Invalid token': 'This link is invalid. Please request a new one.',

  // Network errors
  'Network request failed': 'Connection issue. Please check your internet and try again.',
  'Failed to fetch': 'Connection issue. Please check your internet and try again.',

  // Generic errors
  'Unknown error': 'Something went wrong. Please try again.',
};

/**
 * Maps a Supabase error to a user-friendly message
 * @param error - Error object from Supabase or generic Error
 * @returns User-friendly error message
 */
export function mapSupabaseError(error: Error | { message: string } | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';

  // Check for exact match first
  if (ERROR_MESSAGE_MAP[errorMessage]) {
    return ERROR_MESSAGE_MAP[errorMessage];
  }

  // Check for partial matches (case-insensitive)
  const lowerMessage = errorMessage.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MESSAGE_MAP)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  // Specific pattern matching
  if (lowerMessage.includes('invalid') && lowerMessage.includes('credentials')) {
    return 'Invalid email or password. Please try again.';
  }

  if (lowerMessage.includes('email') && (lowerMessage.includes('exists') || lowerMessage.includes('registered'))) {
    return 'This email is already registered. Try signing in instead.';
  }

  if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('characters'))) {
    return 'Password must be at least 8 characters with a letter and number.';
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return 'Connection issue. Please check your internet and try again.';
  }

  if (lowerMessage.includes('token') && (lowerMessage.includes('expired') || lowerMessage.includes('invalid'))) {
    return 'This link has expired or is invalid. Please request a new one.';
  }

  if (lowerMessage.includes('rate') && lowerMessage.includes('limit')) {
    return 'Too many requests. Please wait a moment before trying again.';
  }

  // Fallback to generic message
  return 'Something went wrong. Please try again.';
}

/**
 * Maps a network error to a user-friendly message
 * @param error - Network error
 * @returns User-friendly error message
 */
export function mapNetworkError(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;

  if (
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Network request failed')
  ) {
    return 'Connection issue. Please check your internet and try again.';
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return 'Request timed out. Please try again.';
  }

  return mapSupabaseError(error);
}

/**
 * Checks if an error is a network error
 * @param error - Error to check
 * @returns True if network error
 */
export function isNetworkError(error: Error | { message: string }): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout')
  );
}

/**
 * Checks if an error is a Supabase auth error
 * @param error - Error to check
 * @returns True if Supabase auth error
 */
export function isAuthError(error: Error | { message: string }): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('invalid') ||
    message.includes('credentials') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  );
}
