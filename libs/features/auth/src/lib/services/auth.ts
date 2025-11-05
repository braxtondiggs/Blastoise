import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { getSupabaseClient } from '@blastoise/data';
import type { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { User, DEFAULT_USER_PREFERENCES, UserPreferences } from '@blastoise/shared';
import { AuthStateService } from '@blastoise/shared/auth-state';

const ANONYMOUS_USER_KEY = 'anonymous_user_id';
const ANONYMOUS_MODE_KEY = 'anonymous_mode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = getSupabaseClient();
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);

  // Expose shared state for backward compatibility
  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly isAnonymous = this.authState.isAnonymous;
  readonly currentUser = this.authState.currentUser;
  readonly session = this.authState.session;

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state and listen for auth changes
   */
  private async initializeAuth(): Promise<void> {
    // Check if in anonymous mode
    const anonymousMode = localStorage.getItem(ANONYMOUS_MODE_KEY) === 'true';
    this.authState.setAnonymousMode(anonymousMode);

    if (anonymousMode) {
      this.loadAnonymousUser();
    } else {
      // Load current session
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (session) {
        this.authState.setSession(session);
        await this.loadUserProfile(session.user);
      }
    }

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        this.authState.setSession(session);

        if (session?.user) {
          await this.loadUserProfile(session.user);
        } else {
          this.authState.setCurrentUser(null);
        }
      }
    );
  }

  /**
   * Load user profile and preferences
   */
  private async loadUserProfile(supabaseUser: SupabaseUser): Promise<void> {
    try {
      // Fetch user preferences from Supabase (assumes user_preferences table exists)
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (first time user)
        console.error('Error loading user preferences:', error);
      }

      const preferences: UserPreferences = data
        ? {
            location_tracking_enabled:
              data.location_tracking_enabled ?? DEFAULT_USER_PREFERENCES.location_tracking_enabled,
            sharing_default: data.sharing_default ?? DEFAULT_USER_PREFERENCES.sharing_default,
            notification_settings: {
              ...DEFAULT_USER_PREFERENCES.notification_settings,
              ...(data.notification_settings || {}),
            },
            privacy_settings: {
              ...DEFAULT_USER_PREFERENCES.privacy_settings,
              ...(data.privacy_settings || {}),
            },
            map_settings: {
              ...DEFAULT_USER_PREFERENCES.map_settings,
              ...(data.map_settings || {}),
            },
          }
        : DEFAULT_USER_PREFERENCES;

      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        created_at: supabaseUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        preferences,
      };

      this.authState.setCurrentUser(user);
    } catch (err) {
      console.error('Error loading user profile:', err);
      this.authState.setCurrentUser(null);
    }
  }

  /**
   * Load or create anonymous user
   */
  private loadAnonymousUser(): void {
    let anonymousUserId = localStorage.getItem(ANONYMOUS_USER_KEY);

    if (!anonymousUserId) {
      // Generate a unique anonymous user ID
      anonymousUserId = `anon_${crypto.randomUUID()}`;
      localStorage.setItem(ANONYMOUS_USER_KEY, anonymousUserId);
    }

    const anonymousUser: User = {
      id: anonymousUserId,
      email: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferences: {
        ...DEFAULT_USER_PREFERENCES,
        privacy_settings: {
          ...DEFAULT_USER_PREFERENCES.privacy_settings,
          anonymous_mode: true,
          store_visit_history: false, // Anonymous users store locally only
        },
      },
    };

    this.authState.setCurrentUser(anonymousUser);
  }

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<{ error?: Error }> {
    try {
      const { error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Disable anonymous mode after successful sign in
      this.disableAnonymousMode();

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Sign in with magic link (passwordless)
   */
  async signInWithMagicLink(email: string): Promise<{ error?: Error }> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<{ error?: Error }> {
    try {
      const { error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Disable anonymous mode after successful sign up
      this.disableAnonymousMode();

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.authState.setCurrentUser(null);
    this.authState.setSession(null);
    this.router.navigate(['/']);
  }

  /**
   * Enable anonymous mode (local-only usage)
   */
  enableAnonymousMode(): void {
    localStorage.setItem(ANONYMOUS_MODE_KEY, 'true');
    this.authState.setAnonymousMode(true);
    this.loadAnonymousUser();
  }

  /**
   * Disable anonymous mode
   */
  private disableAnonymousMode(): void {
    localStorage.removeItem(ANONYMOUS_MODE_KEY);
    localStorage.removeItem(ANONYMOUS_USER_KEY);
    this.authState.setAnonymousMode(false);
  }

  /**
   * Upgrade anonymous user to authenticated account
   * Migrates local visit data to cloud storage
   */
  async upgradeToAuthenticated(email: string, password: string): Promise<{ error?: Error }> {
    const anonymousUserId = this.authState.currentUser()?.id;

    if (!anonymousUserId || !this.isAnonymous()) {
      return { error: new Error('Not in anonymous mode') };
    }

    // Sign up for new account
    const { error } = await this.signUp(email, password);

    if (error) {
      return { error };
    }

    // TODO: Migrate local visits to cloud (will be handled in visit sync service)

    return {};
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<{ error?: Error }> {
    const user = this.authState.currentUser();

    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    if (this.isAnonymous()) {
      // Update local preferences for anonymous users
      const updatedUser: User = {
        ...user,
        preferences: { ...user.preferences, ...preferences },
        updated_at: new Date().toISOString(),
      };
      this.authState.setCurrentUser(updatedUser);
      return {};
    }

    try {
      // Update preferences in Supabase for authenticated users
      const { error } = await this.supabase.from('user_preferences').upsert({
        user_id: user.id,
        location_tracking_enabled: preferences.location_tracking_enabled,
        sharing_default: preferences.sharing_default,
        notification_settings: preferences.notification_settings,
        privacy_settings: preferences.privacy_settings,
        map_settings: preferences.map_settings,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state
      const updatedUser: User = {
        ...user,
        preferences: { ...user.preferences, ...preferences },
        updated_at: new Date().toISOString(),
      };
      this.authState.setCurrentUser(updatedUser);

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Get current user ID (works for both authenticated and anonymous users)
   */
  getUserId(): string | null {
    return this.authState.currentUser()?.id || null;
  }

  /**
   * Check if location tracking is enabled
   */
  isLocationTrackingEnabled(): boolean {
    return this.authState.currentUser()?.preferences.location_tracking_enabled ?? false;
  }
}
