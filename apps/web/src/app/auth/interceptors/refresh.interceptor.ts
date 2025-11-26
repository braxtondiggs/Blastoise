/**
 * Token Refresh Interceptor (T079-T080)
 *
 * Catches 401 Unauthorized errors and automatically refreshes the access token
 * Retries the original request with the new token, or logs out on refresh failure
 * Uses functional HttpInterceptorFn with inject() API (Angular 20+)
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '@blastoise/features-auth';
import { Router } from '@angular/router';

/**
 * Intercepts 401 errors and attempts token refresh before retrying
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      // Only handle 401 Unauthorized errors
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // Skip refresh if this IS the refresh endpoint (prevent infinite loop)
      if (req.url.includes('/auth/refresh')) {
        // Refresh failed - log out user
        authService.signOut();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // Attempt to refresh the access token
      return authService.refreshToken().pipe(
        switchMap(() => {
          // Token refreshed successfully - retry original request with new token
          const newToken = authService.getAccessToken();

          if (!newToken) {
            // No token after refresh - log out
            authService.signOut();
            router.navigate(['/login']);
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
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
