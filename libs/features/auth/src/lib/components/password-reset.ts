/**
 * Password Reset Component
 *
 * Two-step password reset flow:
 * 1. Request reset link (email form)
 * 2. Set new password (after clicking email link with token)
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroEnvelope,
  heroKey,
  heroCheckCircle,
  heroXCircle,
  heroArrowLeft,
} from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth';
import { passwordStrengthValidator } from '../services/form-validators';
import { mapAuthError } from '@blastoise/shared';

type PasswordResetMode = 'request' | 'reset';

@Component({
  selector: 'lib-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgIconComponent],
  templateUrl: './password-reset.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({ heroEnvelope, heroKey, heroCheckCircle, heroXCircle, heroArrowLeft }),
  ],
})
export class PasswordReset implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private subscription: Subscription | null = null;

  readonly mode = signal<PasswordResetMode>('request');
  private resetToken: string | null = null;

  readonly resetRequestForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly newPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
    confirmPassword: ['', [Validators.required]],
  });

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  ngOnInit(): void {
    // Check if there's a reset token in the URL query params
    this.subscription = this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      if (token) {
        this.resetToken = token;
        this.mode.set('reset');
      } else {
        this.mode.set('request');
      }
    });
  }

  /**
   * Request password reset link
   * Sends email with reset link to user's email address
   */
  onRequestReset(): void {
    if (this.resetRequestForm.invalid) {
      return;
    }

    const email = this.resetRequestForm.value.email;
    if (!email) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.subscription = this.authService.forgotPassword(email).subscribe({
      next: (result) => {
        if (result.error) {
          this.error.set(mapAuthError(result.error));
        } else {
          // Always show success message (prevents email enumeration)
          this.success.set(true);
        }
      },
      error: (err) => {
        this.error.set('An unexpected error occurred. Please try again.');
        console.error('Password reset request failed:', err);
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Update password with new password
   * Called after user clicks reset link and submits new password
   */
  onUpdatePassword(): void {
    if (this.newPasswordForm.invalid) {
      return;
    }

    const { newPassword, confirmPassword } = this.newPasswordForm.value;

    if (!newPassword || !confirmPassword) {
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    if (!this.resetToken) {
      this.error.set('Invalid reset link. Please request a new one.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.subscription = this.authService
      .resetPassword(this.resetToken, newPassword)
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.error.set(mapAuthError(result.error));
          } else {
            // Success - redirect to login
            this.success.set(true);

            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 2000);
          }
        },
        error: (err) => {
          this.error.set('An unexpected error occurred. Please try again.');
          console.error('Password update failed:', err);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Helper for template: check if email control is invalid and touched
   */
  get emailInvalid(): boolean {
    const control = this.resetRequestForm.controls.email;
    return control.invalid && control.touched;
  }

  /**
   * Helper for template: check if new password control is invalid and touched
   */
  get newPasswordInvalid(): boolean {
    const control = this.newPasswordForm.controls.newPassword;
    return control.invalid && control.touched;
  }

  /**
   * Helper for template: check if confirm password control is invalid and touched
   */
  get confirmPasswordInvalid(): boolean {
    const control = this.newPasswordForm.controls.confirmPassword;
    return control.invalid && control.touched;
  }

  /**
   * Helper for template: get password errors for display
   */
  get passwordErrors(): { [key: string]: unknown } | null {
    return this.newPasswordForm.controls.newPassword.errors;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
