/**
 * Token Refresh Interceptor
 *
 * Catches 401 Unauthorized errors and automatically refreshes the access token
 * Retries the original request with the new token, or logs out on refresh failure
 * Uses functional HttpInterceptorFn with inject() API (Angular 20+)
 *
 * NOTE: Uses AuthStateService to read token state to avoid circular dependency.
 * AuthService is only injected lazily when needed for refresh/logout operations.
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '@blastoise/features-auth';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { Router } from '@angular/router';

/**
 * Intercepts 401 errors and attempts token refresh before retrying
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const authState = inject(AuthStateService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      // Only handle 401 Unauthorized errors
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // Skip refresh for all auth endpoints (prevent infinite loop)
      // This includes /auth/refresh, /auth/logout, /auth/login, etc.
      if (req.url.includes('/auth/')) {
        return throwError(() => error);
      }

      // Lazily inject AuthService to avoid circular dependency
      const authService = injector.get(AuthService);

      // Attempt to refresh the access token
      return authService.refreshToken().pipe(
        switchMap(() => {
          // Token refreshed successfully - retry original request with new token
          const newToken = authState.accessToken();

          if (!newToken) {
            // No token after refresh - log out
            authService.signOut();
            router.navigate(['/auth/login']);
            return throwError(() => error);
          }

          // Clone and retry request with new token
          const clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
            },
          });

          return next(clonedRequest);
        }),
        catchError((refreshError) => {
          // Refresh failed - log out user
          authService.signOut();
          router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
