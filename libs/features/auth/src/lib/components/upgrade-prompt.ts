/**
 * Upgrade Prompt Component
 *
 * Allows anonymous users to upgrade to authenticated accounts while preserving
 * their local visit data. Shows local visit count and migration status.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { passwordStrengthValidator, passwordsMatchValidator } from '../services/form-validators';

type MigrationStatus = 'pending' | 'in-progress' | 'complete' | 'failed';

@Component({
  selector: 'lib-upgrade-prompt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upgrade-prompt.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpgradePrompt implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private subscription: Subscription | null = null;

  readonly upgradeForm = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordsMatchValidator('password', 'confirmPassword')],
    }
  );

  readonly localVisitCount = signal(0);

  readonly migrationStatus = signal<MigrationStatus>('pending');

  readonly isLoading = signal(false);

  readonly error = signal<string | null>(null);

  readonly visible = computed(() => this.authState.isAnonymous());

  async ngOnInit(): Promise<void> {
    await this.loadLocalVisitCount();
  }

  /**
   * Query IndexedDB for local visits count
   */
  private async loadLocalVisitCount(): Promise<void> {
    try {
      // TODO: Replace with actual IndexedDB query when visit repository is available
      // For now, use mock data or localStorage as placeholder
      const mockCount = 0; // Will be replaced with actual IndexedDB query
      this.localVisitCount.set(mockCount);
    } catch (err) {
      console.error('Failed to load local visit count:', err);
      this.localVisitCount.set(0);
    }
  }

  /**
   * Handle form submission to upgrade anonymous user to authenticated account
   */
  onSubmit(): void {
    if (this.upgradeForm.invalid) {
      return;
    }

    const { email, password } = this.upgradeForm.value;
    if (!email || !password) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.migrationStatus.set('in-progress');

    this.subscription = this.authService
      .upgradeToAuthenticated(email, password)
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.migrationStatus.set('failed');
            this.error.set(this.mapErrorMessage(result.error));
          } else {
            this.migrationStatus.set('complete');

            setTimeout(() => {
              this.router.navigate(['/']);
            }, 1500); // Brief delay to show success message
          }
        },
        error: (err) => {
          this.migrationStatus.set('failed');
          this.error.set('An unexpected error occurred. Please try again.');
          console.error('Upgrade failed:', err);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Retry migration after failure
   */
  retry(): void {
    this.migrationStatus.set('pending');
    this.error.set(null);
  }

  /**
   * Map auth errors to user-friendly messages
   */
  private mapErrorMessage(error: any): string {
    const message = error?.message || '';

    if (message.includes('already registered') || message.includes('already exists')) {
      return 'This email is already registered. Try signing in instead.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection issue. Please check your internet and try again.';
    }

    if (message.includes('invalid') || message.includes('malformed')) {
      return 'Invalid email or password format.';
    }

    return 'Failed to create account. Please try again.';
  }

  /**
   * Helper for template: check if email control is invalid and touched
   */
  get emailInvalid(): boolean {
    const control = this.upgradeForm.controls.email;
    return control.invalid && control.touched;
  }

  /**
   * Helper for template: check if password control is invalid and touched
   */
  get passwordInvalid(): boolean {
    const control = this.upgradeForm.controls.password;
    return control.invalid && control.touched;
  }

  /**
   * Helper for template: check if confirmPassword control is invalid and touched
   */
  get confirmPasswordInvalid(): boolean {
    const control = this.upgradeForm.controls.confirmPassword;
    return control.invalid && control.touched;
  }

  /**
   * Helper for template: get password errors for display
   */
  get passwordErrors(): any {
    return this.upgradeForm.controls.password.errors;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
