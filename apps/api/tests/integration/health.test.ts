/**
 * Verifies health check endpoints work correctly:
 * - GET /health: Overall system health
 * - GET /health/db: Database health
 * - GET /health/redis: Redis health
 *
 * Phase 7: Notifications & Observability
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../../src/common/health/health.module';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { DataSource } from 'typeorm';

// Import for mocking
import * as dataBackend from '@blastoise/data-backend';

// Setup mocks
jest.mock('@blastoise/data-backend');

const mockRedisClient = {
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue('test'),
  del: jest.fn().mockResolvedValue(1),
};

// Apply mocks
(dataBackend.getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

// Mock DataSource for TypeORM
const mockDataSource = {
  isInitialized: true,
};

describe('Health Check Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TerminusModule,
        HttpModule,
        HealthModule,
      ],
    })
      .overrideProvider(DataSource)
      .useValue(mockDataSource)
      .compile();

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
      (dataBackend.getRedisClient as jest.Mock).mockResolvedValueOnce({
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
      (dataBackend.getRedisClient as jest.Mock).mockResolvedValueOnce({
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
});
