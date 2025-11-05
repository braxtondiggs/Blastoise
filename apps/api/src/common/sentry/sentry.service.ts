/**
 * Sentry Service for Error Tracking and Alerting
 *
 * Provides error tracking, performance monitoring, and alerting using @sentry/nestjs.
 * Integrates with Sentry.io for production error management.
 *
 * This service wraps Sentry SDK for easier usage in NestJS controllers and services.
 * Automatic exception capturing is handled by SentryGlobalFilter.
 *
 * Phase 7: Notifications & Observability
 */

import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  private errorRateThreshold = 0.05; // 5% error rate threshold
  private recentErrors: Date[] = [];
  private readonly errorWindowMs = 5 * 60 * 1000; // 5 minute window

  constructor() {
    // Sentry is already initialized in instrument.ts
    // This service provides a wrapper for easier usage in NestJS
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      this.logger.log('Sentry service ready (initialized via instrument.ts)');
    } else {
      this.logger.warn('SENTRY_DSN not configured - error tracking disabled');
    }
  }

  /**
   * Capture error with context (user ID, timestamp, request details)
   */
  captureException(error: Error, context?: ErrorContext): void {
    // Track error for rate monitoring
    this.trackError();

    // Set Sentry context
    if (context) {
      Sentry.setContext('error_context', {
        userId: context.userId,
        requestId: context.requestId,
        endpoint: context.endpoint,
        method: context.method,
        timestamp: context.timestamp || new Date().toISOString(),
        ...context.additionalData,
      });

      // Set user context (for grouping errors by user)
      if (context.userId) {
        Sentry.setUser({ id: context.userId });
      }

      // Set tags for filtering
      if (context.endpoint) {
        Sentry.setTag('endpoint', context.endpoint);
      }
      if (context.method) {
        Sentry.setTag('method', context.method);
      }
    }

    // Capture exception
    Sentry.captureException(error);

    // Log locally as well
    this.logger.error(`Captured exception: ${error.message}`, {
      error: error.stack,
      context,
    });
  }

  /**
   * Capture message (for warnings or info)
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    Sentry.captureMessage(message, level);
  }

  /**
   * Track error for rate monitoring
   */
  private trackError(): void {
    const now = new Date();
    this.recentErrors.push(now);

    // Clean up old errors outside the window
    this.recentErrors = this.recentErrors.filter(
      (errorDate) => now.getTime() - errorDate.getTime() < this.errorWindowMs
    );
  }

  /**
   * Implement error rate alerting
   * Checks if error rate exceeds threshold
   */
  checkErrorRate(): { exceeded: boolean; rate: number; count: number } {
    const now = new Date();

    // Count errors in the window
    const recentErrorCount = this.recentErrors.filter(
      (errorDate) => now.getTime() - errorDate.getTime() < this.errorWindowMs
    ).length;

    // Calculate rate (errors per minute)
    const windowMinutes = this.errorWindowMs / (60 * 1000);
    const rate = recentErrorCount / windowMinutes;

    // Check if threshold exceeded
    const exceeded = rate > this.errorRateThreshold * 60; // Convert to per-minute threshold

    if (exceeded) {
      this.logger.warn(`Error rate threshold exceeded: ${rate.toFixed(2)} errors/min (threshold: ${(this.errorRateThreshold * 60).toFixed(2)})`);

      // Send alert to Sentry
      this.captureMessage(
        `High error rate detected: ${rate.toFixed(2)} errors/min`,
        'warning'
      );
    }

    return {
      exceeded,
      rate,
      count: recentErrorCount,
    };
  }

  /**
   * Start a transaction for performance monitoring
   * Note: startTransaction is deprecated in Sentry v8, use startSpan instead
   */
  startTransaction(name: string, op: string): unknown {
    return Sentry.startSpan({
      name,
      op,
    }, (span) => span);
  }

  /**
   * Set user context
   */
  setUser(userId: string): void {
    Sentry.setUser({ id: userId });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Flush pending events (useful for serverless environments)
   */
  async flush(timeout = 2000): Promise<boolean> {
    return Sentry.flush(timeout);
  }
}
