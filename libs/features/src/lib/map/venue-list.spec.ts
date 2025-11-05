import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VenueList } from './venue-list';
import type { Venue } from '@blastoise/shared';

/**
 * Tests for sorting, filtering, search, and distance display
 */
describe('VenueList Component', () => {
  let component: VenueList;
  let fixture: ComponentFixture<VenueList>;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenueList],
    }).compileComponents();

    fixture = TestBed.createComponent(VenueList);
    component = fixture.componentInstance;
    component.venues = mockVenues;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Filtering', () => {
    it('should filter venues by type - breweries only', () => {
      component.onFilterChange('brewery');
      fixture.detectChanges();

      const filtered = component.filteredVenues();
      expect(filtered.length).toBe(2);
      expect(filtered.every((v) => v.type === 'brewery')).toBe(true);
    });

    it('should filter venues by type - wineries only', () => {
      component.onFilterChange('winery');
      fixture.detectChanges();

      const filtered = component.filteredVenues();
      expect(filtered.length).toBe(1);
      expect(filtered[0].type).toBe('winery');
    });

    it('should show all venues when filter is "all"', () => {
      component.onFilterChange('all');
      fixture.detectChanges();

      const filtered = component.filteredVenues();
      expect(filtered.length).toBe(3);
    });

    it('should handle empty results after filtering', () => {
      component.venues = [mockVenues[0]]; // Only brewery
      component.onFilterChange('winery');
      fixture.detectChanges();

      expect(component.filteredVenues().length).toBe(0);
      expect(component.isEmpty()).toBe(true);
    });
  });

  describe('Search', () => {
    it('should search venues by name', () => {
      const searchEvent = {
        target: { value: 'Deschutes' },
      } as any;

      component.onSearchChange(searchEvent);
      fixture.detectChanges();

      const filtered = component.filteredVenues();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Deschutes Brewery');
    });

    it('should search venues by city', () => {
      const searchEvent = {
        target: { value: 'Bend' },
      } as any;

      component.onSearchChange(searchEvent);
      fixture.detectChanges();

      const filtered = component.filteredVenues();
      expect(filtered.length).toBe(2);
      expect(filtered.every((v) => v.address.city === 'Bend')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const searchEvent = {
        target: { value: 'deschutes' },
      } as any;

      component.onSearchChange(searchEvent);
      fixture.detectChanges();

      const filtered = component.filteredVenues();
      expect(filtered.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      const searchEvent = {
        target: { value: 'NonExistent' },
      } as any;

      component.onSearchChange(searchEvent);
      fixture.detectChanges();

      expect(component.filteredVenues().length).toBe(0);
      expect(component.isEmpty()).toBe(true);
    });

    it('should combine search with filter', () => {
      const searchEvent = {
        target: { value: 'Barrel' },
      } as any;

      component.onSearchChange(searchEvent);
      component.onFilterChange('brewery');
      fixture.detectChanges();

      const filtered = component.filteredVenues();
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
      component.distances = distances;
    });

    it('should sort by name alphabetically', () => {
      component.onSortChange('name');
      fixture.detectChanges();

      const sorted = component.filteredVenues();
      expect(sorted[0].name).toBe('10 Barrel Brewing');
      expect(sorted[1].name).toBe('Deschutes Brewery');
      expect(sorted[2].name).toBe('Willamette Valley Vineyards');
    });

    it('should sort by distance (closest first)', () => {
      component.onSortChange('distance');
      fixture.detectChanges();

      const sorted = component.filteredVenues();
      expect(sorted[0].id).toBe('venue-1'); // 0.5km
      expect(sorted[1].id).toBe('venue-3'); // 0.8km
      expect(sorted[2].id).toBe('venue-2'); // 50km
    });

    it('should sort by type', () => {
      component.onSortChange('type');
      fixture.detectChanges();

      const sorted = component.filteredVenues();
      expect(sorted[0].type).toBe('brewery');
      expect(sorted[1].type).toBe('brewery');
      expect(sorted[2].type).toBe('winery');
    });

    it('should handle venues without distance data', () => {
      component.distances = new Map(); // No distances
      component.onSortChange('distance');
      fixture.detectChanges();

      const sorted = component.filteredVenues();
      expect(sorted.length).toBe(3);
    });
  });

  describe('Distance Display', () => {
    it('should format distance in meters when less than 1km', () => {
      component.distances = new Map([['venue-1', 0.5]]);

      const distance = component.getDistance('venue-1');
      expect(distance).toBe('500m');
    });

    it('should format distance in kilometers when 1km or more', () => {
      component.distances = new Map([['venue-1', 2.5]]);

      const distance = component.getDistance('venue-1');
      expect(distance).toBe('2.5km');
    });

    it('should return empty string for venues without distance', () => {
      component.distances = new Map();

      const distance = component.getDistance('venue-1');
      expect(distance).toBe('');
    });

    it('should round meters to whole numbers', () => {
      component.distances = new Map([['venue-1', 0.456]]);

      const distance = component.getDistance('venue-1');
      expect(distance).toBe('456m');
    });
  });

  describe('Visited Status', () => {
    it('should identify visited venues', () => {
      component.visitedVenueIds = ['venue-1', 'venue-3'];

      expect(component.isVisited('venue-1')).toBe(true);
      expect(component.isVisited('venue-2')).toBe(false);
      expect(component.isVisited('venue-3')).toBe(true);
    });

    it('should handle empty visited list', () => {
      component.visitedVenueIds = [];

      expect(component.isVisited('venue-1')).toBe(false);
    });
  });

  describe('Venue Selection', () => {
    it('should emit venue when selected', (done) => {
      component.venueSelected.subscribe((venue) => {
        expect(venue.id).toBe('venue-1');
        expect(venue.name).toBe('Deschutes Brewery');
        done();
      });

      component.selectVenue(mockVenues[0]);
    });
  });

  describe('Venue Icons and Labels', () => {
    it('should return correct icon for brewery', () => {
      expect(component.getVenueIcon('brewery')).toBe('🍺');
    });

    it('should return correct icon for winery', () => {
      expect(component.getVenueIcon('winery')).toBe('🍷');
    });

    it('should return correct label for brewery', () => {
      expect(component.getVenueTypeLabel('brewery')).toBe('Brewery');
    });

    it('should return correct label for winery', () => {
      expect(component.getVenueTypeLabel('winery')).toBe('Winery');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no venues', () => {
      component.venues = [];
      fixture.detectChanges();

      expect(component.isEmpty()).toBe(true);
      expect(component.filteredVenues().length).toBe(0);
    });

    it('should show empty state after filtering with no results', () => {
      component.onFilterChange('winery');
      component.venues = [mockVenues[0], mockVenues[2]]; // Only breweries
      fixture.detectChanges();

      expect(component.isEmpty()).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', () => {
      component.loading = true;
      fixture.detectChanges();

      expect(component.loading).toBe(true);
    });

    it('should show venues when not loading', () => {
      component.loading = false;
      fixture.detectChanges();

      expect(component.loading).toBe(false);
      expect(component.filteredVenues().length).toBe(3);
    });
  });

  describe('Complex Filtering Scenarios', () => {
    it('should apply search, filter, and sort together', () => {
      const distances = new Map<string, number>();
      distances.set('venue-1', 1.0);
      distances.set('venue-3', 0.5);
      component.distances = distances;

      // Search for "Brewing" (matches both breweries)
      const searchEvent = {
        target: { value: 'Brewing' },
      } as any;
      component.onSearchChange(searchEvent);

      // Filter by brewery
      component.onFilterChange('brewery');

      // Sort by distance
      component.onSortChange('distance');

      fixture.detectChanges();

      const filtered = component.filteredVenues();
      expect(filtered.length).toBe(2);
      expect(filtered[0].id).toBe('venue-3'); // Closer
      expect(filtered[1].id).toBe('venue-1');
    });
  });
});
