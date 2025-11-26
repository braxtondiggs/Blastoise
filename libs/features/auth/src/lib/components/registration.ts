import { Component, ChangeDetectionStrategy, signal, computed, inject, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEnvelope, heroKey, heroUser, heroXCircle, heroCheckCircle, heroUserPlus } from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth';
import { passwordStrengthValidator, passwordMatchValidator } from '../services/form-validators';
import { mapAuthError } from '@blastoise/shared';

/**
 * Registration Component (T062-T074)
 *
 * New account registration with:
 * - Email, password, confirm password, and terms agreement
 * - Real-time password strength validation with checklist
 * - Password match validation
 * - Loading states during submission
 * - User-friendly error messages
 * - Accessibility with ARIA attributes
 */
@Component({
  selector: 'lib-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgIconComponent],
  templateUrl: './registration.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ heroEnvelope, heroKey, heroUser, heroXCircle, heroCheckCircle, heroUserPlus })],
})
export class Registration implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private subscription: Subscription | null = null;

  // Loading and error state signals
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Password signal for real-time strength checking
  private readonly passwordValue = signal('');

  // Registration form with validators (T063-T065)
  readonly registrationForm = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
      updateOn: 'blur',
    }),
    password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(8), passwordStrengthValidator],
      updateOn: 'change', // Real-time feedback for password strength
    }),
    confirmPassword: new FormControl('', {
      validators: [Validators.required, passwordMatchValidator('password')],
      updateOn: 'change', // Real-time feedback for match
    }),
    agreeToTerms: new FormControl(false, {
      validators: [Validators.requiredTrue],
    }),
  });

  // Password strength signals (T066)
  readonly hasMinLength = computed(() => {
    const password = this.passwordValue();
    return password.length >= 8;
  });

  readonly hasLetter = computed(() => {
    const password = this.passwordValue();
    return /[a-zA-Z]/.test(password);
  });

  readonly hasNumber = computed(() => {
    const password = this.passwordValue();
    return /[0-9]/.test(password);
  });

  // Subscribe to password changes for signal updates
  constructor() {
    this.registrationForm.controls.password.valueChanges.subscribe((value) => {
      this.passwordValue.set(value || '');
      this.registrationForm.controls.confirmPassword.updateValueAndValidity();
    });
  }

  /**
   * Form submission handler (T072)
   * Creates new account via AuthService.signUp
   * Redirects to main app on success
   * Shows error message on failure
   */
  onSubmit(): void {
    if (this.registrationForm.invalid) {
      return;
    }

    const { email, password } = this.registrationForm.value;

    this.isLoading.set(true);
    this.registrationForm.disable();
    this.error.set(null);
    this.successMessage.set(null);

    this.subscription = this.authService
      .signUp(email as string, password as string)
      .subscribe({
        next: (result) => {
          if (result.error) {
            // Map errors to user-friendly messages
            this.error.set(mapAuthError(result.error));
          } else if (result.needsEmailConfirmation) {
            // Show success message and keep user on registration page
            this.successMessage.set(
              'Registration successful! Please check your email to confirm your account before signing in.'
            );
            this.registrationForm.reset();
          } else {
            // Email confirmation not required, redirect to visits
            this.router.navigate(['/visits']);
          }
        },
        error: (err) => {
          this.error.set(mapAuthError(err as Error));
        },
        complete: () => {
          this.isLoading.set(false);
          this.registrationForm.enable();
        },
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
