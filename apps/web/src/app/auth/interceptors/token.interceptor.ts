/**
 * Token Attachment Interceptor
 *
 * Automatically attaches JWT access token to all outgoing HTTP requests
 * Uses functional HttpInterceptorFn with inject() API (Angular 20+)
 *
 * NOTE: Uses AuthStateService instead of AuthService to avoid circular dependency.
 * AuthService makes HTTP requests during initialization, which would trigger this
 * interceptor before AuthService is fully constructed.
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '@blastoise/shared/auth-state';

/**
 * Adds Authorization header with Bearer token to all HTTP requests
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const accessToken = authState.accessToken();

  // Skip token attachment if no access token available
  if (!accessToken) {
    return next(req);
  }

  // Clone request and add Authorization header
  const clonedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return next(clonedRequest);
};
