import { ChangeDetectionStrategy, Component, inject, signal, OnInit, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEnvelope, heroKey, heroCheckCircle, heroXCircle, heroUserCircle, heroArrowRightOnRectangle } from '@ng-icons/heroicons/outline';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { emailValidator } from '../services/form-validators';
import { mapSupabaseError } from '@blastoise/shared';

@Component({
  selector: 'lib-login',
  imports: [ReactiveFormsModule, NgIconComponent],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  viewProviders: [provideIcons({ heroEnvelope, heroKey, heroCheckCircle, heroXCircle, heroUserCircle, heroArrowRightOnRectangle })],
})
export class Login implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Reactive form for email/password login
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, emailValidator]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // Loading state signal
  readonly isLoading = signal(false);

  // Error message signal
  readonly error = signal<string | null>(null);

  // Authentication mode signal (T041)
  readonly mode = signal<'password' | 'magic-link'>('password');

  // Success message signal for magic link (T045)
  readonly showSuccessMessage = signal(false);

  constructor() {
    // Watch mode changes and update password field validators
    effect(() => {
      const currentMode = this.mode();
      const passwordControl = this.loginForm.controls.password;

      if (currentMode === 'magic-link') {
        // In magic link mode, password is not required
        passwordControl.clearValidators();
        passwordControl.updateValueAndValidity();
      } else {
        // In password mode, password is required
        passwordControl.setValidators([Validators.required, Validators.minLength(8)]);
        passwordControl.updateValueAndValidity();
      }
    });
  }

  /**
   * Check if user is already authenticated on component initialization
   * If authenticated, redirect to main app
   */
  ngOnInit(): void {
    if (this.authState.isAuthenticated()) {
      this.router.navigate(['/visits']);
    }
  }

  /**
   * Handle "Continue as Guest" button click
   * Enables anonymous mode and navigates to main app
   */
  onContinueAsGuest(): void {
    this.authService.enableAnonymousMode();
    this.router.navigate(['/visits']);
  }

  /**
   * Handle login form submission (T044)
   * Calls either signInWithPassword or signInWithMagicLink based on mode
   */
  async onSubmit(): Promise<void> {
    // In magic-link mode, only email is required
    if (this.mode() === 'magic-link') {
      if (this.loginForm.controls.email.invalid) {
        return;
      }
    } else {
      // In password mode, both email and password are required
      if (this.loginForm.invalid) {
        return;
      }
    }

    // Get form values BEFORE disabling
    const { email, password } = this.loginForm.value;

    this.isLoading.set(true);
    this.loginForm.disable(); // Disable form controls during loading
    this.error.set(null);
    this.showSuccessMessage.set(false); // Clear any previous success message

    try {
      let result;

      // Check mode and call appropriate auth method
      if (this.mode() === 'magic-link') {
        // Magic link authentication - only needs email
        result = await this.authService.signInWithMagicLink(email as string);

        if (!result.error) {
          // Show success message for magic link (T046, T047)
          this.showSuccessMessage.set(true);

          // Auto-dismiss after 5 seconds (T047)
          setTimeout(() => {
            this.showSuccessMessage.set(false);
          }, 5000);
        }
      } else {
        // Password authentication - needs email and password
        result = await this.authService.signInWithPassword(email as string, password as string);

        if (!result.error) {
          // Success - navigate to main app
          await this.router.navigate(['/visits']);
        }
      }

      // Handle errors for both modes
      if (result.error) {
        this.error.set(mapSupabaseError(result.error));
      }
    } catch (err) {
      this.error.set(mapSupabaseError(err as Error));
    } finally {
      this.isLoading.set(false);
      this.loginForm.enable(); // Re-enable form controls after loading
    }
  }
}
