/**
 * T240: HTTP Cache Interceptor
 *
 * Adds HTTP caching headers for venue endpoints to reduce load:
 * - GET /venues/*: Cache for 5 minutes
 * - GET /venues/nearby: Cache for 1 minute (location-based)
 * - GET /venues/search: Cache for 2 minutes
 *
 * Phase 8: Performance Optimization
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

export interface CacheConfig {
  /**
   * Cache duration in seconds
   */
  maxAge: number;

  /**
   * Cache-Control directives
   */
  directives?: string[];
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  /**
   * Cache configurations per endpoint pattern
   */
  private readonly cacheConfigs = new Map<RegExp, CacheConfig>([
    // Venue endpoints - data doesn't change frequently
    [/^\/api\/v1\/venues\/[a-f0-9-]+$/, { maxAge: 300 }], // GET /venues/:id - 5 minutes
    [/^\/api\/v1\/venues\/search/, { maxAge: 120 }], // GET /venues/search - 2 minutes
    [/^\/api\/v1\/venues\/nearby/, { maxAge: 60 }], // GET /venues/nearby - 1 minute (location-based)
    [/^\/api\/v1\/venues$/, { maxAge: 300 }], // GET /venues - 5 minutes

    // Shared visits - can be cached longer
    [/^\/api\/v1\/shared\/[a-zA-Z0-9]+$/, { maxAge: 600 }], // GET /shared/:shareId - 10 minutes

    // User preferences - cache briefly
    [/^\/api\/v1\/user\/preferences$/, { maxAge: 60 }], // GET /user/preferences - 1 minute
  ]);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if this endpoint should be cached
    const path = request.url;
    const cacheConfig = this.getCacheConfig(path);

    if (!cacheConfig) {
      // No caching for this endpoint
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        // Only cache successful responses
        if (response.statusCode >= 200 && response.statusCode < 300) {
          this.setCacheHeaders(response, cacheConfig);
        }
      })
    );
  }

  /**
   * Get cache configuration for a given path
   */
  private getCacheConfig(path: string): CacheConfig | null {
    for (const [pattern, config] of this.cacheConfigs) {
      if (pattern.test(path)) {
        return config;
      }
    }
    return null;
  }

  /**
   * Set cache headers on response
   */
  private setCacheHeaders(response: Response, config: CacheConfig): void {
    const directives = config.directives || ['public'];

    // Build Cache-Control header
    const cacheControl = [
      ...directives,
      `max-age=${config.maxAge}`,
      `s-maxage=${config.maxAge}`, // CDN cache time
    ].join(', ');

    response.setHeader('Cache-Control', cacheControl);

    // Add ETag for conditional requests
    // NestJS will handle ETag generation if enabled

    // Add Vary header to differentiate cached responses
    response.setHeader('Vary', 'Accept, Accept-Encoding');
  }
}
