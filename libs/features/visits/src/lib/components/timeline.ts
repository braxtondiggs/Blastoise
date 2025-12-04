import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type { Visit, Venue } from '@blastoise/shared';
import { VisitsLocalRepository, VisitsApiService } from '@blastoise/data';
import { VenuesApiService } from '@blastoise/data';
import { Subject, takeUntil, debounceTime, firstValueFrom } from 'rxjs';
import { VisitCard } from './visit-card';
import { VisitTrackerService } from '../services/visit-tracker';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowPath, heroMapPin } from '@ng-icons/heroicons/outline';

/**
 * Displays visits in chronological order with:
 * - Date grouping with headers (T124)
 * - Chronological sorting by arrival time (T123)
 * - Infinite scroll / lazy loading (T125)
 * - Visit cards with venue information
 *
 * User Story 2: Visual Timeline of Visits
 */

interface GroupedVisits {
  date: string; // ISO date string (YYYY-MM-DD)
  displayDate: string; // Human-readable date
  visits: (Visit & { venue?: Venue })[];
}

@Component({
  selector: 'app-timeline',
  imports: [CommonModule, VisitCard, NgIconComponent],
  templateUrl: './timeline.html',
  standalone: true,
  viewProviders: [
    provideIcons({
      heroArrowPath,
      heroMapPin,
    }),
  ],
})
export class TimelineComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly localRepository = inject(VisitsLocalRepository);
  private readonly visitsApi = inject(VisitsApiService);
  private readonly venuesApi = inject(VenuesApiService);
  private readonly visitTracker = inject(VisitTrackerService);
  private readonly authState = inject(AuthStateService);
  private readonly destroy$ = new Subject<void>();

  // Pagination state
  private readonly pageSize = 20;
  private readonly currentPage = signal(0);
  readonly hasMore = signal(true);
  readonly isLoading = signal(false);

  // All loaded visits (accumulated as user scrolls)
  private readonly allVisits = signal<(Visit & { venue?: Venue })[]>([]);

  // Grouped visits by date for display
  readonly groupedVisits = computed(() => {
    const visits = this.allVisits();
    return this.groupVisitsByDate(visits);
  });

  // Empty state
  readonly isEmpty = computed(() => {
    return this.allVisits().length === 0 && !this.isLoading();
  });

  ngOnInit(): void {
    this.loadMoreVisits();

    // Setup infinite scroll listener
    this.setupInfiniteScroll();

    // Setup pull-to-refresh for mobile
    this.setupPullToRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load visits sorted chronologically by arrival time (descending)
   * Hybrid approach: Try API first (for synced data), fallback to local (offline)
   */
  async loadMoreVisits(): Promise<void> {
    if (this.isLoading() || !this.hasMore()) {
      return;
    }

    this.isLoading.set(true);

    try {
      const page = this.currentPage() + 1; // API uses 1-based pages
      let visits: Visit[] = [];
      let apiSuccess = false;

      // Try API first if we have an access token (authenticated or has session)
      const hasToken = !!this.authState.accessToken();
      if (hasToken) {
        try {
          const response = await firstValueFrom(
            this.visitsApi.getAll(page, this.pageSize)
          );
          if (response.success) {
            visits = response.data || [];
            apiSuccess = true;

            // Cache to local for offline access
            if (visits.length > 0) {
              await this.cacheVisitsLocally(visits);
            }
          }
        } catch (error) {
          console.warn('Failed to load from API, falling back to local:', error);
        }
      }

      // Fallback to local only if API failed or no token
      if (!apiSuccess) {
        const offset = this.currentPage() * this.pageSize;
        visits = await this.localRepository.getVisits({
          limit: this.pageSize,
          offset,
          orderBy: 'arrival_time',
          order: 'desc',
        });
      }

      if (visits.length === 0) {
        this.hasMore.set(false);
        this.isLoading.set(false);
        return;
      }

      // Check if we've reached the end
      if (visits.length < this.pageSize) {
        this.hasMore.set(false);
      }

      // Fetch venue details for each visit
      // First try local cache (from VisitTrackerService), then fall back to API
      const visitsWithVenues = await Promise.all(
        visits.map(async (visit: Visit) => {
          // If visit already has venue data from API join, use it
          if ((visit as any).venue) {
            return visit as Visit & { venue?: Venue };
          }

          // Try local cache first (venues loaded during tracking)
          const cachedVenue = this.visitTracker.getVenue(visit.venue_id);
          if (cachedVenue) {
            return { ...visit, venue: cachedVenue };
          }

          // Fall back to API if not in cache
          try {
            const response = await firstValueFrom(this.venuesApi.getVenue(visit.venue_id));
            return { ...visit, venue: response };
          } catch (error: any) {
            const errorMsg = error?.message || error?.error?.message || 'Unknown error';
            console.warn(`Could not fetch venue ${visit.venue_id}: ${errorMsg}`);
            return visit; // Return visit without venue if fetch fails
          }
        })
      );

      // Append to existing visits
      this.allVisits.update((current) => [...current, ...visitsWithVenues]);

      this.currentPage.update((page) => page + 1);
    } catch (error) {
      console.error('Error loading visits:', error);
      this.hasMore.set(false);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cache visits to local IndexedDB for offline access
   */
  private async cacheVisitsLocally(visits: Visit[]): Promise<void> {
    try {
      await this.localRepository.batchSave(visits);
    } catch (error) {
      // Silent fail - caching is not critical
      console.debug('Failed to cache visits locally:', error);
    }
  }

  /**
   * Group visits by date with headers
   */
  private groupVisitsByDate(
    visits: (Visit & { venue?: Venue })[]
  ): GroupedVisits[] {
    const grouped = new Map<string, (Visit & { venue?: Venue })[]>();

    // Group visits by ISO date (YYYY-MM-DD)
    for (const visit of visits) {
      const arrivalDate = new Date(visit.arrival_time);
      const isoDate = arrivalDate.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped.has(isoDate)) {
        grouped.set(isoDate, []);
      }

      grouped.get(isoDate)!.push(visit);
    }

    // Convert to array and format display dates
    const result: GroupedVisits[] = [];

    for (const [isoDate, groupVisits] of grouped.entries()) {
      const date = new Date(isoDate + 'T00:00:00'); // Parse as local midnight
      const displayDate = this.formatDisplayDate(date);

      result.push({
        date: isoDate,
        displayDate,
        visits: groupVisits,
      });
    }

    // Already sorted by arrival time descending, so dates are in order
    return result;
  }

  /**
   * Format date for display (e.g., "Today", "Yesterday", "March 15, 2025")
   */
  private formatDisplayDate(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }

    if (compareDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    // Use Intl.DateTimeFormat for locale-aware formatting
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Setup infinite scroll listener
   */
  private setupInfiniteScroll(): void {
    // Listen for scroll events (debounced)
    const scrollSubject = new Subject<void>();

    scrollSubject
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadMoreVisits();
      });

    // Add scroll event listener to window
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;

      // Trigger load when user is 200px from bottom
      if (scrollPosition >= documentHeight - 200) {
        scrollSubject.next();
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Cleanup on destroy
    this.destroy$.subscribe(() => {
      window.removeEventListener('scroll', handleScroll);
    });
  }

  /**
   * Navigate to visit detail view
   */
  onVisitClick(visit: Visit): void {
    this.router.navigate(['/visits', visit.id]);
  }

  /**
   * Setup pull-to-refresh gesture for mobile
   */
  private setupPullToRefresh(): void {
    let startY = 0;
    let pulling = false;
    const threshold = 80; // Pull distance threshold in pixels

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling) return;

      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;

      // Prevent default pull-to-refresh behavior on some browsers
      if (pullDistance > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!pulling) return;

      const currentY = e.changedTouches[0].clientY;
      const pullDistance = currentY - startY;

      if (pullDistance > threshold) {
        // Trigger refresh
        await this.refresh();
      }

      pulling = false;
      startY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Cleanup on destroy
    this.destroy$.subscribe(() => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    });
  }

  /**
   * Refresh timeline (pull-to-refresh)
   */
  async refresh(): Promise<void> {
    this.currentPage.set(0);
    this.hasMore.set(true);
    this.allVisits.set([]);
    await this.loadMoreVisits();
  }
}
