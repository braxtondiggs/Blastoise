/**
 * Sentry Instrumentation
 *
 * This file MUST be imported first in main.ts before any other imports.
 * It initializes Sentry for automatic instrumentation and error tracking.
 *
 * @sentry/nestjs provides:
 * - Automatic exception capturing
 * - Performance monitoring for HTTP requests
 * - Database query instrumentation
 * - Custom NestJS integrations
 *
 * Phase 7: Notifications & Observability
 */

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

// Only initialize Sentry if DSN is configured
if (dsn) {
  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    integrations: [
      // Add profiling integration
      nodeProfilingIntegration(),
    ],

    // Filter out sensitive data before sending to Sentry
    beforeSend(event, _hint) {
      // Remove sensitive request data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.Authorization;
        delete event.request.headers?.authorization;
        delete event.request.headers?.cookie;
      }

      // Remove password, token, and secret fields from extra data
      if (event.extra) {
        const extraData = event.extra as Record<string, unknown>;
        Object.keys(extraData).forEach((key) => {
          if (
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('key')
          ) {
            delete extraData[key];
          }
        });
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            const data = breadcrumb.data as Record<string, unknown>;
            Object.keys(data).forEach((key) => {
              if (
                key.toLowerCase().includes('password') ||
                key.toLowerCase().includes('token') ||
                key.toLowerCase().includes('secret')
              ) {
                delete data[key];
              }
            });
          }
          return breadcrumb;
        });
      }

      return event;
    },
  });

  console.log(`✅ Sentry initialized (${environment})`);
} else {
  console.warn('⚠️  SENTRY_DSN not configured - error tracking disabled');
}
