/**
 * Onboarding Component
 *
 * Multi-step wizard that guides first-time users through the app's features:
 * - Step 1: Welcome to Blastoise
 * - Step 2: Location Permissions explanation
 * - Step 3: Privacy-first approach
 * - Step 4: Get Started (auth options)
 *
 * User Story 6: Onboarding Flow (T099-T110)
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

export interface OnboardingStep {
  title: string;
  content: string;
  iconClass?: string;
}

// T100: Define onboarding steps
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Blastoise',
    content:
      'Automatically track your brewery and winery visits with geofencing technology. Your visit history is stored privately and securely.',
  },
  {
    title: 'Location Permissions',
    content:
      'Blastoise needs location access to detect when you visit breweries and wineries. This enables automatic visit tracking without any manual check-ins.',
  },
  {
    title: 'Privacy First',
    content:
      'Your exact GPS coordinates are never stored. We only save venue references, so your location data stays private while you track your favorite spots.',
  },
  {
    title: 'Get Started',
    content:
      'Choose how you want to use Blastoise. You can create an account for cloud sync, or continue as a guest to try it out.',
  },
];

@Component({
  selector: 'lib-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './onboarding.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  // T099: Step navigation signals
  readonly currentStep = signal(0);
  readonly totalSteps = ONBOARDING_STEPS.length;
  readonly steps = ONBOARDING_STEPS;
  private returnUrl = '/auth/login';

  ngOnInit(): void {
    // T110: Get returnUrl from query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/auth/login';

    // Check if onboarding was already completed
    const isComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
    if (isComplete) {
      // Redirect to return URL if onboarding already done
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  // T101: Navigation methods
  nextStep(): void {
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.update((step) => step + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((step) => step - 1);
    }
  }

  // T101: Skip onboarding
  skip(): void {
    this.complete();
  }

  // T102: Mark onboarding as complete and store in localStorage
  // T110: Redirect to returnUrl after completion
  complete(): void {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    this.router.navigateByUrl(this.returnUrl);
  }

  // T108: Wire "Get Started" to show auth options
  onSignIn(): void {
    this.complete();
    // Navigation handled by complete() - user lands on login page
  }

  onContinueAsGuest(): void {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    this.authService.enableAnonymousMode();
    this.router.navigate(['/']);
  }
}
