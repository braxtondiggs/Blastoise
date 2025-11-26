import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthStateService } from '@blastoise/shared/auth-state';

/**
 * Auth Callback Component
 *
 * Handles authentication callbacks for:
 * - Email verification (future enhancement)
 * - OAuth providers (future enhancement)
 *
 * For self-hosted auth, this component primarily handles
 * redirects after email verification or password reset.
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
  private readonly route = inject(ActivatedRoute);

  // Processing state signal
  readonly isProcessing = signal(true);

  // Error state signal
  readonly error = signal<string | null>(null);

  /**
   * Initialize the callback process
   * Check for verification tokens or redirect parameters
   */
  ngOnInit(): void {
    // Check for query parameters
    const params = this.route.snapshot.queryParams;
    const verified = params['verified'];
    const error = params['error'];

    if (error) {
      this.error.set(decodeURIComponent(error));
      this.isProcessing.set(false);
      return;
    }

    if (verified === 'true') {
      // Email was verified successfully - redirect to login
      setTimeout(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { verified: 'true' },
        });
      }, 1000);
      return;
    }

    // Check if already authenticated
    if (this.authState.isAuthenticated()) {
      // Already logged in - redirect to visits
      this.router.navigate(['/visits']);
      return;
    }

    // No specific callback action - redirect to login
    setTimeout(() => {
      this.router.navigate(['/auth/login']);
    }, 1000);
  }
}
