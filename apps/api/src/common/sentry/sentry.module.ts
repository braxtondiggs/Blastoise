/**
 * T226: Sentry Module for Error Tracking
 *
 * Configures Sentry for production error monitoring.
 * Captures exceptions, tracks performance, and alerts on errors.
 *
 * Phase 7: Notifications & Observability
 */

import { Module, Global } from '@nestjs/common';
import { SentryService } from './sentry.service';

@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}
