import { ChangeDetectionStrategy, Component, inject, signal, OnInit, effect, PLATFORM_ID, OnDestroy, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEnvelope, heroKey, heroCheckCircle, heroXCircle, heroUserCircle, heroArrowRightOnRectangle } from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { emailValidator } from '../services/form-validators';
import { mapAuthError } from '@blastoise/shared';
import { FeatureFlagsService } from '@blastoise/data-frontend';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'lib-login',
  imports: [ReactiveFormsModule, NgIconComponent],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  viewProviders: [provideIcons({ heroEnvelope, heroKey, heroCheckCircle, heroXCircle, heroUserCircle, heroArrowRightOnRectangle })],
})
export class Login implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly featureFlags = inject(FeatureFlagsService);
  private subscription: Subscription | null = null;

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

  // Platform detection for native-only features
  private readonly isNativePlatform = signal(false);

  // Feature flags combined with platform detection
  readonly showAnonymousButton = computed(() =>
    this.featureFlags.guestModeEnabled() && this.isNativePlatform()
  );
  readonly showMagicLinkOption = this.featureFlags.magicLinkEnabled;

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
   * Also detect platform for feature flag combinations
   */
  ngOnInit(): void {
    // Detect platform: native mobile (iOS/Android)
    if (isPlatformBrowser(this.platformId)) {
      const platform = Capacitor.getPlatform();
      this.isNativePlatform.set(platform === 'ios' || platform === 'android');
    }

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
  onSubmit(): void {
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

    // Check mode and call appropriate auth method
    if (this.mode() === 'magic-link') {
      // Magic link authentication - not supported in self-hosted mode
      this.authService.signInWithMagicLink(email as string).then((result) => {
        if (result.error) {
          this.error.set(mapAuthError(result.error));
        }
        this.isLoading.set(false);
        this.loginForm.enable();
      });
    } else {
      // Password authentication - needs email and password (returns Observable)
      this.subscription = this.authService
        .signInWithPassword(email as string, password as string)
        .subscribe({
          next: (result) => {
            if (result.error) {
              this.error.set(mapAuthError(result.error));
            } else {
              // Success - navigate to main app
              this.router.navigate(['/visits']);
            }
          },
          error: (err) => {
            this.error.set(mapAuthError(err as Error));
          },
          complete: () => {
            this.isLoading.set(false);
            this.loginForm.enable();
          },
        });
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
