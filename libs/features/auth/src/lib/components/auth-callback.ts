import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { mapSupabaseError } from '@blastoise/shared';
import { getSupabaseClient } from '@blastoise/data';

/**
 * Auth Callback Component (T048-T050)
 *
 * Handles the authentication callback from magic link emails.
 * Supabase automatically processes the token in the URL and creates a session.
 * This component checks for the session and redirects accordingly.
 */
@Component({
  selector: 'lib-auth-callback',
  standalone: true,
  imports: [],
  templateUrl: './auth-callback.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallback implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly supabase = getSupabaseClient();

  // Processing state signal
  readonly isProcessing = signal(true);

  // Error state signal
  readonly error = signal<string | null>(null);

  /**
   * Initialize the callback process
   * Actively exchange the confirmation token for a session
   */
  async ngOnInit(): Promise<void> {
    try {
      // Get the hash fragment from the URL (contains the auth token)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // If we have tokens, set the session explicitly
      if (accessToken && refreshToken) {
        const { error } = await this.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          this.error.set(mapSupabaseError(error));
          this.isProcessing.set(false);
          return;
        }

        // Wait a moment for the auth state to update
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        // Fallback: wait for Supabase's automatic token processing
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await this.router.navigate(['/login']);
      // Check if we have an authenticated session
      if (this.authState.isAuthenticated()) {
        // Success! Redirect to visits (onboarding guard will handle first-time users)
        await this.router.navigate(['/visits']);
      } else {
        // No session found - token might be invalid or expired
        this.error.set('Invalid or expired authentication link. Please request a new one.');
        this.isProcessing.set(false);
      }
    } catch (err) {
      this.error.set(mapSupabaseError(err as Error));
      this.isProcessing.set(false);
    }
  }
}
