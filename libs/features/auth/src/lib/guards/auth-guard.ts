import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Auth Guard - Protects routes that require authentication
 *
 * Allows access if:
 * - User is authenticated (has valid Supabase session)
 * - User is in anonymous mode (local-only usage)
 *
 * Redirects to login if not authenticated and not in anonymous mode
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();
  const isAnonymous = authService.isAnonymous();

  if (isAuthenticated || isAnonymous) {
    return true;
  }

  // Redirect to login page, preserving the intended destination
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Authenticated Only Guard - Requires a real authenticated session
 * (Excludes anonymous users)
 */
export const authenticatedOnlyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = authService.isAuthenticated();
  const isAnonymous = authService.isAnonymous();

  if (isAuthenticated && !isAnonymous) {
    return true;
  }

  // Redirect to login with upgrade prompt for anonymous users
  return router.createUrlTree(['/auth/login'], {
    queryParams: {
      returnUrl: state.url,
      upgrade: isAnonymous ? 'true' : undefined,
    },
  });
};
