import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '@blastoise/shared/auth-state';

/**
 * Auth Guard - Protects routes that require authentication
 *
 * Allows access if:
 * - User is authenticated (has valid JWT session)
 * - User is in anonymous mode (local-only usage)
 *
 * Redirects to login if not authenticated and not in anonymous mode
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // Wait for auth to initialize (poll until initialized)
  const maxWaitMs = 5000;
  const startTime = Date.now();
  while (!authState.isInitialized() && Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const isAuthenticated = authState.isAuthenticated();
  const isAnonymous = authState.isAnonymous();

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
export const authenticatedOnlyGuard: CanActivateFn = async (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // Wait for auth to initialize (poll until initialized)
  const maxWaitMs = 5000;
  const startTime = Date.now();
  while (!authState.isInitialized() && Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const isAuthenticated = authState.isAuthenticated();
  const isAnonymous = authState.isAnonymous();

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
