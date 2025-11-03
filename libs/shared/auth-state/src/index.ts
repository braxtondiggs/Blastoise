/**
 * Shared Authentication State Library
 *
 * Contains only authentication state (signals) - no business logic.
 * Can be imported anywhere in the app without causing lazy-loading issues.
 *
 * Business logic (sign in, sign out, etc.) lives in @blastoise/features-auth
 */
export * from './lib/auth-state.service';
