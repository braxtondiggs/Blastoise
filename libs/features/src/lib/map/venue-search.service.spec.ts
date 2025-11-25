import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { VenueSearchService, ProximitySearchParams } from './venue-search.service';
import { VenuesApiService } from '@blastoise/data';
import { of, throwError } from 'rxjs';
import type { Venue } from '@blastoise/shared';

/**
 * Tests for text search, proximity search, caching, and distance calculations
 */
describe('VenueSearchService', () => {
  let spectator: SpectatorService<VenueSearchService>;
  let venuesApi: SpyObject<VenuesApiService>;

  const mockVenues: Venue[] = [
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

  const createService = createServiceFactory({
    service: VenueSearchService,
    mocks: [VenuesApiService],
  });

  beforeEach(() => {
    spectator = createService();
    venuesApi = spectator.inject(VenuesApiService);
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('Text Search', () => {
    it('should search venues by text query', (done) => {
      venuesApi.search.mockReturnValue(of([mockVenues[0]]));

      spectator.service.searchByText('Deschutes');

      // Wait for debounce (300ms)
      setTimeout(() => {
        expect(venuesApi.search).toHaveBeenCalledWith('Deschutes');
        expect(spectator.service.searchResults().length).toBe(1);
        expect(spectator.service.searchResults()[0].name).toBe('Deschutes Brewery');
        expect(spectator.service.isSearching()).toBe(false);
        done();
      }, 350);
    });

    it('should debounce search queries', (done) => {
      venuesApi.search.mockReturnValue(of(mockVenues));

      // Rapid fire searches
      spectator.service.searchByText('D');
      spectator.service.searchByText('De');
      spectator.service.searchByText('Des');
      spectator.service.searchByText('Deschutes');

      // Should only call API once after debounce
      setTimeout(() => {
        expect(venuesApi.search).toHaveBeenCalledTimes(1);
        expect(venuesApi.search).toHaveBeenCalledWith('Deschutes');
        done();
      }, 350);
    });

    it('should not search with queries less than 2 characters', (done) => {
      spectator.service.searchByText('D');

      setTimeout(() => {
        expect(venuesApi.search).not.toHaveBeenCalled();
        expect(spectator.service.searchResults().length).toBe(0);
        done();
      }, 350);
    });

    it('should cache search results', (done) => {
      venuesApi.search.mockReturnValue(of([mockVenues[0]]));

      // First search
      spectator.service.searchByText('Deschutes');

      setTimeout(() => {
        expect(venuesApi.search).toHaveBeenCalledTimes(1);

        // Clear results
        spectator.service.clearSearch();

        // Second search with same query
        spectator.service.searchByText('Deschutes');

        setTimeout(() => {
          // Should use cache, not call API again
          expect(venuesApi.search).toHaveBeenCalledTimes(1);
          expect(spectator.service.searchResults().length).toBe(1);
          done();
        }, 350);
      }, 350);
    });

    it('should handle search errors gracefully', (done) => {
      venuesApi.search.mockReturnValue(throwError(() => new Error('Search failed')));

      spectator.service.searchByText('test');

      setTimeout(() => {
        expect(spectator.service.error()).toBe('Failed to search venues');
        expect(spectator.service.searchResults().length).toBe(0);
        expect(spectator.service.isSearching()).toBe(false);
        done();
      }, 350);
    });

    it('should clear search results', (done) => {
      venuesApi.search.mockReturnValue(of([mockVenues[0]]));

      spectator.service.searchByText('Deschutes');

      setTimeout(() => {
        expect(spectator.service.searchResults().length).toBe(1);

        spectator.service.clearSearch();

        expect(spectator.service.searchResults().length).toBe(0);
        expect(spectator.service.error()).toBe(null);
        done();
      }, 350);
    });
  });

  describe('Proximity Search', () => {
    it('should search venues by proximity', (done) => {
      const proximityParams: ProximitySearchParams = {
        latitude: 44.0521,
        longitude: -121.3153,
        radius: 10,
      };

      venuesApi.findNearby.mockReturnValue(of(mockVenues));

      spectator.service.searchByProximity(proximityParams);

      // Wait for debounce (500ms)
      setTimeout(() => {
        expect(venuesApi.findNearby).toHaveBeenCalledWith(
          proximityParams.latitude,
          proximityParams.longitude,
          proximityParams.radius,
          undefined
        );
        expect(spectator.service.proximityResults().length).toBe(3);
        expect(spectator.service.isSearching()).toBe(false);
        done();
      }, 550);
    });

    it('should filter by venue type in proximity search', (done) => {
      const proximityParams: ProximitySearchParams = {
        latitude: 44.0521,
        longitude: -121.3153,
        radius: 10,
        type: 'brewery',
      };

      venuesApi.findNearby.mockReturnValue(of([mockVenues[0], mockVenues[2]]));

      spectator.service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(venuesApi.findNearby).toHaveBeenCalledWith(
          proximityParams.latitude,
          proximityParams.longitude,
          proximityParams.radius,
          'brewery'
        );
        expect(spectator.service.proximityResults().length).toBe(2);
        done();
      }, 550);
    });

    it('should cache proximity search results', (done) => {
      const proximityParams: ProximitySearchParams = {
        latitude: 44.0521,
        longitude: -121.3153,
        radius: 10,
      };

      venuesApi.findNearby.mockReturnValue(of(mockVenues));

      // First search
      spectator.service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(venuesApi.findNearby).toHaveBeenCalledTimes(1);

        // Clear and search again
        spectator.service.clearSearch();
        spectator.service.searchByProximity(proximityParams);

        setTimeout(() => {
          // Should use cache
          expect(venuesApi.findNearby).toHaveBeenCalledTimes(1);
          expect(spectator.service.proximityResults().length).toBe(3);
          done();
        }, 550);
      }, 550);
    });

    it('should handle proximity search errors gracefully', (done) => {
      const proximityParams: ProximitySearchParams = {
        latitude: 44.0521,
        longitude: -121.3153,
        radius: 10,
      };

      venuesApi.findNearby.mockReturnValue(throwError(() => new Error('Proximity search failed')));

      spectator.service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(spectator.service.error()).toBe('Failed to find nearby venues');
        expect(spectator.service.proximityResults().length).toBe(0);
        expect(spectator.service.isSearching()).toBe(false);
        done();
      }, 550);
    });

    it('should debounce proximity searches', (done) => {
      venuesApi.findNearby.mockReturnValue(of(mockVenues));

      // Rapid fire proximity searches
      spectator.service.searchByProximity({
        latitude: 44.05,
        longitude: -121.31,
        radius: 5,
      });
      spectator.service.searchByProximity({
        latitude: 44.051,
        longitude: -121.312,
        radius: 6,
      });
      spectator.service.searchByProximity({
        latitude: 44.0521,
        longitude: -121.3153,
        radius: 10,
      });

      setTimeout(() => {
        // Should only call API once
        expect(venuesApi.findNearby).toHaveBeenCalledTimes(1);
        expect(venuesApi.findNearby).toHaveBeenCalledWith(44.0521, -121.3153, 10, undefined);
        done();
      }, 550);
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate distances from user location to venues', () => {
      const userLocation = {
        latitude: 44.0521,
        longitude: -121.3153,
      };

      const distances = spectator.service.calculateDistances(mockVenues, userLocation);

      expect(distances.size).toBe(3);
      expect(distances.get('venue-1')).toBeDefined();
      expect(distances.get('venue-2')).toBeDefined();
      expect(distances.get('venue-3')).toBeDefined();

      // Venue 1 should be very close (same coordinates)
      expect(distances.get('venue-1')).toBeLessThan(0.1);

      // Venue 3 should be close (nearby in Bend)
      expect(distances.get('venue-3')).toBeLessThan(1);

      // Venue 2 should be farther (Turner is ~50km away)
      expect(distances.get('venue-2')).toBeGreaterThan(10);
    });

    it('should calculate zero distance for exact match', () => {
      const userLocation = {
        latitude: 44.0521,
        longitude: -121.3153,
      };

      const venue = mockVenues[0]; // Same coordinates
      const distances = spectator.service.calculateDistances([venue], userLocation);

      expect(distances.get('venue-1')).toBeLessThan(0.001);
    });

    it('should handle empty venue list', () => {
      const userLocation = {
        latitude: 44.0521,
        longitude: -121.3153,
      };

      const distances = spectator.service.calculateDistances([], userLocation);

      expect(distances.size).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', (done) => {
      venuesApi.search.mockReturnValue(of([mockVenues[0]]));
      venuesApi.findNearby.mockReturnValue(of(mockVenues));

      // Populate both caches
      spectator.service.searchByText('Deschutes');

      setTimeout(() => {
        spectator.service.searchByProximity({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 10,
        });

        setTimeout(() => {
          const statsBefore = spectator.service.getCacheStats();
          expect(statsBefore.searchCacheSize).toBeGreaterThan(0);
          expect(statsBefore.proximityCacheSize).toBeGreaterThan(0);

          spectator.service.clearCache();

          const statsAfter = spectator.service.getCacheStats();
          expect(statsAfter.searchCacheSize).toBe(0);
          expect(statsAfter.proximityCacheSize).toBe(0);
          done();
        }, 550);
      }, 350);
    });

    it('should provide cache statistics', (done) => {
      venuesApi.search.mockReturnValue(of([mockVenues[0]]));

      const initialStats = spectator.service.getCacheStats();
      expect(initialStats.searchCacheSize).toBe(0);
      expect(initialStats.proximityCacheSize).toBe(0);

      spectator.service.searchByText('Deschutes');

      setTimeout(() => {
        const statsAfter = spectator.service.getCacheStats();
        expect(statsAfter.searchCacheSize).toBe(1);
        done();
      }, 350);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from search errors and continue working', (done) => {
      // First search fails
      venuesApi.search.mockReturnValue(throwError(() => new Error('Network error')));

      spectator.service.searchByText('test1');

      setTimeout(() => {
        expect(spectator.service.error()).toBe('Failed to search venues');

        // Second search succeeds
        venuesApi.search.mockReturnValue(of([mockVenues[0]]));
        spectator.service.searchByText('test2');

        setTimeout(() => {
          expect(spectator.service.error()).toBe(null);
          expect(spectator.service.searchResults().length).toBe(1);
          done();
        }, 350);
      }, 350);
    });
  });
});
