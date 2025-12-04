import { Injectable, inject, Inject, Optional } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, of, from } from 'rxjs';
import { catchError, tap, map, switchMap, take, mergeMap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { User, DEFAULT_USER_PREFERENCES, UserPreferences, API_BASE_URL } from '@blastoise/shared';
import { AuthStateService, AuthSession } from '@blastoise/shared/auth-state';

// Re-export for backward compatibility
export { API_BASE_URL } from '@blastoise/shared';

const ANONYMOUS_USER_KEY = 'anonymous_user_id';
const ANONYMOUS_MODE_KEY = 'anonymous_mode';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_TOKEN_KEY = 'access_token';

/**
 * JWT payload structure from self-hosted auth
 */
interface JwtPayload {
  user_id: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Auth response from backend API
 */
interface AuthResponse {
  access_token: string;
  refresh_token?: string; // Included for mobile apps
  token_type: 'Bearer';
  expires_in: number;
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

/**
 * Refresh response from backend API
 */
interface RefreshResponse {
  access_token: string;
  refresh_token?: string; // Included for mobile apps (new refresh token rotation)
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * Message response from backend API
 */
interface MessageResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly apiUrl: string;

  // In-memory access token storage (not localStorage for security)
  private accessToken: string | null = null;

  // Refresh token for mobile apps (stored in Capacitor Preferences)
  private storedRefreshToken: string | null = null;

  // Check if running on native mobile platform
  private readonly isNative = Capacitor.isNativePlatform();

  // Refresh in progress flag to prevent multiple simultaneous refreshes
  private refreshInProgress$ = new BehaviorSubject<boolean>(false);

  // Cache onboarding status per session (null = not checked yet)
  private onboardingStatusCache: boolean | null = null;

  // Expose shared state for backward compatibility
  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly isAnonymous = this.authState.isAnonymous;
  readonly currentUser = this.authState.currentUser;
  readonly session = this.authState.session;

  constructor(@Optional() @Inject(API_BASE_URL) apiUrl?: string) {
    // Default to localhost if not provided
    this.apiUrl = apiUrl || 'http://localhost:3000/api/v1';
    this.initializeAuth();
  }

  /**
   * Initialize authentication state
   */
  private async initializeAuth(): Promise<void> {
    // Check if in anonymous mode
    const anonymousMode = localStorage.getItem(ANONYMOUS_MODE_KEY) === 'true';
    this.authState.setAnonymousMode(anonymousMode);

    if (anonymousMode) {
      this.loadAnonymousUser();
      this.authState.setInitialized(true);
    } else {
      // On native platforms, load persisted tokens from Capacitor Preferences
      if (this.isNative) {
        await this.loadPersistedTokens();
      }

      // Try to refresh token on app load
      try {
        await this.refreshAccessToken().pipe(take(1)).toPromise();
      } catch {
        // No valid refresh token - user will need to log in
        this.authState.setCurrentUser(null);
      }
      this.authState.setInitialized(true);
    }
  }

  /**
   * Load persisted tokens from Capacitor Preferences (mobile only)
   */
  private async loadPersistedTokens(): Promise<void> {
    try {
      const { value: storedRefreshToken } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
      const { value: storedAccessToken } = await Preferences.get({ key: ACCESS_TOKEN_KEY });

      if (storedRefreshToken) {
        this.storedRefreshToken = storedRefreshToken;
      }

      if (storedAccessToken && !this.isTokenExpired(storedAccessToken)) {
        this.accessToken = storedAccessToken;
        this.authState.setAccessToken(storedAccessToken);

        // Decode token to restore user state
        const decoded = jwtDecode<JwtPayload>(storedAccessToken);
        this.loadUserFromToken(decoded);

        // Proactively refresh if token is expiring soon (within 7 days)
        // This keeps the session alive when user uses the app regularly
        if (this.shouldRefreshToken(storedAccessToken) && storedRefreshToken) {
          console.log('[AuthService] Token expiring soon, proactively refreshing...');
          this.refreshAccessToken().pipe(take(1)).subscribe({
            next: () => console.log('[AuthService] Token proactively refreshed'),
            error: (err) => console.warn('[AuthService] Proactive refresh failed:', err),
          });
        }
      }
    } catch (error) {
      console.error('[AuthService] Failed to load persisted tokens:', error);
    }
  }

  /**
   * Persist tokens to Capacitor Preferences (mobile only)
   */
  private async persistTokens(accessToken: string, refreshToken?: string): Promise<void> {
    if (!this.isNative) {
      return;
    }

    try {
      await Preferences.set({ key: ACCESS_TOKEN_KEY, value: accessToken });
      if (refreshToken) {
        await Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken });
      }
    } catch (error) {
      // The in-memory tokens are still valid for this session
      console.error('[AuthService] Failed to persist tokens:', error);
    }
  }

  /**
   * Clear persisted tokens from Capacitor Preferences (mobile only)
   */
  private async clearPersistedTokens(): Promise<void> {
    if (!this.isNative) return;

    try {
      await Preferences.remove({ key: ACCESS_TOKEN_KEY });
      await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    } catch (error) {
      console.error('Failed to clear persisted tokens:', error);
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
   * Get current access token (used by interceptor)
   */
  getAccessToken(): string | null {
    // Check if token is expired
    if (this.accessToken && this.isTokenExpired(this.accessToken)) {
      return null;
    }
    return this.accessToken;
  }

  /**
   * Check if JWT token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      // Add 30-second buffer to account for network latency
      return decoded.exp * 1000 < Date.now() - 30000;
    } catch {
      return true;
    }
  }

  /**
   * Check if token should be proactively refreshed
   * Refresh when token is within 7 days of expiry to keep session alive
   */
  private shouldRefreshToken(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiresAt = decoded.exp * 1000;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      // Refresh if expiring within 7 days
      return expiresAt - Date.now() < sevenDaysMs;
    } catch {
      return true;
    }
  }

  /**
   * Sign in with email and password
   */
  signInWithPassword(email: string, password: string): Observable<{ error?: Error }> {
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/auth/login`,
        { email, password },
        { withCredentials: true } // Include cookies
      )
      .pipe(
        tap((response) => {
          this.handleAuthResponse(response);
          this.disableAnonymousMode();
        }),
        map(() => ({})),
        catchError((error: HttpErrorResponse) => {
          const message = error.error?.message || 'Invalid email or password';
          return of({ error: new Error(message) });
        })
      );
  }

  /**
   * Sign up with email and password
   */
  signUp(
    email: string,
    password: string
  ): Observable<{ error?: Error; needsEmailConfirmation?: boolean }> {
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/auth/register`,
        { email, password },
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          this.handleAuthResponse(response);
          this.disableAnonymousMode();
        }),
        map(() => ({ needsEmailConfirmation: false })),
        catchError((error: HttpErrorResponse) => {
          const message = error.error?.message || 'Registration failed';
          return of({ error: new Error(message) });
        })
      );
  }

  /**
   * Refresh access token using httpOnly refresh token cookie (web) or stored token (mobile)
   */
  refreshAccessToken(): Observable<void> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshInProgress$.value) {
      return this.refreshInProgress$.pipe(
        switchMap((inProgress) => {
          if (!inProgress) {
            return of(undefined);
          }
          return throwError(() => new Error('Refresh in progress'));
        }),
        take(1)
      );
    }

    this.refreshInProgress$.next(true);

    // On native platforms, include refresh token in request body
    const body = this.isNative && this.storedRefreshToken
      ? { refresh_token: this.storedRefreshToken }
      : {};

    return this.http
      .post<RefreshResponse>(`${this.apiUrl}/auth/refresh`, body, { withCredentials: true })
      .pipe(
        mergeMap((response) => {
          this.accessToken = response.access_token;
          this.authState.setAccessToken(response.access_token);

          // Update stored refresh token immediately
          if (response.refresh_token) {
            this.storedRefreshToken = response.refresh_token;
          }

          // Decode token to get user info
          const decoded = jwtDecode<JwtPayload>(response.access_token);
          this.loadUserFromToken(decoded);

          // Persist tokens on mobile - MUST complete before observable completes
          if (this.isNative) {
            return from(this.persistTokens(response.access_token, response.refresh_token));
          }

          return of(undefined);
        }),
        catchError((error) => {
          this.accessToken = null;
          this.storedRefreshToken = null;
          this.authState.setAccessToken(null);
          this.authState.setCurrentUser(null);
          this.authState.setSession(null);
          // Clear persisted tokens (fire and forget)
          this.clearPersistedTokens();
          return throwError(() => error);
        }),
        tap({
          complete: () => this.refreshInProgress$.next(false),
          error: () => this.refreshInProgress$.next(false),
        })
      );
  }

  /**
   * @deprecated Use refreshAccessToken() instead
   */
  refreshToken(): Observable<void> {
    return this.refreshAccessToken();
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await this.http
        .post<MessageResponse>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
        .toPromise();
    } catch {
      // Ignore logout errors - just clear local state
    }

    this.accessToken = null;
    this.storedRefreshToken = null;
    this.onboardingStatusCache = null;
    await this.clearPersistedTokens();
    this.authState.clear();
    await this.router.navigate(['/auth/login']);
  }

  /**
   * Request password reset email
   */
  forgotPassword(email: string): Observable<{ error?: Error }> {
    return this.http
      .post<MessageResponse>(`${this.apiUrl}/auth/forgot-password`, { email })
      .pipe(
        map(() => ({})),
        catchError(() => {
          // Always return success to prevent email enumeration
          return of({});
        })
      );
  }

  /**
   * Reset password with token from email
   */
  resetPassword(token: string, newPassword: string): Observable<{ error?: Error }> {
    return this.http
      .post<MessageResponse>(`${this.apiUrl}/auth/reset-password`, {
        token,
        new_password: newPassword,
      })
      .pipe(
        map(() => ({})),
        catchError((error: HttpErrorResponse) => {
          const message =
            error.error?.message || 'Invalid or expired reset token';
          return of({ error: new Error(message) });
        })
      );
  }

  /**
   * Handle successful auth response
   */
  private async handleAuthResponse(response: AuthResponse): Promise<void> {
    this.accessToken = response.access_token;
    this.authState.setAccessToken(response.access_token);

    // Persist tokens on mobile
    if (this.isNative && response.refresh_token) {
      this.storedRefreshToken = response.refresh_token;
      await this.persistTokens(response.access_token, response.refresh_token);
    } else if (this.isNative && !response.refresh_token) {
      console.warn('[AuthService] Native platform but no refresh_token in response!');
    }

    const session: AuthSession = {
      access_token: response.access_token,
      expires_in: response.expires_in,
      token_type: response.token_type,
      user: response.user,
    };
    this.authState.setSession(session);

    const user: User = {
      id: response.user.id,
      email: response.user.email,
      created_at: response.user.created_at,
      updated_at: new Date().toISOString(),
      preferences: DEFAULT_USER_PREFERENCES,
    };
    this.authState.setCurrentUser(user);

    // Load user preferences from backend
    this.loadUserPreferences(response.user.id);
  }

  /**
   * Load user from JWT token payload
   */
  private loadUserFromToken(payload: JwtPayload): void {
    const user: User = {
      id: payload.user_id,
      email: payload.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferences: DEFAULT_USER_PREFERENCES,
    };
    this.authState.setCurrentUser(user);

    // Load user preferences from backend
    this.loadUserPreferences(payload.user_id);
  }

  /**
   * Load user preferences from backend
   */
  private async loadUserPreferences(_userId: string): Promise<void> {
    try {
      const response = await this.http
        .get<UserPreferences>(`${this.apiUrl}/user/preferences`)
        .toPromise();

      if (response) {
        const currentUser = this.authState.currentUser();
        if (currentUser) {
          this.authState.setCurrentUser({
            ...currentUser,
            preferences: {
              ...DEFAULT_USER_PREFERENCES,
              ...response,
            },
          });
        }
      }
    } catch {
      // Use default preferences if fetch fails
    }
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
  upgradeToAuthenticated(
    email: string,
    password: string
  ): Observable<{ error?: Error }> {
    const anonymousUserId = this.authState.currentUser()?.id;

    if (!anonymousUserId || !this.isAnonymous()) {
      return of({ error: new Error('Not in anonymous mode') });
    }

    return this.signUp(email, password);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    preferences: Partial<UserPreferences>
  ): Promise<{ error?: Error }> {
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
      await this.http
        .patch(`${this.apiUrl}/user/preferences`, preferences)
        .toPromise();

      // Update local state
      const updatedUser: User = {
        ...user,
        preferences: { ...user.preferences, ...preferences },
        updated_at: new Date().toISOString(),
      };
      this.authState.setCurrentUser(updatedUser);

      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
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
    return (
      this.authState.currentUser()?.preferences.location_tracking_enabled ??
      false
    );
  }

  /**
   * Sign in with magic link (passwordless) - Not supported in self-hosted auth
   * @deprecated Use signInWithPassword instead
   */
  async signInWithMagicLink(_email: string): Promise<{ error?: Error }> {
    return { error: new Error('Magic link authentication is not supported in self-hosted mode') };
  }

  /**
   * Get onboarding status from server
   * Returns whether user has completed onboarding
   */
  async getOnboardingStatus(): Promise<{ completed: boolean }> {
    // Return cached value if already checked this session
    if (this.onboardingStatusCache !== null) {
      return { completed: this.onboardingStatusCache };
    }

    if (this.authState.isAnonymous() || !this.authState.isAuthenticated()) {
      // For anonymous users, use localStorage
      const completed = localStorage.getItem('onboarding_complete') === 'true';
      this.onboardingStatusCache = completed;
      return { completed };
    }

    try {
      const response = await this.http
        .get<{ success: boolean; data: { completed: boolean } }>(`${this.apiUrl}/user/onboarding`)
        .toPromise();

      const completed = response?.data?.completed ?? false;
      this.onboardingStatusCache = completed;
      return { completed };
    } catch {
      // Fallback to localStorage if API fails
      const completed = localStorage.getItem('onboarding_complete') === 'true';
      this.onboardingStatusCache = completed;
      return { completed };
    }
  }

  /**
   * Mark onboarding as completed on server
   */
  async completeOnboarding(): Promise<{ error?: Error }> {
    // Always store locally for fallback and update cache
    localStorage.setItem('onboarding_complete', 'true');
    this.onboardingStatusCache = true;

    if (this.authState.isAnonymous() || !this.authState.isAuthenticated()) {
      // For anonymous users, localStorage is sufficient
      return {};
    }

    try {
      await this.http
        .post(`${this.apiUrl}/user/onboarding/complete`, {})
        .toPromise();

      return {};
    } catch (error) {
      // Local storage already set, so user won't see onboarding again
      // Log error but don't fail the operation
      console.error('Failed to sync onboarding status to server:', error);
      return {};
    }
  }
}
