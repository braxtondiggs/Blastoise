import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { mapSupabaseError } from '@blastoise/shared';

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

  // Processing state signal
  readonly isProcessing = signal(true);

  // Error state signal
  readonly error = signal<string | null>(null);

  /**
   * Initialize the callback process
   * Check if the user is authenticated after Supabase processes the token
   */
  async ngOnInit(): Promise<void> {
    try {
      // Wait a moment for Supabase to process the token from the URL
      // Supabase's onAuthStateChange listener should fire automatically
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if we have an authenticated session
      if (this.authState.isAuthenticated()) {
        // Success! Redirect to main app
        await this.router.navigate(['/']);
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
