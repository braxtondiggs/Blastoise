/**
 * Password Reset Component
 *
 * Two-step password reset flow:
 * 1. Request reset link (email form)
 * 2. Set new password (after clicking email link)
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroEnvelope,
  heroKey,
  heroCheckCircle,
  heroXCircle,
  heroArrowLeft,
} from '@ng-icons/heroicons/outline';
import { getSupabaseClient } from '@blastoise/data';
import { passwordStrengthValidator } from '../services/form-validators';

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
export class PasswordReset implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly supabase = getSupabaseClient();

  readonly mode = signal<PasswordResetMode>('request');

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

  async ngOnInit(): Promise<void> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (session) {
      // User clicked reset link and has valid session - show password reset form
      this.mode.set('reset');
    } else {
      // No session - show email request form
      this.mode.set('request');
    }
  }

  /**
   * Request password reset link
   * Sends email with reset link to user's email address
   */
  async onRequestReset(): Promise<void> {
    if (this.resetRequestForm.invalid) {
      return;
    }

    const email = this.resetRequestForm.value.email;
    if (!email) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/password-reset`,
      });

      if (error) {
        this.error.set(this.mapErrorMessage(error));
      } else {
        this.success.set(true);
      }
    } catch (err) {
      this.error.set('An unexpected error occurred. Please try again.');
      console.error('Password reset request failed:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Update password with new password
   * Called after user clicks reset link and submits new password
   */
  async onUpdatePassword(): Promise<void> {
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

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        this.error.set(this.mapErrorMessage(error));
      } else {
        // Success - redirect to login
        this.success.set(true);

        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      }
    } catch (err) {
      this.error.set('An unexpected error occurred. Please try again.');
      console.error('Password update failed:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Map Supabase errors to user-friendly messages
   */
  private mapErrorMessage(error: Error | { message?: string }): string {
    const message = error?.message || '';

    if (message.includes('not found') || message.includes('no user')) {
      return 'No account found with this email address.';
    }

    if (message.includes('expired') || message.includes('invalid')) {
      return 'This reset link has expired. Please request a new one.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection issue. Please check your internet and try again.';
    }

    if (message.includes('password')) {
      return 'Password must be at least 8 characters with a letter and number.';
    }

    return 'Failed to reset password. Please try again.';
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
}
