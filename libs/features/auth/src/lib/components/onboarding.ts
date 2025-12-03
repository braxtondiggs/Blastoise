/**
 * Onboarding Component
 *
 * Multi-step wizard that guides first-time users through the app's features:
 * - Step 1: Welcome to Blastoise
 * - Step 2: Location Permissions explanation
 * - Step 3: Privacy-first approach
 * - Step 4: Get Started (auth options)
 *
 * Features:
 * - Smooth slide animations between steps
 * - Visual icons for each step
 * - Progress indicator with step completion
 * - Engaging copy and modern UI
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroBuildingStorefront,
  heroMapPin,
  heroShieldCheck,
  heroRocketLaunch,
  heroArrowRight,
  heroArrowLeft,
  heroXMark,
  heroCheck,
  heroSparkles,
  heroBell,
  heroLockClosed,
  heroGlobeAlt,
  heroUserCircle,
} from '@ng-icons/heroicons/outline';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { FeatureFlagsService } from '@blastoise/data-frontend';

export interface OnboardingStep {
  title: string;
  subtitle: string;
  content: string;
  icon: string;
  accentIcon?: string;
  gradient: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Blastoise',
    subtitle: 'Your Personal Tasting Journey',
    content:
      'Automatically track your brewery and winery visits. Build your tasting history and discover new favorites along the way.',
    icon: 'heroBuildingStorefront',
    accentIcon: 'heroSparkles',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
  },
  {
    title: 'Smart Location Tracking',
    subtitle: 'Hands-Free Visit Detection',
    content:
      'Using geofencing technology, Blastoise detects when you arrive at a venue. No manual check-ins required - just enjoy your experience.',
    icon: 'heroMapPin',
    accentIcon: 'heroBell',
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
  },
  {
    title: 'Privacy First, Always',
    subtitle: 'Your Data Stays Yours',
    content:
      'We never store your exact GPS coordinates. Only venue references are saved, keeping your location data completely private.',
    icon: 'heroShieldCheck',
    accentIcon: 'heroLockClosed',
    gradient: 'from-emerald-500 via-green-500 to-lime-500',
  },
  {
    title: 'Ready to Explore?',
    subtitle: 'Start Your Journey Today',
    content:
      'Your visits will be automatically tracked as you discover new breweries and wineries. Let the adventure begin!',
    icon: 'heroRocketLaunch',
    accentIcon: 'heroGlobeAlt',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
  },
];

@Component({
  selector: 'lib-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  templateUrl: './onboarding.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      heroBuildingStorefront,
      heroMapPin,
      heroShieldCheck,
      heroRocketLaunch,
      heroArrowRight,
      heroArrowLeft,
      heroXMark,
      heroCheck,
      heroSparkles,
      heroBell,
      heroLockClosed,
      heroGlobeAlt,
      heroUserCircle,
    }),
  ],
})
export class Onboarding implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly currentStep = signal(0);
  readonly totalSteps = ONBOARDING_STEPS.length;
  readonly steps = ONBOARDING_STEPS;
  private returnUrl = '/auth/login';

  /** Animation direction for slide transitions */
  readonly slideDirection = signal<'left' | 'right'>('right');

  /** Animation state for triggering transitions */
  readonly isAnimating = signal(false);

  /** Check if user is already authenticated (not anonymous) */
  readonly isAuthenticated = computed(() => this.authState.isAuthenticated() && !this.authState.isAnonymous());

  /** Feature flags */
  readonly guestModeEnabled = this.featureFlags.guestModeEnabled;

  /** Computed values for current step */
  readonly currentStepData = computed(() => this.steps[this.currentStep()]);
  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.totalSteps - 1);
  readonly progressPercentage = computed(() => ((this.currentStep() + 1) / this.totalSteps) * 100);

  async ngOnInit(): Promise<void> {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/auth/login';

    // Check if onboarding was already completed (server-side for authenticated users)
    const { completed } = await this.authService.getOnboardingStatus();
    if (completed) {
      // Redirect to return URL if onboarding already done
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps - 1 && !this.isAnimating()) {
      this.slideDirection.set('right');
      this.animateTransition(() => {
        this.currentStep.update((step) => step + 1);
      });
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0 && !this.isAnimating()) {
      this.slideDirection.set('left');
      this.animateTransition(() => {
        this.currentStep.update((step) => step - 1);
      });
    }
  }

  goToStep(index: number): void {
    if (index !== this.currentStep() && !this.isAnimating() && index <= this.currentStep()) {
      this.slideDirection.set(index > this.currentStep() ? 'right' : 'left');
      this.animateTransition(() => {
        this.currentStep.set(index);
      });
    }
  }

  private animateTransition(callback: () => void): void {
    this.isAnimating.set(true);
    // Small delay for exit animation
    setTimeout(() => {
      callback();
      // Allow enter animation to complete
      setTimeout(() => {
        this.isAnimating.set(false);
      }, 300);
    }, 150);
  }

  skip(): void {
    this.complete();
  }

  async complete(): Promise<void> {
    // Mark onboarding as complete on server (and localStorage as fallback)
    await this.authService.completeOnboarding();

    // If user is already authenticated, go to home; otherwise use returnUrl (login page)
    if (this.isAuthenticated()) {
      this.router.navigate(['/']);
    } else {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  onSignIn(): void {
    this.complete();
    // Navigation handled by complete() - user lands on login page
  }

  async onContinueAsGuest(): Promise<void> {
    await this.authService.completeOnboarding();
    this.authService.enableAnonymousMode();
    this.router.navigate(['/']);
  }
}
