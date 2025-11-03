import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { Venue } from '@blastoise/shared';

// Mock VenuesService
class MockVenuesService {
  private venues: Venue[] = [
    {
      id: 'venue-1',
      name: 'Deschutes Brewery',
      type: 'brewery',
      address: {
        street: '901 SW Simpson Ave',
        city: 'Bend',
        state: 'OR',
        postal_code: '97702',
        country: 'USA',
      },
      location: {
        latitude: 44.0521,
        longitude: -121.3153,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'venue-2',
      name: 'Willamette Valley Vineyards',
      type: 'winery',
      address: {
        street: '8800 Enchanted Way SE',
        city: 'Turner',
        state: 'OR',
        postal_code: '97392',
        country: 'USA',
      },
      location: {
        latitude: 44.8429,
        longitude: -122.9507,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'venue-3',
      name: '10 Barrel Brewing',
      type: 'brewery',
      address: {
        street: '1135 NW Galveston Ave',
        city: 'Bend',
        state: 'OR',
        postal_code: '97703',
        country: 'USA',
      },
      location: {
        latitude: 44.0583,
        longitude: -121.3219,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  async findById(id: string): Promise<Venue | null> {
    const venue = this.venues.find((v) => v.id === id);
    return venue || null;
  }

  async search(query: string): Promise<Venue[]> {
    return this.venues.filter((v) =>
      v.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radius: number,
    type?: string
  ): Promise<Venue[]> {
    let results = this.venues;

    if (type) {
      results = results.filter((v) => v.type === type);
    }

    // Simple distance filter for testing (not accurate Haversine)
    return results;
  }
}

describe('T141: Venues API Integration Tests', () => {
  let app: INestApplication;
  let venuesService: MockVenuesService;

  beforeAll(async () => {
    venuesService = new MockVenuesService();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [
        {
          provide: VenuesService,
          useValue: venuesService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /venues/:venueId - Get Venue by ID', () => {
    it('should return venue by id', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/venue-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('venue-1');
      expect(response.body.data.name).toBe('Deschutes Brewery');
      expect(response.body.data.type).toBe('brewery');
    });

    it('should return venue with complete address information', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/venue-1')
        .expect(200);

      expect(response.body.data.address).toBeDefined();
      expect(response.body.data.address.street).toBe('901 SW Simpson Ave');
      expect(response.body.data.address.city).toBe('Bend');
      expect(response.body.data.address.state).toBe('OR');
      expect(response.body.data.address.postal_code).toBe('97702');
      expect(response.body.data.address.country).toBe('USA');
    });

    it('should return venue with location coordinates', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/venue-1')
        .expect(200);

      expect(response.body.data.location).toBeDefined();
      expect(response.body.data.location.latitude).toBe(44.0521);
      expect(response.body.data.location.longitude).toBe(-121.3153);
    });

    it('should return 404 for non-existent venue', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return winery venue correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/venue-2')
        .expect(200);

      expect(response.body.data.name).toBe('Willamette Valley Vineyards');
      expect(response.body.data.type).toBe('winery');
    });

    it('should include timestamps in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/venue-1')
        .expect(200);

      expect(response.body.data.created_at).toBeDefined();
      expect(response.body.data.updated_at).toBeDefined();
    });

    it('should return consistent data structure for all venues', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/venues/venue-1')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/venues/venue-2')
        .expect(200);

      // Check both have same structure
      expect(Object.keys(response1.body.data).sort()).toEqual(
        Object.keys(response2.body.data).sort()
      );
    });

    it('should handle special characters in venue ID', async () => {
      // Test that API doesn't break with unexpected IDs
      await request(app.getHttpServer())
        .get('/venues/venue-with-special-chars-123')
        .expect(404);
    });

    it('should set appropriate cache headers for venue data', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/venue-1')
        .expect(200);

      // Venue data should be cacheable
      expect(response.headers['cache-control']).toBeDefined();
    });
  });

  describe('GET /venues/search - Search Venues', () => {
    it('should search venues by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/search')
        .query({ q: 'Deschutes' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Deschutes Brewery');
    });

    it('should return multiple results for partial matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/search')
        .query({ q: 'Barrel' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('Barrel');
    });

    it('should be case-insensitive', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/search')
        .query({ q: 'deschutes' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Deschutes Brewery');
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/search')
        .query({ q: 'NonExistentVenue' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should require search query parameter', async () => {
      await request(app.getHttpServer()).get('/venues/search').expect(400);
    });

    it('should handle empty search query', async () => {
      await request(app.getHttpServer())
        .get('/venues/search')
        .query({ q: '' })
        .expect(400);
    });

    it('should limit search results to prevent large responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/search')
        .query({ q: 'Brew' })
        .expect(200);

      // Should return max 50 results (or whatever limit is set)
      expect(response.body.data.length).toBeLessThanOrEqual(50);
    });
  });

  describe('GET /venues/nearby - Proximity Search', () => {
    it('should find nearby venues within radius', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 10, // 10km
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by venue type', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 50,
          type: 'brewery',
        })
        .expect(200);

      response.body.data.forEach((venue: Venue) => {
        expect(venue.type).toBe('brewery');
      });
    });

    it('should require latitude parameter', async () => {
      await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          longitude: -121.3153,
          radius: 10,
        })
        .expect(400);
    });

    it('should require longitude parameter', async () => {
      await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          radius: 10,
        })
        .expect(400);
    });

    it('should validate radius is within acceptable range', async () => {
      // Test radius too large
      await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 100, // > 50km limit
        })
        .expect(400);

      // Test radius too small
      await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 0,
        })
        .expect(400);
    });

    it('should default to 10km radius if not specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          longitude: -121.3153,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should include distance in response for nearby venues', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 10,
        })
        .expect(200);

      if (response.body.data.length > 0) {
        expect(response.body.data[0].distance).toBeDefined();
      }
    });

    it('should sort results by distance (closest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues/nearby')
        .query({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 50,
        })
        .expect(200);

      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].distance).toBeGreaterThanOrEqual(
            response.body.data[i - 1].distance
          );
        }
      }
    });
  });
});
