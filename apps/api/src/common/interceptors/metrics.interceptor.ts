/**
 * T228: API Response Latency Tracking
 *
 * Tracks API endpoint performance metrics:
 * - Response times
 * - Request counts
 * - Error rates
 * - Slow endpoints identification
 *
 * Phase 7: Notifications & Observability
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

interface EndpointMetrics {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  lastAccessed: Date;
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Metrics');
  private readonly metrics = new Map<string, EndpointMetrics>();
  private readonly slowRequestThreshold = 1000; // 1 second

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    // Normalize URL (remove query params and IDs for grouping)
    const normalizedUrl = this.normalizeUrl(url);
    const endpoint = `${method} ${normalizedUrl}`;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.recordMetric(endpoint, duration, false);

          // Log slow requests
          if (duration > this.slowRequestThreshold) {
            this.logger.warn(`Slow request detected: ${endpoint} took ${duration}ms`);
          }
        },
        error: () => {
          const duration = Date.now() - startTime;
          this.recordMetric(endpoint, duration, true);
        },
      })
    );
  }

  /**
   * Record metrics for an endpoint
   */
  private recordMetric(endpoint: string, duration: number, isError: boolean): void {
    const existing = this.metrics.get(endpoint);

    if (existing) {
      // Update existing metrics
      const newCount = existing.count + 1;
      const newTotalDuration = existing.totalDuration + duration;

      this.metrics.set(endpoint, {
        count: newCount,
        totalDuration: newTotalDuration,
        avgDuration: newTotalDuration / newCount,
        minDuration: Math.min(existing.minDuration, duration),
        maxDuration: Math.max(existing.maxDuration, duration),
        errorCount: existing.errorCount + (isError ? 1 : 0),
        lastAccessed: new Date(),
      });
    } else {
      // Create new metrics entry
      this.metrics.set(endpoint, {
        count: 1,
        totalDuration: duration,
        avgDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        errorCount: isError ? 1 : 0,
        lastAccessed: new Date(),
      });
    }
  }

  /**
   * Normalize URL by removing IDs and query parameters
   * Example: /visits/123/share?foo=bar → /visits/:id/share
   */
  private normalizeUrl(url: string): string {
    // Remove query parameters
    const urlWithoutQuery = url.split('?')[0];

    // Replace UUIDs with :id
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    let normalized = urlWithoutQuery.replace(uuidPattern, ':id');

    // Replace numeric IDs with :id
    normalized = normalized.replace(/\/\d+($|\/)/g, '/:id$1');

    return normalized;
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string): EndpointMetrics | undefined {
    return this.metrics.get(endpoint);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, EndpointMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get top N slowest endpoints
   */
  getSlowestEndpoints(limit = 10): Array<{ endpoint: string; metrics: EndpointMetrics }> {
    return Array.from(this.metrics.entries())
      .map(([endpoint, metrics]) => ({ endpoint, metrics }))
      .sort((a, b) => b.metrics.avgDuration - a.metrics.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get endpoints with highest error rates
   */
  getHighestErrorRates(limit = 10): Array<{ endpoint: string; metrics: EndpointMetrics; errorRate: number }> {
    return Array.from(this.metrics.entries())
      .map(([endpoint, metrics]) => ({
        endpoint,
        metrics,
        errorRate: metrics.errorCount / metrics.count,
      }))
      .filter((item) => item.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.logger.log('Metrics reset');
  }

  /**
   * Log current metrics summary
   */
  logSummary(): void {
    const totalRequests = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.count, 0);
    const totalErrors = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.errorCount, 0);
    const avgResponseTime = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.avgDuration, 0) / this.metrics.size;

    this.logger.log(`=== Metrics Summary ===`);
    this.logger.log(`Total Requests: ${totalRequests}`);
    this.logger.log(`Total Errors: ${totalErrors}`);
    this.logger.log(`Error Rate: ${((totalErrors / totalRequests) * 100).toFixed(2)}%`);
    this.logger.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    this.logger.log(`Unique Endpoints: ${this.metrics.size}`);
    this.logger.log(`======================`);
  }
}
