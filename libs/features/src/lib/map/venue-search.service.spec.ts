import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { VenueSearchService, ProximitySearchParams } from './venue-search.service';
import { VenuesApiService } from '@blastoise/data';
import { NotificationService } from '@blastoise/data-frontend';
import { of, throwError } from 'rxjs';
import type { Venue, ApiResponse } from '@blastoise/shared';

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
      venue_type: 'brewery',
      source: 'manual',
      city: 'Bend',
      state: 'OR',
      country: 'USA',
      postal_code: '97702',
      latitude: 44.0521,
      longitude: -121.3153,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'venue-2',
      name: 'Willamette Valley Vineyards',
      venue_type: 'winery',
      source: 'manual',
      city: 'Turner',
      state: 'OR',
      country: 'USA',
      postal_code: '97392',
      latitude: 44.8429,
      longitude: -122.9507,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'venue-3',
      name: '10 Barrel Brewing',
      venue_type: 'brewery',
      source: 'manual',
      city: 'Bend',
      state: 'OR',
      country: 'USA',
      postal_code: '97703',
      latitude: 44.0583,
      longitude: -121.3219,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const createService = createServiceFactory({
    service: VenueSearchService,
    mocks: [VenuesApiService, NotificationService],
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
      const searchResponse: ApiResponse<Venue[]> = {
        success: true,
        data: [mockVenues[0]],
      };
      venuesApi.search.mockReturnValue(of(searchResponse));

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
      const searchResponse: ApiResponse<Venue[]> = {
        success: true,
        data: mockVenues,
      };
      venuesApi.search.mockReturnValue(of(searchResponse));

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
      const searchResponse: ApiResponse<Venue[]> = {
        success: true,
        data: [mockVenues[0]],
      };
      venuesApi.search.mockReturnValue(of(searchResponse));

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
      const searchResponse: ApiResponse<Venue[]> = {
        success: true,
        data: [mockVenues[0]],
      };
      venuesApi.search.mockReturnValue(of(searchResponse));

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

      const proximityResponse: ApiResponse<Venue[]> = {
        success: true,
        data: mockVenues,
      };
      venuesApi.nearby.mockReturnValue(of(proximityResponse));

      spectator.service.searchByProximity(proximityParams);

      // Wait for debounce (500ms)
      setTimeout(() => {
        expect(venuesApi.nearby).toHaveBeenCalledWith({
          latitude: proximityParams.latitude,
          longitude: proximityParams.longitude,
          radius_km: proximityParams.radius,
          venue_type: undefined,
        });
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

      const proximityResponse: ApiResponse<Venue[]> = {
        success: true,
        data: [mockVenues[0], mockVenues[2]],
      };
      venuesApi.nearby.mockReturnValue(of(proximityResponse));

      spectator.service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(venuesApi.nearby).toHaveBeenCalledWith({
          latitude: proximityParams.latitude,
          longitude: proximityParams.longitude,
          radius_km: proximityParams.radius,
          venue_type: 'brewery',
        });
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

      const proximityResponse: ApiResponse<Venue[]> = {
        success: true,
        data: mockVenues,
      };
      venuesApi.nearby.mockReturnValue(of(proximityResponse));

      // First search
      spectator.service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(venuesApi.nearby).toHaveBeenCalledTimes(1);

        // Clear and search again
        spectator.service.clearSearch();
        spectator.service.searchByProximity(proximityParams);

        setTimeout(() => {
          // Should use cache
          expect(venuesApi.nearby).toHaveBeenCalledTimes(1);
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

      venuesApi.nearby.mockReturnValue(throwError(() => new Error('Proximity search failed')));

      spectator.service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(spectator.service.error()).toBe('Failed to find nearby venues');
        expect(spectator.service.proximityResults().length).toBe(0);
        expect(spectator.service.isSearching()).toBe(false);
        done();
      }, 550);
    });

    it('should debounce proximity searches', (done) => {
      const proximityResponse: ApiResponse<Venue[]> = {
        success: true,
        data: mockVenues,
      };
      venuesApi.nearby.mockReturnValue(of(proximityResponse));

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
        expect(venuesApi.nearby).toHaveBeenCalledTimes(1);
        expect(venuesApi.nearby).toHaveBeenCalledWith({
          latitude: 44.0521,
          longitude: -121.3153,
          radius_km: 10,
          venue_type: undefined,
        });
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
      const searchResponse: ApiResponse<Venue[]> = {
        success: true,
        data: [mockVenues[0]],
      };
      const proximityResponse: ApiResponse<Venue[]> = {
        success: true,
        data: mockVenues,
      };
      venuesApi.search.mockReturnValue(of(searchResponse));
      venuesApi.nearby.mockReturnValue(of(proximityResponse));

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
      const searchResponse: ApiResponse<Venue[]> = {
        success: true,
        data: [mockVenues[0]],
      };
      venuesApi.search.mockReturnValue(of(searchResponse));

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
        const recoveryResponse: ApiResponse<Venue[]> = {
          success: true,
          data: [mockVenues[0]],
        };
        venuesApi.search.mockReturnValue(of(recoveryResponse));
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
