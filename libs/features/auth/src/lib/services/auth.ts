import { Injectable, inject, InjectionToken, Inject, Optional } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, map, switchMap, take } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { User, DEFAULT_USER_PREFERENCES, UserPreferences } from '@blastoise/shared';
import { AuthStateService, AuthSession } from '@blastoise/shared/auth-state';

const ANONYMOUS_USER_KEY = 'anonymous_user_id';
const ANONYMOUS_MODE_KEY = 'anonymous_mode';

/**
 * Injection token for API base URL
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

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

  // Refresh in progress flag to prevent multiple simultaneous refreshes
  private refreshInProgress$ = new BehaviorSubject<boolean>(false);

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
      // Try to refresh token on app load (refresh token is in httpOnly cookie)
      try {
        await this.refreshToken().pipe(take(1)).toPromise();
      } catch {
        // No valid refresh token - user will need to log in
        this.authState.setCurrentUser(null);
      }
      this.authState.setInitialized(true);
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
   * Refresh access token using httpOnly refresh token cookie
   */
  refreshToken(): Observable<void> {
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

    return this.http
      .post<RefreshResponse>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.accessToken = response.access_token;
          this.authState.setAccessToken(response.access_token);

          // Decode token to get user info
          const decoded = jwtDecode<JwtPayload>(response.access_token);
          this.loadUserFromToken(decoded);
        }),
        map(() => undefined),
        catchError((error) => {
          this.accessToken = null;
          this.authState.setAccessToken(null);
          this.authState.setCurrentUser(null);
          this.authState.setSession(null);
          return throwError(() => error);
        }),
        tap({
          complete: () => this.refreshInProgress$.next(false),
          error: () => this.refreshInProgress$.next(false),
        })
      );
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
    this.authState.clear();
    this.router.navigate(['/']);
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
  private handleAuthResponse(response: AuthResponse): void {
    this.accessToken = response.access_token;
    this.authState.setAccessToken(response.access_token);

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
}
