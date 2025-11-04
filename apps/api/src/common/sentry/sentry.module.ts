/**
 * T226: Sentry Module for Error Tracking
 *
 * Configures Sentry for production error monitoring using @sentry/nestjs.
 * Provides automatic exception capturing, performance monitoring, and alerting.
 *
 * The @sentry/nestjs integration provides:
 * - Automatic exception filter for uncaught errors
 * - Performance instrumentation for HTTP requests
 * - Distributed tracing support
 * - Custom NestJS-specific integrations
 *
 * Phase 7: Notifications & Observability
 */

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule as BaseSentryModule } from '@sentry/nestjs/setup';
import { SentryService } from './sentry.service';

@Module({
  imports: [
    // SentryModule.forRoot() is not needed because Sentry.init() is called in instrument.ts
    // The BaseSentryModule provides the NestJS-specific integrations
    BaseSentryModule.forRoot(),
  ],
  providers: [
    SentryService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
  exports: [SentryService],
})
export class SentryModule {}
