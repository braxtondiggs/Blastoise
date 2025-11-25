/**
 * Health Check Controller
 *
 * Endpoints for system health monitoring:
 * - GET /health: Overall system health
 * - GET /health/db: Database health (Supabase Postgres)
 * - GET /health/redis: Redis health
 *
 * Phase 7: Notifications & Observability
 */

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { getSupabaseClient, getRedisClient } from '@blastoise/data-backend';

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
  ) {}

  /**
   * Overall system health check
   * Returns: { status: 'ok', info: {...}, error: {...} }
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Overall system health check',
    description: 'Checks API, database, and Redis health. No authentication required.',
  })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Check if API is responsive
      () => Promise.resolve({ api: { status: 'up' } }),

      // Check database (Supabase Postgres)
      async () => {
        try {
          const supabase = getSupabaseClient();
          const { error } = await supabase.from('venues').select('id').limit(1);

          if (error) {
            return {
              database: {
                status: 'down',
                message: error.message,
              },
            };
          }

          return {
            database: {
              status: 'up',
            },
          };
        } catch (error: unknown) {
          return {
            database: {
              status: 'down',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      },

      // Check Redis
      async () => {
        try {
          const redis = await getRedisClient();
          await redis.ping();

          return {
            redis: {
              status: 'up',
            },
          };
        } catch (error: unknown) {
          return {
            redis: {
              status: 'down',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      },
    ]);
  }

  /**
   * Database-specific health check
   */
  @Get('db')
  @ApiOperation({
    summary: 'Database health check',
    description: 'Checks Supabase Postgres connection and query performance. No authentication required.',
  })
  async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    database: { status: string; message?: string };
  }> {
    try {
      const supabase = getSupabaseClient();

      // Test basic query
      const { error } = await supabase
        .from('venues')
        .select('id')
        .limit(1);

      if (error) {
        return {
          status: 'error',
          database: {
            status: 'down',
            message: error.message,
          },
        };
      }

      // Test count query
      const { count, error: countError } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return {
          status: 'error',
          database: {
            status: 'degraded',
            message: 'Basic queries work but count queries fail',
          },
        };
      }

      return {
        status: 'ok',
        database: {
          status: 'up',
          message: `Connected - ${count} venues in database`,
        },
      };
    } catch (error: unknown) {
      return {
        status: 'error',
        database: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Redis-specific health check
   */
  @Get('redis')
  @ApiOperation({
    summary: 'Redis health check',
    description: 'Checks Redis connection, latency, and operations. No authentication required.',
  })
  async checkRedis(): Promise<{
    status: 'ok' | 'error';
    redis: { status: string; message?: string; latency?: number };
  }> {
    try {
      const redis = await getRedisClient();
      const startTime = Date.now();

      // Test ping
      await redis.ping();

      const latency = Date.now() - startTime;

      // Test set/get
      const testKey = `health_check_${Date.now()}`;
      await redis.set(testKey, 'test', { EX: 10 });
      const testValue = await redis.get(testKey);
      await redis.del(testKey);

      if (testValue !== 'test') {
        return {
          status: 'error',
          redis: {
            status: 'degraded',
            message: 'Ping successful but set/get operations failed',
            latency,
          },
        };
      }

      return {
        status: 'ok',
        redis: {
          status: 'up',
          latency,
          message: `Connected - ${latency}ms latency`,
        },
      };
    } catch (error: unknown) {
      return {
        status: 'error',
        redis: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
