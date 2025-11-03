import { Injectable, signal, computed } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import type { User } from '@blastoise/shared';

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
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly anonymousModeSignal = signal<boolean>(false);

  // Public computed signals (read-only)
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isAnonymous = computed(() => this.anonymousModeSignal());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly session = this.sessionSignal.asReadonly();

  /**
   * Update current user (called by AuthService)
   */
  setCurrentUser(user: User | null): void {
    this.currentUserSignal.set(user);
  }

  /**
   * Update session (called by AuthService)
   */
  setSession(session: Session | null): void {
    this.sessionSignal.set(session);
  }

  /**
   * Update anonymous mode (called by AuthService)
   */
  setAnonymousMode(isAnonymous: boolean): void {
    this.anonymousModeSignal.set(isAnonymous);
  }

  /**
   * Clear all authentication state
   */
  clear(): void {
    this.currentUserSignal.set(null);
    this.sessionSignal.set(null);
    this.anonymousModeSignal.set(false);
  }
}
