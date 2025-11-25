import { Injectable, signal, inject } from '@angular/core';
import { VenuesApiService } from '@blastoise/data';
import type { Venue, Coordinates, ApiResponse } from '@blastoise/shared';
import { BehaviorSubject, debounceTime, switchMap, catchError, of, map } from 'rxjs';
import { calculateDistance } from '@blastoise/shared';
import { NotificationService } from '@blastoise/shared';

/**
 * Handles venue search and proximity queries:
 * - Text-based venue search
 * - Proximity search by location and radius
 * - Search results caching
 * - Distance calculation from user location
 */
@Injectable({
  providedIn: 'root',
})
export class VenueSearchService {
  private readonly venuesApi = inject(VenuesApiService);
  private readonly notificationService = inject(NotificationService);

  // Search state
  private readonly searchQuery$ = new BehaviorSubject<string>('');
  private readonly proximityParams$ = new BehaviorSubject<ProximitySearchParams | null>(null);

  // Signals
  readonly isSearching = signal(false);
  readonly searchResults = signal<Venue[]>([]);
  readonly proximityResults = signal<Venue[]>([]);
  readonly error = signal<string | null>(null);

  // Cache
  private readonly searchCache = new Map<string, ApiResponse<Venue[]>>();
  private readonly proximityCache = new Map<string, ApiResponse<Venue[]>>();

  // Track previous venue IDs to detect new venues
  private previousVenueIds = new Set<string>();

  constructor() {
    this.initializeSearchStream();
    this.initializeProximityStream();
  }

  /**
   * Initialize text search stream with debouncing
   */
  private initializeSearchStream(): void {
    this.searchQuery$
      .pipe(
        debounceTime(300),
        switchMap((query) => {
          if (!query || query.length < 2) {
            return of({ success: true, data: [] } as ApiResponse<Venue[]>);
          }

          // Check cache first
          const cached = this.searchCache.get(query);
          if (cached) {
            return of(cached as ApiResponse<Venue[]>);
          }

          this.isSearching.set(true);
          this.error.set(null);

          return this.venuesApi.search(query).pipe(
            map((response) => response as ApiResponse<Venue[]>),
            catchError((error) => {
              this.error.set('Failed to search venues');
              console.error('Venue search error:', error);
              return of({ success: false, data: [] } as ApiResponse<Venue[]>);
            })
          );
        })
      )
      .subscribe((response) => {
        const results = response.success && response.data ? response.data : [];
        this.searchResults.set(results);
        this.isSearching.set(false);

        // Cache results
        const query = this.searchQuery$.value;
        if (query && results.length > 0) {
          this.searchCache.set(query, response);
        }
      });
  }

  /**
   * Initialize proximity search stream
   */
  private initializeProximityStream(): void {
    this.proximityParams$
      .pipe(
        debounceTime(500),
        switchMap((params) => {
          if (!params) {
            return of({ success: true, data: [] } as ApiResponse<Venue[]>);
          }

          // Check cache first
          const cacheKey = this.getProximityCacheKey(params);
          const cached = this.proximityCache.get(cacheKey);
          if (cached) {
            return of(cached as ApiResponse<Venue[]>);
          }

          this.isSearching.set(true);
          this.error.set(null);

          return this.venuesApi
            .nearby({
              latitude: params.latitude,
              longitude: params.longitude,
              radius_km: params.radius,
              venue_type: params.type
            })
            .pipe(
              map((response) => {
                // VenueWithDistance has different structure than Venue
                // Just return the data as-is for proximity results
                return response as unknown as ApiResponse<Venue[]>;
              }),
              catchError((error) => {
                this.error.set('Failed to find nearby venues');
                console.error('Proximity search error:', error);
                return of({ success: false, data: [] } as ApiResponse<Venue[]>);
              })
            );
        })
      )
      .subscribe((response) => {
        const results = response.success && response.data ? response.data : [];
        this.proximityResults.set(results);
        this.isSearching.set(false);

        // Check for new venues and notify
        this.checkForNewVenues(results);

        // Cache results
        const params = this.proximityParams$.value;
        if (params && results.length > 0) {
          const cacheKey = this.getProximityCacheKey(params);
          this.proximityCache.set(cacheKey, response);
        }
      });
  }

  /**
   * Search venues by text query
   */
  searchByText(query: string): void {
    this.searchQuery$.next(query);
  }

  /**
   * Search venues by proximity
   */
  searchByProximity(params: ProximitySearchParams): void {
    this.proximityParams$.next(params);
  }

  /**
   * Clear search results
   */
  clearSearch(): void {
    this.searchQuery$.next('');
    this.proximityParams$.next(null);
    this.searchResults.set([]);
    this.proximityResults.set([]);
    this.error.set(null);
  }

  /**
   * Calculate distances from user location to venues
   */
  calculateDistances(
    venues: Venue[],
    userLocation: Coordinates
  ): Map<string, number> {
    const distances = new Map<string, number>();

    venues.forEach((venue) => {
      const distance = calculateDistance(
        userLocation,
        { latitude: venue.latitude, longitude: venue.longitude }
      );
      distances.set(venue.id, distance);
    });

    return distances;
  }

  /**
   * Get cache key for proximity search
   */
  private getProximityCacheKey(params: ProximitySearchParams): string {
    return `${params.latitude.toFixed(3)},${params.longitude.toFixed(3)},${params.radius},${params.type || 'all'}`;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.searchCache.clear();
    this.proximityCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { searchCacheSize: number; proximityCacheSize: number } {
    return {
      searchCacheSize: this.searchCache.size,
      proximityCacheSize: this.proximityCache.size,
    };
  }

  /**
   * Notifies user when new venues are discovered in their area
   */
  private checkForNewVenues(venues: Venue[]): void {
    // Skip if this is the first load (no previous results to compare)
    if (this.previousVenueIds.size === 0) {
      // Initialize with current venue IDs
      venues.forEach(venue => this.previousVenueIds.add(venue.id));
      return;
    }

    // Find new venues that weren't in the previous results
    const newVenues = venues.filter(venue => !this.previousVenueIds.has(venue.id));

    // Update tracking set with current results
    this.previousVenueIds.clear();
    venues.forEach(venue => this.previousVenueIds.add(venue.id));

    // Notify if new venues found
    if (newVenues.length > 0) {
      // Determine city from first venue (if available)
      const city = newVenues[0]?.city || 'your area';

      // Send notification
      this.notificationService.notifyNewVenuesNearby(newVenues.length, city);
    }
  }
}

/**
 * Proximity search parameters
 */
export interface ProximitySearchParams {
  latitude: number;
  longitude: number;
  radius: number; // in kilometers
  type?: 'brewery' | 'winery';
}
