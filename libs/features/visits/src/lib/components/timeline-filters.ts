import {
  Component,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Timeline Filters Component (T128)
 *
 * Provides search and filter controls for timeline:
 * - Text search for venue names
 * - Filter by venue type (brewery, winery, both)
 * - Date range filter
 * - Sort options (most recent, oldest, longest duration)
 * - Clear all filters button
 *
 * User Story 2: Visual Timeline of Visits
 */

export interface TimelineFilters {
  searchQuery: string;
  venueTypes: string[]; // Empty array means all types
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  sortBy: 'recent' | 'oldest' | 'longest';
}

@Component({
  selector: 'app-timeline-filters',
  imports: [CommonModule, FormsModule],
  templateUrl: './timeline-filters.html',
  standalone: true,
})
export class TimelineFiltersComponent {
  @Output() filtersChanged = new EventEmitter<TimelineFilters>();

  // Filter state
  readonly searchQuery = signal('');
  readonly selectedVenueTypes = signal<string[]>([]);
  readonly dateFrom = signal<string | undefined>(undefined);
  readonly dateTo = signal<string | undefined>(undefined);
  readonly sortBy = signal<'recent' | 'oldest' | 'longest'>('recent');

  // UI state
  readonly showFilters = signal(false);

  // Active filters count
  readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchQuery()) count++;
    if (this.selectedVenueTypes().length > 0) count++;
    if (this.dateFrom() || this.dateTo()) count++;
    if (this.sortBy() !== 'recent') count++;
    return count;
  });

  // Has any filters applied
  readonly hasFilters = computed(() => this.activeFiltersCount() > 0);

  toggleFilters(): void {
    this.showFilters.update((show) => !show);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.emitFilters();
  }

  toggleVenueType(type: string): void {
    const currentTypes = this.selectedVenueTypes();
    if (currentTypes.includes(type)) {
      this.selectedVenueTypes.set(currentTypes.filter((t) => t !== type));
    } else {
      this.selectedVenueTypes.set([...currentTypes, type]);
    }
    this.emitFilters();
  }

  isVenueTypeSelected(type: string): boolean {
    return this.selectedVenueTypes().includes(type);
  }

  onDateFromChange(date: string): void {
    this.dateFrom.set(date || undefined);
    this.emitFilters();
  }

  onDateToChange(date: string): void {
    this.dateTo.set(date || undefined);
    this.emitFilters();
  }

  onSortChange(sort: 'recent' | 'oldest' | 'longest'): void {
    this.sortBy.set(sort);
    this.emitFilters();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedVenueTypes.set([]);
    this.dateFrom.set(undefined);
    this.dateTo.set(undefined);
    this.sortBy.set('recent');
    this.emitFilters();
  }

  private emitFilters(): void {
    const filters: TimelineFilters = {
      searchQuery: this.searchQuery(),
      venueTypes: this.selectedVenueTypes(),
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      sortBy: this.sortBy(),
    };
    this.filtersChanged.emit(filters);
  }
}
