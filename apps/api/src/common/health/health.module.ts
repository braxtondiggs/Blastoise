/**
 * Health Module
 *
 * Provides health check endpoints for monitoring:
 * - API server health
 * - Database connection (PostgreSQL via TypeORM)
 * - Redis connection
 *
 * Phase 7: Notifications & Observability
 */

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { Venue } from '../../entities/venue.entity';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    TypeOrmModule.forFeature([Venue]),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
