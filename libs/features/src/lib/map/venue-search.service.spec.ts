import { TestBed } from '@angular/core/testing';
import { VenueSearchService, ProximitySearchParams } from './venue-search.service';
import { VenuesApiService } from '@blastoise/data';
import { of, throwError } from 'rxjs';
import type { Venue } from '@blastoise/shared';

/**
 * Tests for text search, proximity search, caching, and distance calculations
 */
describe('VenueSearchService', () => {
  let service: VenueSearchService;
  let venuesApiMock: jasmine.SpyObj<VenuesApiService>;

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

  beforeEach(() => {
    venuesApiMock = jasmine.createSpyObj('VenuesApiService', [
      'search',
      'findNearby',
    ]);

    TestBed.configureTestingModule({
      providers: [
        VenueSearchService,
        { provide: VenuesApiService, useValue: venuesApiMock },
      ],
    });

    service = TestBed.inject(VenueSearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Text Search', () => {
    it('should search venues by text query', (done) => {
      venuesApiMock.search.and.returnValue(of([mockVenues[0]]));

      service.searchByText('Deschutes');

      // Wait for debounce (300ms)
      setTimeout(() => {
        expect(venuesApiMock.search).toHaveBeenCalledWith('Deschutes');
        expect(service.searchResults().length).toBe(1);
        expect(service.searchResults()[0].name).toBe('Deschutes Brewery');
        expect(service.isSearching()).toBe(false);
        done();
      }, 350);
    });

    it('should debounce search queries', (done) => {
      venuesApiMock.search.and.returnValue(of(mockVenues));

      // Rapid fire searches
      service.searchByText('D');
      service.searchByText('De');
      service.searchByText('Des');
      service.searchByText('Deschutes');

      // Should only call API once after debounce
      setTimeout(() => {
        expect(venuesApiMock.search).toHaveBeenCalledTimes(1);
        expect(venuesApiMock.search).toHaveBeenCalledWith('Deschutes');
        done();
      }, 350);
    });

    it('should not search with queries less than 2 characters', (done) => {
      service.searchByText('D');

      setTimeout(() => {
        expect(venuesApiMock.search).not.toHaveBeenCalled();
        expect(service.searchResults().length).toBe(0);
        done();
      }, 350);
    });

    it('should cache search results', (done) => {
      venuesApiMock.search.and.returnValue(of([mockVenues[0]]));

      // First search
      service.searchByText('Deschutes');

      setTimeout(() => {
        expect(venuesApiMock.search).toHaveBeenCalledTimes(1);

        // Clear results
        service.clearSearch();

        // Second search with same query
        service.searchByText('Deschutes');

        setTimeout(() => {
          // Should use cache, not call API again
          expect(venuesApiMock.search).toHaveBeenCalledTimes(1);
          expect(service.searchResults().length).toBe(1);
          done();
        }, 350);
      }, 350);
    });

    it('should handle search errors gracefully', (done) => {
      venuesApiMock.search.and.returnValue(
        throwError(() => new Error('Search failed'))
      );

      service.searchByText('test');

      setTimeout(() => {
        expect(service.error()).toBe('Failed to search venues');
        expect(service.searchResults().length).toBe(0);
        expect(service.isSearching()).toBe(false);
        done();
      }, 350);
    });

    it('should clear search results', (done) => {
      venuesApiMock.search.and.returnValue(of([mockVenues[0]]));

      service.searchByText('Deschutes');

      setTimeout(() => {
        expect(service.searchResults().length).toBe(1);

        service.clearSearch();

        expect(service.searchResults().length).toBe(0);
        expect(service.error()).toBe(null);
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

      venuesApiMock.findNearby.and.returnValue(of(mockVenues));

      service.searchByProximity(proximityParams);

      // Wait for debounce (500ms)
      setTimeout(() => {
        expect(venuesApiMock.findNearby).toHaveBeenCalledWith(
          proximityParams.latitude,
          proximityParams.longitude,
          proximityParams.radius,
          undefined
        );
        expect(service.proximityResults().length).toBe(3);
        expect(service.isSearching()).toBe(false);
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

      venuesApiMock.findNearby.and.returnValue(of([mockVenues[0], mockVenues[2]]));

      service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(venuesApiMock.findNearby).toHaveBeenCalledWith(
          proximityParams.latitude,
          proximityParams.longitude,
          proximityParams.radius,
          'brewery'
        );
        expect(service.proximityResults().length).toBe(2);
        done();
      }, 550);
    });

    it('should cache proximity search results', (done) => {
      const proximityParams: ProximitySearchParams = {
        latitude: 44.0521,
        longitude: -121.3153,
        radius: 10,
      };

      venuesApiMock.findNearby.and.returnValue(of(mockVenues));

      // First search
      service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(venuesApiMock.findNearby).toHaveBeenCalledTimes(1);

        // Clear and search again
        service.clearSearch();
        service.searchByProximity(proximityParams);

        setTimeout(() => {
          // Should use cache
          expect(venuesApiMock.findNearby).toHaveBeenCalledTimes(1);
          expect(service.proximityResults().length).toBe(3);
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

      venuesApiMock.findNearby.and.returnValue(
        throwError(() => new Error('Proximity search failed'))
      );

      service.searchByProximity(proximityParams);

      setTimeout(() => {
        expect(service.error()).toBe('Failed to find nearby venues');
        expect(service.proximityResults().length).toBe(0);
        expect(service.isSearching()).toBe(false);
        done();
      }, 550);
    });

    it('should debounce proximity searches', (done) => {
      venuesApiMock.findNearby.and.returnValue(of(mockVenues));

      // Rapid fire proximity searches
      service.searchByProximity({
        latitude: 44.05,
        longitude: -121.31,
        radius: 5,
      });
      service.searchByProximity({
        latitude: 44.051,
        longitude: -121.312,
        radius: 6,
      });
      service.searchByProximity({
        latitude: 44.0521,
        longitude: -121.3153,
        radius: 10,
      });

      setTimeout(() => {
        // Should only call API once
        expect(venuesApiMock.findNearby).toHaveBeenCalledTimes(1);
        expect(venuesApiMock.findNearby).toHaveBeenCalledWith(
          44.0521,
          -121.3153,
          10,
          undefined
        );
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

      const distances = service.calculateDistances(mockVenues, userLocation);

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
      const distances = service.calculateDistances([venue], userLocation);

      expect(distances.get('venue-1')).toBeLessThan(0.001);
    });

    it('should handle empty venue list', () => {
      const userLocation = {
        latitude: 44.0521,
        longitude: -121.3153,
      };

      const distances = service.calculateDistances([], userLocation);

      expect(distances.size).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', (done) => {
      venuesApiMock.search.and.returnValue(of([mockVenues[0]]));
      venuesApiMock.findNearby.and.returnValue(of(mockVenues));

      // Populate both caches
      service.searchByText('Deschutes');

      setTimeout(() => {
        service.searchByProximity({
          latitude: 44.0521,
          longitude: -121.3153,
          radius: 10,
        });

        setTimeout(() => {
          const statsBefore = service.getCacheStats();
          expect(statsBefore.searchCacheSize).toBeGreaterThan(0);
          expect(statsBefore.proximityCacheSize).toBeGreaterThan(0);

          service.clearCache();

          const statsAfter = service.getCacheStats();
          expect(statsAfter.searchCacheSize).toBe(0);
          expect(statsAfter.proximityCacheSize).toBe(0);
          done();
        }, 550);
      }, 350);
    });

    it('should provide cache statistics', (done) => {
      venuesApiMock.search.and.returnValue(of([mockVenues[0]]));

      const initialStats = service.getCacheStats();
      expect(initialStats.searchCacheSize).toBe(0);
      expect(initialStats.proximityCacheSize).toBe(0);

      service.searchByText('Deschutes');

      setTimeout(() => {
        const statsAfter = service.getCacheStats();
        expect(statsAfter.searchCacheSize).toBe(1);
        done();
      }, 350);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from search errors and continue working', (done) => {
      // First search fails
      venuesApiMock.search.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      service.searchByText('test1');

      setTimeout(() => {
        expect(service.error()).toBe('Failed to search venues');

        // Second search succeeds
        venuesApiMock.search.and.returnValue(of([mockVenues[0]]));
        service.searchByText('test2');

        setTimeout(() => {
          expect(service.error()).toBe(null);
          expect(service.searchResults().length).toBe(1);
          done();
        }, 350);
      }, 350);
    });
  });
});
