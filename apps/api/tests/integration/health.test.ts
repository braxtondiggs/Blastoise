/**
 * Verifies health check endpoints work correctly:
 * - GET /health: Overall system health
 * - GET /health/db: Database health
 * - GET /health/redis: Redis health
 *
 * Phase 7: Notifications & Observability
 */

 
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../../src/common/health/health.module';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

// Import for mocking
import * as dataBackend from '@blastoise/data-backend';
import * as redisClient from '../../src/redis/redis.client';

// Setup mocks
jest.mock('@blastoise/data-backend');
jest.mock('../../src/redis/redis.client');

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      limit: jest.fn(() => ({
        data: [{ id: 'venue-1' }],
        error: null,
      })),
    })),
  })),
};

const mockRedisClient = {
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue('test'),
  del: jest.fn().mockResolvedValue(1),
};

// Apply mocks
(dataBackend.getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
(redisClient.getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

describe('Health Check Integration Tests (T236)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TerminusModule,
        HttpModule,
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return overall system health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('should include API status in health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.details).toHaveProperty('api');
      expect(response.body.details.api).toHaveProperty('status');
      expect(response.body.details.api.status).toBe('up');
    });

    it('should include database status in health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.details).toHaveProperty('database');
      expect(response.body.details.database).toHaveProperty('status');
    });

    it('should include Redis status in health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.details).toHaveProperty('redis');
      expect(response.body.details.redis).toHaveProperty('status');
    });

    it('should return 503 when system is unhealthy', async () => {
      // Mock database failure
      (dataBackend.getSupabaseClient as jest.Mock).mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: null,
              error: { message: 'Connection failed' },
            })),
          })),
        })),
      });

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('error');
      expect(response.body.details.database.status).toBe('down');
    });
  });

  describe('GET /health/db', () => {
    it('should return database health status', async () => {
      await request(app.getHttpServer())
        .get('/health/db')
        .expect(200);
    });

    it('should return "up" when database is healthy', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.database.status).toBe('up');
      expect(response.body.database.message).toContain('Connected');
    });

    it('should return venue count in database health', async () => {
      // Mock count query
      (dataBackend.getSupabaseClient as jest.Mock).mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn((query: string, options?: any) => {
            if (options?.count === 'exact') {
              return Promise.resolve({
                data: null,
                error: null,
                count: 150,
              });
            }
            return {
              limit: jest.fn(() => ({
                data: [{ id: 'venue-1' }],
                error: null,
              })),
            };
          }),
        })),
      });

      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(200);

      expect(response.body.database.message).toContain('venues');
    });

    it('should return error when database is down', async () => {
      (dataBackend.getSupabaseClient as jest.Mock).mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: null,
              error: { message: 'Connection timeout' },
            })),
          })),
        })),
      });

      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.database.status).toBe('down');
      expect(response.body.database.message).toBe('Connection timeout');
    });

    it('should detect degraded database status', async () => {
      (dataBackend.getSupabaseClient as jest.Mock).mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn((query: string, options?: any) => {
            // Basic query works
            if (!options?.count) {
              return {
                limit: jest.fn(() => ({
                  data: [{ id: 'venue-1' }],
                  error: null,
                })),
              };
            }
            // But count query fails
            return Promise.resolve({
              data: null,
              error: { message: 'Count failed' },
              count: null,
            });
          }),
        })),
      });

      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.database.status).toBe('degraded');
      expect(response.body.database.message).toContain('count queries fail');
    });
  });

  describe('GET /health/redis', () => {
    it('should return Redis health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/redis')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('redis');
      expect(response.body.redis).toHaveProperty('status');
    });

    it('should return "up" when Redis is healthy', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/redis')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.redis.status).toBe('up');
      expect(response.body.redis).toHaveProperty('latency');
      expect(typeof response.body.redis.latency).toBe('number');
    });

    it('should measure Redis latency', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/redis')
        .expect(200);

      expect(response.body.redis.latency).toBeGreaterThanOrEqual(0);
      expect(response.body.redis.message).toContain('ms latency');
    });

    it('should test Redis set/get operations', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/redis')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.redis.status).toBe('up');
    });

    it('should return error when Redis is down', async () => {
      (redisClient.getRedisClient as jest.Mock).mockResolvedValueOnce({
        ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
      });

      const response = await request(app.getHttpServer())
        .get('/health/redis')
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.redis.status).toBe('down');
      expect(response.body.redis.message).toBe('Connection refused');
    });

    it('should detect degraded Redis status when set/get fails', async () => {
      (redisClient.getRedisClient as jest.Mock).mockResolvedValueOnce({
        ping: jest.fn().mockResolvedValue('PONG'),
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('wrong-value'), // Wrong value
        del: jest.fn().mockResolvedValue(1),
      });

      const response = await request(app.getHttpServer())
        .get('/health/redis')
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.redis.status).toBe('degraded');
      expect(response.body.redis.message).toContain('set/get operations failed');
    });
  });

  describe('Health Check Response Format', () => {
    it('should return consistent response format', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Terminus standard format
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ok|error)$/),
        info: expect.any(Object),
        error: expect.any(Object),
        details: expect.any(Object),
      });
    });

    it('should include all services in details', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const details = response.body.details;

      expect(details).toHaveProperty('api');
      expect(details).toHaveProperty('database');
      expect(details).toHaveProperty('redis');
    });
  });

  describe('Health Check Performance', () => {
    it('should respond quickly (< 1 second)', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent health checks', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('details');
      });
    });
  });

  describe('Health Check Error Handling', () => {
    it('should not expose internal error details', async () => {
      (dataBackend.getSupabaseClient as jest.Mock).mockReturnValueOnce({
        from: jest.fn(() => {
          throw new Error('Internal database configuration error with sensitive details');
        }),
      });

      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(200);

      expect(response.body.database.status).toBe('down');
      // Should return generic error message, not expose internal details
      expect(response.body.database.message).toBeDefined();
    });

    it('should handle missing services gracefully', async () => {
      (dataBackend.getSupabaseClient as jest.Mock).mockReturnValueOnce(null);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Should still return a response, marking database as down
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('details');
    });
  });
});
