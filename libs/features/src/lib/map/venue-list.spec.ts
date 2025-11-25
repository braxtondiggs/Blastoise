import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { VenueList } from './venue-list';
import type { Venue } from '@blastoise/shared';

/**
 * Tests for sorting, filtering, search, and distance display
 */
describe('VenueList Component', () => {
  let spectator: Spectator<VenueList>;

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

  const createComponent = createComponentFactory({
    component: VenueList,
    detectChanges: false,
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        venues: mockVenues,
      },
    });
    spectator.detectChanges();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('Filtering', () => {
    it('should filter venues by type - breweries only', () => {
      spectator.component.onFilterChange('brewery');
      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(2);
      expect(filtered.every((v) => v.type === 'brewery')).toBe(true);
    });

    it('should filter venues by type - wineries only', () => {
      spectator.component.onFilterChange('winery');
      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(1);
      expect(filtered[0].type).toBe('winery');
    });

    it('should show all venues when filter is "all"', () => {
      spectator.component.onFilterChange('all');
      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(3);
    });

    it('should handle empty results after filtering', () => {
      spectator.setInput('venues', [mockVenues[0]]); // Only brewery
      spectator.component.onFilterChange('winery');
      spectator.detectChanges();

      expect(spectator.component.filteredVenues().length).toBe(0);
      expect(spectator.component.isEmpty()).toBe(true);
    });
  });

  describe('Search', () => {
    it('should search venues by name', () => {
      const searchEvent = {
        target: { value: 'Deschutes' },
      } as unknown as Event;

      spectator.component.onSearchChange(searchEvent);
      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Deschutes Brewery');
    });

    it('should search venues by city', () => {
      const searchEvent = {
        target: { value: 'Bend' },
      } as unknown as Event;

      spectator.component.onSearchChange(searchEvent);
      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(2);
      expect(filtered.every((v) => v.address.city === 'Bend')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const searchEvent = {
        target: { value: 'deschutes' },
      } as unknown as Event;

      spectator.component.onSearchChange(searchEvent);
      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      const searchEvent = {
        target: { value: 'NonExistent' },
      } as unknown as Event;

      spectator.component.onSearchChange(searchEvent);
      spectator.detectChanges();

      expect(spectator.component.filteredVenues().length).toBe(0);
      expect(spectator.component.isEmpty()).toBe(true);
    });

    it('should combine search with filter', () => {
      const searchEvent = {
        target: { value: 'Barrel' },
      } as unknown as Event;

      spectator.component.onSearchChange(searchEvent);
      spectator.component.onFilterChange('brewery');
      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('10 Barrel Brewing');
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      const distances = new Map<string, number>();
      distances.set('venue-1', 0.5);
      distances.set('venue-2', 50.0);
      distances.set('venue-3', 0.8);
      spectator.setInput('distances', distances);
    });

    it('should sort by name alphabetically', () => {
      spectator.component.onSortChange('name');
      spectator.detectChanges();

      const sorted = spectator.component.filteredVenues();
      expect(sorted[0].name).toBe('10 Barrel Brewing');
      expect(sorted[1].name).toBe('Deschutes Brewery');
      expect(sorted[2].name).toBe('Willamette Valley Vineyards');
    });

    it('should sort by distance (closest first)', () => {
      spectator.component.onSortChange('distance');
      spectator.detectChanges();

      const sorted = spectator.component.filteredVenues();
      expect(sorted[0].id).toBe('venue-1'); // 0.5km
      expect(sorted[1].id).toBe('venue-3'); // 0.8km
      expect(sorted[2].id).toBe('venue-2'); // 50km
    });

    it('should sort by type', () => {
      spectator.component.onSortChange('type');
      spectator.detectChanges();

      const sorted = spectator.component.filteredVenues();
      expect(sorted[0].type).toBe('brewery');
      expect(sorted[1].type).toBe('brewery');
      expect(sorted[2].type).toBe('winery');
    });

    it('should handle venues without distance data', () => {
      spectator.setInput('distances', new Map()); // No distances
      spectator.component.onSortChange('distance');
      spectator.detectChanges();

      const sorted = spectator.component.filteredVenues();
      expect(sorted.length).toBe(3);
    });
  });

  describe('Distance Display', () => {
    it('should format distance in meters when less than 1km', () => {
      spectator.setInput('distances', new Map([['venue-1', 0.5]]));

      const distance = spectator.component.getDistance('venue-1');
      expect(distance).toBe('500m');
    });

    it('should format distance in kilometers when 1km or more', () => {
      spectator.setInput('distances', new Map([['venue-1', 2.5]]));

      const distance = spectator.component.getDistance('venue-1');
      expect(distance).toBe('2.5km');
    });

    it('should return empty string for venues without distance', () => {
      spectator.setInput('distances', new Map());

      const distance = spectator.component.getDistance('venue-1');
      expect(distance).toBe('');
    });

    it('should round meters to whole numbers', () => {
      spectator.setInput('distances', new Map([['venue-1', 0.456]]));

      const distance = spectator.component.getDistance('venue-1');
      expect(distance).toBe('456m');
    });
  });

  describe('Visited Status', () => {
    it('should identify visited venues', () => {
      spectator.setInput('visitedVenueIds', ['venue-1', 'venue-3']);

      expect(spectator.component.isVisited('venue-1')).toBe(true);
      expect(spectator.component.isVisited('venue-2')).toBe(false);
      expect(spectator.component.isVisited('venue-3')).toBe(true);
    });

    it('should handle empty visited list', () => {
      spectator.setInput('visitedVenueIds', []);

      expect(spectator.component.isVisited('venue-1')).toBe(false);
    });
  });

  describe('Venue Selection', () => {
    it('should emit venue when selected', () => {
      const selectSpy = jest.fn();
      spectator.output('venueSelected').subscribe(selectSpy);

      spectator.component.selectVenue(mockVenues[0]);

      expect(selectSpy).toHaveBeenCalledWith(mockVenues[0]);
    });
  });

  describe('Venue Icons and Labels', () => {
    it('should return correct icon for brewery', () => {
      expect(spectator.component.getVenueIcon('brewery')).toBe('🍺');
    });

    it('should return correct icon for winery', () => {
      expect(spectator.component.getVenueIcon('winery')).toBe('🍷');
    });

    it('should return correct label for brewery', () => {
      expect(spectator.component.getVenueTypeLabel('brewery')).toBe('Brewery');
    });

    it('should return correct label for winery', () => {
      expect(spectator.component.getVenueTypeLabel('winery')).toBe('Winery');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no venues', () => {
      spectator.setInput('venues', []);
      spectator.detectChanges();

      expect(spectator.component.isEmpty()).toBe(true);
      expect(spectator.component.filteredVenues().length).toBe(0);
    });

    it('should show empty state after filtering with no results', () => {
      spectator.component.onFilterChange('winery');
      spectator.setInput('venues', [mockVenues[0], mockVenues[2]]); // Only breweries
      spectator.detectChanges();

      expect(spectator.component.isEmpty()).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', () => {
      spectator.setInput('loading', true);
      spectator.detectChanges();

      expect(spectator.component.loading).toBe(true);
    });

    it('should show venues when not loading', () => {
      spectator.setInput('loading', false);
      spectator.detectChanges();

      expect(spectator.component.loading).toBe(false);
      expect(spectator.component.filteredVenues().length).toBe(3);
    });
  });

  describe('Complex Filtering Scenarios', () => {
    it('should apply search, filter, and sort together', () => {
      const distances = new Map<string, number>();
      distances.set('venue-1', 1.0);
      distances.set('venue-3', 0.5);
      spectator.setInput('distances', distances);

      // Search for "Brewing" (matches both breweries)
      const searchEvent = {
        target: { value: 'Brewing' },
      } as unknown as Event;
      spectator.component.onSearchChange(searchEvent);

      // Filter by brewery
      spectator.component.onFilterChange('brewery');

      // Sort by distance
      spectator.component.onSortChange('distance');

      spectator.detectChanges();

      const filtered = spectator.component.filteredVenues();
      expect(filtered.length).toBe(2);
      expect(filtered[0].id).toBe('venue-3'); // Closer
      expect(filtered[1].id).toBe('venue-1');
    });
  });
});
