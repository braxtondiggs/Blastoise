import { Injectable, signal, computed } from '@angular/core';
import type { User } from '@blastoise/shared';

/**
 * Session interface for self-hosted JWT authentication
 */
export interface AuthSession {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

/**
 * Shared Authentication State Service
 *
 * This service contains ONLY state signals - no business logic.
 * The actual authentication logic (sign in, sign out, etc.) lives in
 * @blastoise/features-auth AuthService.
 *
 * This separation allows:
 * - App-wide components to read auth state without importing lazy-loaded features
 * - Clean separation of concerns (state vs. business logic)
 * - No circular dependencies
 */
@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  // Private writable signals
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly sessionSignal = signal<AuthSession | null>(null);
  private readonly anonymousModeSignal = signal<boolean>(false);
  private readonly isInitializedSignal = signal<boolean>(false);
  private readonly accessTokenSignal = signal<string | null>(null);

  // Public computed signals (read-only)
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null && !this.anonymousModeSignal());
  readonly isAnonymous = computed(() => this.anonymousModeSignal());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly session = this.sessionSignal.asReadonly();
  readonly isInitialized = this.isInitializedSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();

  /**
   * Update current user (called by AuthService)
   */
  setCurrentUser(user: User | null): void {
    this.currentUserSignal.set(user);
  }

  /**
   * Update session (called by AuthService)
   */
  setSession(session: AuthSession | null): void {
    this.sessionSignal.set(session);
    if (session) {
      this.accessTokenSignal.set(session.access_token);
    }
  }

  /**
   * Update access token (called by AuthService after token refresh)
   */
  setAccessToken(token: string | null): void {
    this.accessTokenSignal.set(token);
  }

  /**
   * Update anonymous mode (called by AuthService)
   */
  setAnonymousMode(isAnonymous: boolean): void {
    this.anonymousModeSignal.set(isAnonymous);
  }

  /**
   * Mark auth as initialized (called by AuthService after initial load)
   */
  setInitialized(initialized: boolean): void {
    this.isInitializedSignal.set(initialized);
  }

  /**
   * Clear all authentication state
   */
  clear(): void {
    this.currentUserSignal.set(null);
    this.sessionSignal.set(null);
    this.accessTokenSignal.set(null);
    this.anonymousModeSignal.set(false);
  }
}
