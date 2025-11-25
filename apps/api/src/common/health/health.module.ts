/**
 * Health Module
 *
 * Provides health check endpoints for monitoring:
 * - API server health
 * - Supabase connection
 * - Redis connection
 * - Database status
 *
 * Phase 7: Notifications & Observability
 */

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
