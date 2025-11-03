import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService, CacheKeys } from '@blastoise/data-backend';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  ttl: number; // Time window in seconds
  limit: number; // Maximum requests in time window
}

/**
 * Decorator to set rate limiting for a route
 * @example
 * @RateLimit({ ttl: 60, limit: 10 }) // 10 requests per minute
 */
export const RateLimit = (options: RateLimitOptions) =>
  Reflect.metadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private cacheService: CacheService;

  constructor(private reflector: Reflector) {
    this.cacheService = new CacheService();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no rate limit is set, allow the request
    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const identifier = this.getIdentifier(request);
    const endpoint = `${request.method}:${request.route?.path || request.url}`;

    const key = CacheKeys.rateLimit(identifier, endpoint);

    // Get current request count
    const currentCount = await this.cacheService.get<number>(key);

    if (currentCount === null) {
      // First request in window
      await this.cacheService.set(key, 1, { ttl: rateLimitOptions.ttl });
      return true;
    }

    if (currentCount >= rateLimitOptions.limit) {
      const ttl = await this.cacheService.ttl(key);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Increment counter
    await this.cacheService.increment(key);

    return true;
  }

  private getIdentifier(request: Request): string {
    // Try to get user ID from authenticated user
    const user = (request as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // Fall back to IP address
    const ip =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      'unknown';

    return `ip:${ip}`;
  }
}
