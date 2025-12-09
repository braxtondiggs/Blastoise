import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Venue } from '@blastoise/shared';

/**
 * Alternative list view for venues (instead of map).
 * Displays venues in a scrollable list with:
 * - Venue name, type, and address
 * - Distance from user (if available)
 * - Visited status indicator
 * - Sort and filter options
 */
@Component({
  selector: 'app-venue-list',
  imports: [CommonModule],
  templateUrl: './venue-list.html',
  standalone: true,
})
export class VenueList {
  // Inputs
  private _venues: Venue[] = [];
  @Input() set venues(value: Venue[]) {
    this._venues = value ?? [];
    this.triggerRecompute();
  }
  get venues(): Venue[] {
    return this._venues;
  }

  private _visitedVenueIds: string[] = [];
  @Input() set visitedVenueIds(value: string[]) {
    this._visitedVenueIds = value ?? [];
    this.triggerRecompute();
  }
  get visitedVenueIds(): string[] {
    return this._visitedVenueIds;
  }

  private _distances: Map<string, number> = new Map();
  @Input() set distances(value: Map<string, number>) {
    this._distances = value ?? new Map();
    this.triggerRecompute();
  }
  get distances(): Map<string, number> {
    return this._distances;
  }

  private _loading = false;
  @Input() set loading(value: boolean) {
    this._loading = value ?? false;
    this.triggerRecompute();
  }
  get loading(): boolean {
    return this._loading;
  }

  // Outputs
  @Output() venueSelected = new EventEmitter<Venue>();

  // Signals
  readonly sortBy = signal<'name' | 'distance' | 'type'>('distance');
  readonly filterType = signal<'all' | 'brewery' | 'winery'>('all');
  readonly searchQuery = signal('');
  private readonly recomputeTrigger = signal(0);

  // Computed venues list (sorted and filtered)
  readonly filteredVenues = computed(() => {
    this.recomputeTrigger();
    let filtered = [...this._venues];

    // Apply search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      const normalize = (value: string) =>
        value
          .toLowerCase()
          .replace(/brewery/g, 'brew')
          .replace(/brewing/g, 'brew');
      const normalizedQuery = normalize(query);

      filtered = filtered.filter((v) => {
        const normalizedName = normalize(v.name);
        const normalizedCity = v.city ? normalize(v.city) : '';
        return (
          normalizedName.includes(normalizedQuery) ||
          normalizedCity.includes(normalizedQuery)
        );
      });
    }

    // Apply type filter
    const type = this.filterType();
    if (type !== 'all') {
      filtered = filtered.filter((v) => v.venue_type === type);
    }

    // Apply sorting
    const sort = this.sortBy();
    filtered.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'distance':
        { const distA = this.distances.get(a.id) || Infinity;
          const distB = this.distances.get(b.id) || Infinity;
          return distA - distB; }
        case 'type':
          return a.venue_type.localeCompare(b.venue_type);
        default:
          return 0;
      }
    });

    return filtered;
  });

  readonly isEmpty = computed(() => this.filteredVenues().length === 0);

  private triggerRecompute(): void {
    this.recomputeTrigger.update((v) => v + 1);
  }

  /**
   * Check if venue has been visited
   */
  isVisited(venueId: string): boolean {
    return this.visitedVenueIds.includes(venueId);
  }

  /**
   * Get distance for venue
   */
  getDistance(venueId: string): string {
    const distance = this.distances.get(venueId);
    if (!distance) return '';

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Handle venue selection
   */
  selectVenue(venue: Venue): void {
    this.venueSelected.emit(venue);
  }

  /**
   * Update search query
   */
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  /**
   * Update sort option
   */
  onSortChange(sort: 'name' | 'distance' | 'type'): void {
    this.sortBy.set(sort);
  }

  /**
   * Update filter type
   */
  onFilterChange(filter: 'all' | 'brewery' | 'winery'): void {
    this.filterType.set(filter);
  }

  /**
   * Get venue type icon
   */
  getVenueIcon(type: string): string {
    return type === 'brewery' ? '🍺' : '🍷';
  }

  /**
   * Get venue type label
   */
  getVenueTypeLabel(type: string): string {
    return type === 'brewery' ? 'Brewery' : 'Winery';
  }
}
