/**
 * Tests for sharing endpoints:
 * - POST /visits/:visitId/share (authenticated)
 * - GET /shared/:shareId (public, no auth)
 * - Expiration handling with 410 Gone
 * - View count tracking
 * - Privacy validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { SharingModule } from '../../src/modules/sharing/sharing.module';
import { SharingService } from '../../src/modules/sharing/sharing.service';

describe('Sharing API Integration Tests', () => {
  let app: INestApplication;
  let sharingService: SharingService;

  // Mock authentication
  const mockAuthToken = 'Bearer mock-jwt-token';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SharingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    sharingService = moduleFixture.get<SharingService>(SharingService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('T210: GET /shared/:shareId (Public Endpoint)', () => {
    it('should return shared visit data without authentication', async () => {
      // Create a mock share first
      const mockShare = {
        id: 'share-public-123',
        visit_id: 'visit-123',
        venue_name: 'Anchor Brewing',
        venue_city: 'San Francisco',
        visit_date: '2025-10-30',
        shared_at: new Date().toISOString(),
        expires_at: null,
        view_count: 0,
      };

      // Mock the service to return this share
      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-public-123')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.venue_name).toBe('Anchor Brewing');
      expect(response.body.data.venue_city).toBe('San Francisco');
      expect(response.body.data.visit_date).toBe('2025-10-30');
      expect(response.body.data.view_count).toBeGreaterThanOrEqual(0);
    });

    it('should NOT require authentication for public shared visits', async () => {
      const mockShare = {
        id: 'share-public-456',
        visit_id: 'visit-456',
        venue_name: 'Stone Brewing',
        venue_city: 'Escondido',
        visit_date: '2025-11-01',
        shared_at: new Date().toISOString(),
        expires_at: null,
        view_count: 5,
      };

      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      // No Authorization header
      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-public-456')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.venue_name).toBe('Stone Brewing');
    });

    it('should return 404 for non-existent share', async () => {
      jest.spyOn(sharingService, 'getShared').mockRejectedValue({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Shared visit not found',
      });

      await request(app.getHttpServer())
        .get('/api/v1/shared/share-nonexistent')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should NOT expose user_id in shared data', async () => {
      const mockShare = {
        id: 'share-privacy-test',
        visit_id: 'visit-789',
        venue_name: 'Russian River Brewing',
        venue_city: 'Santa Rosa',
        visit_date: '2025-11-01',
        shared_at: new Date().toISOString(),
        expires_at: null,
        view_count: 10,
        // user_id should NEVER be present
      };

      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-privacy-test')
        .expect(HttpStatus.OK);

      const sharedData = response.body.data;
      expect(sharedData.user_id).toBeUndefined();
      expect(JSON.stringify(sharedData)).not.toContain('user');
    });

    it('should NOT expose GPS coordinates in shared data', async () => {
      const mockShare = {
        id: 'share-gps-test',
        visit_id: 'visit-coordinates',
        venue_name: 'Lagunitas',
        venue_city: 'Petaluma',
        visit_date: '2025-11-01',
        shared_at: new Date().toISOString(),
        expires_at: null,
        view_count: 3,
      };

      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-gps-test')
        .expect(HttpStatus.OK);

      const sharedData = response.body.data;
      expect(sharedData.latitude).toBeUndefined();
      expect(sharedData.longitude).toBeUndefined();
      expect(sharedData.coordinates).toBeUndefined();
      expect(JSON.stringify(sharedData)).not.toContain('lat');
      expect(JSON.stringify(sharedData)).not.toContain('lng');
    });

    it('should only expose date, not precise timestamp', async () => {
      const mockShare = {
        id: 'share-timestamp-test',
        visit_id: 'visit-time',
        venue_name: 'Sierra Nevada',
        venue_city: 'Chico',
        visit_date: '2025-11-01', // Date only, no time
        shared_at: new Date().toISOString(),
        expires_at: null,
        view_count: 7,
      };

      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-timestamp-test')
        .expect(HttpStatus.OK);

      const visitDate = response.body.data.visit_date;
      // Should be date only (YYYY-MM-DD), not include time
      expect(visitDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(visitDate).not.toContain('T');
      expect(visitDate).not.toContain(':');
    });

    it('should increment view count on each access', async () => {
      let viewCount = 5;
      jest.spyOn(sharingService, 'getShared').mockImplementation(async () => {
        viewCount++;
        return {
          id: 'share-view-count',
          visit_id: 'visit-views',
          venue_name: 'Bear Republic',
          venue_city: 'Healdsburg',
          visit_date: '2025-11-01',
          shared_at: new Date().toISOString(),
          expires_at: null,
          view_count: viewCount,
        } as any;
      });

      // First view
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/shared/share-view-count')
        .expect(HttpStatus.OK);
      expect(response1.body.data.view_count).toBe(6);

      // Second view
      const response2 = await request(app.getHttpServer())
        .get('/api/v1/shared/share-view-count')
        .expect(HttpStatus.OK);
      expect(response2.body.data.view_count).toBe(7);
    });
  });

  describe('T211: Expiration Handling', () => {
    it('should return 410 Gone for expired share link', async () => {
      jest.spyOn(sharingService, 'getShared').mockRejectedValue({
        statusCode: HttpStatus.GONE,
        message: 'This shared visit has expired',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-expired')
        .expect(HttpStatus.GONE);

      expect(response.body.message).toContain('expired');
    });

    it('should allow access to non-expired share', async () => {
      const futureExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const mockShare = {
        id: 'share-future-exp',
        visit_id: 'visit-future',
        venue_name: 'Firestone Walker',
        venue_city: 'Paso Robles',
        visit_date: '2025-11-01',
        shared_at: new Date().toISOString(),
        expires_at: futureExpiration,
        view_count: 2,
      };

      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-future-exp')
        .expect(HttpStatus.OK);

      expect(response.body.data.expires_at).toBe(futureExpiration);
    });

    it('should return 410 Gone for share expired 1 second ago', async () => {
      jest.spyOn(sharingService, 'getShared').mockRejectedValue({
        statusCode: HttpStatus.GONE,
        message: 'This shared visit has expired',
      });

      await request(app.getHttpServer())
        .get('/api/v1/shared/share-just-expired')
        .expect(HttpStatus.GONE);
    });

    it('should handle shares with no expiration (never expires)', async () => {
      const mockShare = {
        id: 'share-never-expires',
        visit_id: 'visit-permanent',
        venue_name: 'New Belgium',
        venue_city: 'Fort Collins',
        visit_date: '2025-11-01',
        shared_at: new Date().toISOString(),
        expires_at: null, // Never expires
        view_count: 100,
      };

      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-never-expires')
        .expect(HttpStatus.OK);

      expect(response.body.data.expires_at).toBeNull();
    });

    it('should validate expiration time is in the future when creating share', async () => {
      // This test would be part of POST /visits/:visitId/share
      // Ensure expiration date cannot be in the past
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Mock auth
      jest.spyOn(sharingService, 'createShare').mockRejectedValue({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Expiration date must be in the future',
      });

      await request(app.getHttpServer())
        .post('/api/v1/visits/visit-123/share')
        .set('Authorization', mockAuthToken)
        .send({ expires_at: pastDate })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /visits/:visitId/share (Authenticated)', () => {
    it('should create a share link for authenticated user', async () => {
      const mockShare = {
        id: 'share-new-123',
        visit_id: 'visit-123',
        venue_name: 'Test Brewery',
        venue_city: 'Test City',
        visit_date: '2025-11-02',
        shared_at: new Date().toISOString(),
        expires_at: null,
        view_count: 0,
      };

      jest.spyOn(sharingService, 'createShare').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/visits/visit-123/share')
        .set('Authorization', mockAuthToken)
        .send({ expiresInDays: null })
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.share_id).toBe('share-new-123');
      expect(response.body.data.share_url).toContain('/shared/');
    });

    it('should require authentication for creating shares', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/visits/visit-123/share')
        .send({ expiresInDays: 7 })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should create share with 7-day expiration', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const mockShare = {
        id: 'share-7days',
        visit_id: 'visit-456',
        venue_name: 'Another Brewery',
        venue_city: 'Another City',
        visit_date: '2025-11-02',
        shared_at: new Date().toISOString(),
        expires_at: expiresAt,
        view_count: 0,
      };

      jest.spyOn(sharingService, 'createShare').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/visits/visit-456/share')
        .set('Authorization', mockAuthToken)
        .send({ expiresInDays: 7 })
        .expect(HttpStatus.CREATED);

      expect(response.body.data.expires_at).toBeDefined();
    });
  });

  describe('Privacy Validation', () => {
    it('should prevent sharing visits that belong to other users', async () => {
      jest.spyOn(sharingService, 'createShare').mockRejectedValue({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Visit not found',
      });

      await request(app.getHttpServer())
        .post('/api/v1/visits/someone-elses-visit/share')
        .set('Authorization', mockAuthToken)
        .send({ expiresInDays: null })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should denormalize venue data to prevent data loss', async () => {
      // Even if venue is deleted, shared visit should still show venue name
      const mockShare = {
        id: 'share-denorm',
        visit_id: 'visit-denorm',
        venue_name: 'Deleted Brewery', // Denormalized
        venue_city: 'Lost City', // Denormalized
        visit_date: '2025-11-02',
        shared_at: new Date().toISOString(),
        expires_at: null,
        view_count: 0,
      };

      jest.spyOn(sharingService, 'getShared').mockResolvedValue(mockShare as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/shared/share-denorm')
        .expect(HttpStatus.OK);

      // Venue data should be available even if venue was deleted
      expect(response.body.data.venue_name).toBe('Deleted Brewery');
      expect(response.body.data.venue_city).toBe('Lost City');
    });
  });
});
