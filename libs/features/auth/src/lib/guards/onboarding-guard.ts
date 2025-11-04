import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * T109-T110: Onboarding Guard - Redirects to onboarding if not completed
 *
 * Checks localStorage for onboarding completion status.
 * If user hasn't completed onboarding, redirects to /auth/onboarding
 *
 * This guard should be applied to main app routes (visits, map, settings)
 * to ensure first-time users see the onboarding wizard before using the app.
 */

export const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

export const onboardingGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Check if onboarding has been completed
  const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);

  if (onboardingComplete === 'true') {
    return true;
  }

  // Redirect to onboarding, preserving the intended destination
  return router.createUrlTree(['/auth/onboarding'], {
    queryParams: { returnUrl: state.url },
  });
};
