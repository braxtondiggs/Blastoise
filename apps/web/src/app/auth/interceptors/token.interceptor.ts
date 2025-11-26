/**
 * Token Attachment Interceptor
 *
 * Automatically attaches JWT access token to all outgoing HTTP requests
 * Uses functional HttpInterceptorFn with inject() API (Angular 20+)
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@blastoise/features-auth';

/**
 * Adds Authorization header with Bearer token to all HTTP requests
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();

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
