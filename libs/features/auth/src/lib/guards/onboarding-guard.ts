import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Checks onboarding completion status from server (for authenticated users)
 * or localStorage (for anonymous/unauthenticated users).
 * If user hasn't completed onboarding, redirects to /auth/onboarding
 *
 * This guard should be applied to main app routes (visits, map, settings)
 * to ensure first-time users see the onboarding wizard before using the app.
 */

export const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

export const onboardingGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Check if onboarding has been completed (server-side for authenticated users)
  const { completed } = await authService.getOnboardingStatus();

  if (completed) {
    return true;
  }

  // Redirect to onboarding, preserving the intended destination
  return router.createUrlTree(['/auth/onboarding'], {
    queryParams: { returnUrl: state.url },
  });
};
