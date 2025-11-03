import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { AuthGuard } from '../auth/auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { BatchVisitSyncDto } from './dto/batch-visit-sync.dto';
import { Visit } from '@blastoise/shared';

// Mock user for testing
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
};

// Mock AuthGuard to always pass and inject mockUser
class MockAuthGuard {
  canActivate(context: any) {
    const request = context.switchToHttp().getRequest();
    request.user = mockUser;
    return true;
  }
}

// Mock RateLimitGuard to always pass
class MockRateLimitGuard {
  canActivate() {
    return true;
  }
}

// Mock VisitsService
class MockVisitsService {
  private visits: Visit[] = [];
  private idCounter = 1;

  async create(userId: string, dto: CreateVisitDto): Promise<Visit> {
    const visit: Visit = {
      id: `visit-${this.idCounter++}`,
      user_id: userId,
      venue_id: dto.venue_id,
      arrival_time: dto.arrival_time,
      departure_time: dto.departure_time,
      duration_minutes: dto.departure_time
        ? Math.round(
            (new Date(dto.departure_time).getTime() -
              new Date(dto.arrival_time).getTime()) /
              (1000 * 60)
          )
        : undefined,
      is_active: dto.is_active ?? !dto.departure_time,
      detection_method: dto.detection_method || 'auto',
      synced: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.visits.push(visit);
    return visit;
  }

  async findAll(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ visits: Visit[]; total: number }> {
    const userVisits = this.visits.filter((v) => v.user_id === userId);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      visits: userVisits.slice(start, end),
      total: userVisits.length,
    };
  }

  async findOne(id: string, userId: string): Promise<Visit> {
    const visit = this.visits.find((v) => v.id === id && v.user_id === userId);
    if (!visit) {
      throw new Error('Visit not found');
    }
    return visit;
  }

  async getActiveVisit(userId: string): Promise<Visit | null> {
    return (
      this.visits.find((v) => v.user_id === userId && v.is_active) || null
    );
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateVisitDto
  ): Promise<Visit> {
    const visit = await this.findOne(id, userId);

    if (dto.departure_time) {
      visit.departure_time = dto.departure_time;
      visit.is_active = false;
      visit.duration_minutes = Math.round(
        (new Date(dto.departure_time).getTime() -
          new Date(visit.arrival_time).getTime()) /
          (1000 * 60)
      );
    }

    visit.updated_at = new Date().toISOString();
    return visit;
  }

  async delete(id: string, userId: string): Promise<void> {
    const index = this.visits.findIndex(
      (v) => v.id === id && v.user_id === userId
    );
    if (index === -1) {
      throw new Error('Visit not found');
    }
    this.visits.splice(index, 1);
  }

  async batchSync(userId: string, dto: BatchVisitSyncDto): Promise<Visit[]> {
    const createdVisits: Visit[] = [];

    for (const visitDto of dto.visits) {
      const visit = await this.create(userId, visitDto as CreateVisitDto);
      createdVisits.push(visit);
    }

    return createdVisits;
  }

  // Test helpers
  clear() {
    this.visits = [];
    this.idCounter = 1;
  }
}

describe('T116-T117: Visits API Integration Tests', () => {
  let app: INestApplication;
  let visitsService: MockVisitsService;

  beforeAll(async () => {
    visitsService = new MockVisitsService();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [VisitsController],
      providers: [
        {
          provide: VisitsService,
          useValue: visitsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RateLimitGuard)
      .useClass(MockRateLimitGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    visitsService.clear();
  });

  describe('T116: POST /visits - Create Visit', () => {
    it('should create a new visit successfully', async () => {
      const createDto: CreateVisitDto = {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        is_active: true,
        detection_method: 'auto',
      };

      const response = await request(app.getHttpServer())
        .post('/visits')
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.venue_id).toBe(createDto.venue_id);
      expect(response.body.data.arrival_time).toBe(createDto.arrival_time);
      expect(response.body.data.is_active).toBe(true);
      expect(response.body.data.user_id).toBe(mockUser.id);
      expect(response.body.data.id).toBeDefined();
    });

    it('should create a completed visit with departure time', async () => {
      const createDto: CreateVisitDto = {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        departure_time: '2025-01-15T15:45:00.000Z',
        is_active: false,
        detection_method: 'auto',
      };

      const response = await request(app.getHttpServer())
        .post('/visits')
        .send(createDto)
        .expect(201);

      expect(response.body.data.departure_time).toBe(createDto.departure_time);
      expect(response.body.data.is_active).toBe(false);
      expect(response.body.data.duration_minutes).toBe(75); // 1h 15m
    });

    it('should reject visit with missing required fields', async () => {
      const invalidDto = {
        venue_id: 'venue-1',
        // Missing arrival_time
      };

      await request(app.getHttpServer())
        .post('/visits')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject visit with invalid date format', async () => {
      const invalidDto = {
        venue_id: 'venue-1',
        arrival_time: 'not-a-date',
        is_active: true,
      };

      await request(app.getHttpServer())
        .post('/visits')
        .send(invalidDto)
        .expect(400);
    });

    it('should create manual visit', async () => {
      const createDto: CreateVisitDto = {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        is_active: true,
        detection_method: 'manual',
      };

      const response = await request(app.getHttpServer())
        .post('/visits')
        .send(createDto)
        .expect(201);

      expect(response.body.data.detection_method).toBe('manual');
    });
  });

  describe('T117: POST /visits/batch - Batch Sync', () => {
    it('should sync multiple visits in batch', async () => {
      const batchDto: BatchVisitSyncDto = {
        visits: [
          {
            venue_id: 'venue-1',
            arrival_time: '2025-01-15T14:30:00.000Z',
            departure_time: '2025-01-15T15:45:00.000Z',
            is_active: false,
            detection_method: 'auto',
          },
          {
            venue_id: 'venue-2',
            arrival_time: '2025-01-16T10:00:00.000Z',
            is_active: true,
            detection_method: 'auto',
          },
          {
            venue_id: 'venue-3',
            arrival_time: '2025-01-17T12:30:00.000Z',
            departure_time: '2025-01-17T14:00:00.000Z',
            is_active: false,
            detection_method: 'auto',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/visits/batch')
        .send(batchDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Verify first visit
      expect(response.body.data[0].venue_id).toBe('venue-1');
      expect(response.body.data[0].is_active).toBe(false);

      // Verify second visit (active)
      expect(response.body.data[1].venue_id).toBe('venue-2');
      expect(response.body.data[1].is_active).toBe(true);

      // Verify third visit
      expect(response.body.data[2].venue_id).toBe('venue-3');
      expect(response.body.data[2].duration_minutes).toBe(90); // 1h 30m
    });

    it('should reject empty batch', async () => {
      const emptyBatch: BatchVisitSyncDto = {
        visits: [],
      };

      await request(app.getHttpServer())
        .post('/visits/batch')
        .send(emptyBatch)
        .expect(400);
    });

    it('should reject batch with more than 100 visits', async () => {
      const largeBatch: BatchVisitSyncDto = {
        visits: Array(101)
          .fill(null)
          .map((_, i) => ({
            venue_id: `venue-${i}`,
            arrival_time: '2025-01-15T14:30:00.000Z',
            is_active: true,
            detection_method: 'auto' as const,
          })),
      };

      await request(app.getHttpServer())
        .post('/visits/batch')
        .send(largeBatch)
        .expect(400);
    });

    it('should handle batch with mix of completed and active visits', async () => {
      const batchDto: BatchVisitSyncDto = {
        visits: [
          {
            venue_id: 'venue-1',
            arrival_time: '2025-01-15T14:30:00.000Z',
            departure_time: '2025-01-15T15:45:00.000Z',
            is_active: false,
            detection_method: 'auto',
          },
          {
            venue_id: 'venue-2',
            arrival_time: '2025-01-16T10:00:00.000Z',
            is_active: true,
            detection_method: 'auto',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/visits/batch')
        .send(batchDto)
        .expect(201);

      expect(response.body.data).toHaveLength(2);

      const completedVisit = response.body.data.find(
        (v: Visit) => v.venue_id === 'venue-1'
      );
      const activeVisit = response.body.data.find(
        (v: Visit) => v.venue_id === 'venue-2'
      );

      expect(completedVisit.is_active).toBe(false);
      expect(completedVisit.departure_time).toBeDefined();
      expect(activeVisit.is_active).toBe(true);
      expect(activeVisit.departure_time).toBeUndefined();
    });

    it('should assign user_id to all synced visits', async () => {
      const batchDto: BatchVisitSyncDto = {
        visits: [
          {
            venue_id: 'venue-1',
            arrival_time: '2025-01-15T14:30:00.000Z',
            is_active: true,
            detection_method: 'auto',
          },
          {
            venue_id: 'venue-2',
            arrival_time: '2025-01-16T10:00:00.000Z',
            is_active: true,
            detection_method: 'auto',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/visits/batch')
        .send(batchDto)
        .expect(201);

      response.body.data.forEach((visit: Visit) => {
        expect(visit.user_id).toBe(mockUser.id);
      });
    });
  });

  describe('T140: GET /visits - List Visits with Pagination', () => {
    beforeEach(async () => {
      // Create some test visits
      await visitsService.create(mockUser.id, {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        is_active: true,
        detection_method: 'auto',
      });

      await visitsService.create(mockUser.id, {
        venue_id: 'venue-2',
        arrival_time: '2025-01-16T10:00:00.000Z',
        is_active: true,
        detection_method: 'auto',
      });
    });

    it('should list all user visits with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.metadata.pagination).toBeDefined();
      expect(response.body.metadata.pagination.total).toBe(2);
    });

    it('should return only user-owned visits', async () => {
      // Create visit for different user
      await visitsService.create('other-user-id', {
        venue_id: 'venue-3',
        arrival_time: '2025-01-17T12:00:00.000Z',
        is_active: true,
        detection_method: 'auto',
      });

      const response = await request(app.getHttpServer())
        .get('/visits')
        .expect(200);

      expect(response.body.data).toHaveLength(2); // Only mockUser's visits
    });

    it('should paginate results correctly with page 1', async () => {
      // Create 25 visits for pagination testing
      for (let i = 0; i < 25; i++) {
        await visitsService.create(mockUser.id, {
          venue_id: `venue-${i}`,
          arrival_time: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_active: false,
          detection_method: 'auto',
        });
      }

      const response = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.metadata.pagination.total).toBe(27); // 2 from beforeEach + 25 new
      expect(response.body.metadata.pagination.page).toBe(1);
      expect(response.body.metadata.pagination.limit).toBe(10);
    });

    it('should paginate results correctly with page 2', async () => {
      // Create 25 visits
      for (let i = 0; i < 25; i++) {
        await visitsService.create(mockUser.id, {
          venue_id: `venue-${i}`,
          arrival_time: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_active: false,
          detection_method: 'auto',
        });
      }

      const response = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.metadata.pagination.page).toBe(2);
    });

    it('should handle last page with fewer results', async () => {
      // Create 25 visits (total 27 with beforeEach)
      for (let i = 0; i < 25; i++) {
        await visitsService.create(mockUser.id, {
          venue_id: `venue-${i}`,
          arrival_time: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_active: false,
          detection_method: 'auto',
        });
      }

      // Page 3 should have 7 results (27 total - 20 from first 2 pages)
      const response = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 3, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(7);
      expect(response.body.metadata.pagination.page).toBe(3);
    });

    it('should return empty array for page beyond available data', async () => {
      const response = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 10, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.metadata.pagination.total).toBe(2);
    });

    it('should default to page 1 and limit 20 if not specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/visits')
        .expect(200);

      expect(response.body.metadata.pagination.page).toBe(1);
      expect(response.body.metadata.pagination.limit).toBe(20);
    });

    it('should respect custom page sizes', async () => {
      // Create 10 more visits
      for (let i = 0; i < 10; i++) {
        await visitsService.create(mockUser.id, {
          venue_id: `venue-${i}`,
          arrival_time: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_active: false,
          detection_method: 'auto',
        });
      }

      const response = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.metadata.pagination.limit).toBe(5);
    });

    it('should include pagination metadata with hasMore flag', async () => {
      // Create 25 visits
      for (let i = 0; i < 25; i++) {
        await visitsService.create(mockUser.id, {
          venue_id: `venue-${i}`,
          arrival_time: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_active: false,
          detection_method: 'auto',
        });
      }

      // Page 1 should have hasMore: true
      const page1 = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(page1.body.metadata.pagination.hasMore).toBe(true);

      // Last page should have hasMore: false
      const page3 = await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 3, limit: 10 })
        .expect(200);

      expect(page3.body.metadata.pagination.hasMore).toBe(false);
    });

    it('should validate page number is positive', async () => {
      await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 0, limit: 10 })
        .expect(400);
    });

    it('should validate limit is within acceptable range', async () => {
      // Test limit too large
      await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 1, limit: 101 })
        .expect(400);

      // Test limit too small
      await request(app.getHttpServer())
        .get('/visits')
        .query({ page: 1, limit: 0 })
        .expect(400);
    });
  });

  describe('GET /visits/active - Get Active Visit', () => {
    it('should return active visit if one exists', async () => {
      await visitsService.create(mockUser.id, {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        is_active: true,
        detection_method: 'auto',
      });

      const response = await request(app.getHttpServer())
        .get('/visits/active')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.is_active).toBe(true);
    });

    it('should return null if no active visit', async () => {
      const response = await request(app.getHttpServer())
        .get('/visits/active')
        .expect(200);

      expect(response.body.data).toBeUndefined();
    });
  });

  describe('GET /visits/:id - Get Single Visit', () => {
    it('should return visit by id', async () => {
      const visit = await visitsService.create(mockUser.id, {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        is_active: true,
        detection_method: 'auto',
      });

      const response = await request(app.getHttpServer())
        .get(`/visits/${visit.id}`)
        .expect(200);

      expect(response.body.data.id).toBe(visit.id);
      expect(response.body.data.venue_id).toBe('venue-1');
    });
  });

  describe('PATCH /visits/:id - Update Visit', () => {
    it('should update visit with departure time', async () => {
      const visit = await visitsService.create(mockUser.id, {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        is_active: true,
        detection_method: 'auto',
      });

      const updateDto: UpdateVisitDto = {
        departure_time: '2025-01-15T15:45:00.000Z',
      };

      const response = await request(app.getHttpServer())
        .patch(`/visits/${visit.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.data.departure_time).toBe(updateDto.departure_time);
      expect(response.body.data.is_active).toBe(false);
      expect(response.body.data.duration_minutes).toBe(75);
    });
  });

  describe('DELETE /visits/:id - Delete Visit', () => {
    it('should delete visit', async () => {
      const visit = await visitsService.create(mockUser.id, {
        venue_id: 'venue-1',
        arrival_time: '2025-01-15T14:30:00.000Z',
        is_active: true,
        detection_method: 'auto',
      });

      await request(app.getHttpServer())
        .delete(`/visits/${visit.id}`)
        .expect(204);
    });
  });
});
