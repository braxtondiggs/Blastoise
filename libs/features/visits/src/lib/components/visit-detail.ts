import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Visit, Venue, Coordinates } from '@blastoise/shared';
import { VisitsLocalRepository, VisitsApiService } from '@blastoise/data';
import { VenuesApiService } from '@blastoise/data';
import { DurationPipe } from '@blastoise/ui';
import { ShareModalComponent } from '@blastoise/features-sharing';
import { VenueMap } from '@blastoise/features';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { firstValueFrom } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import {
  heroArrowLeft,
  heroShare,
  heroTrash,
  heroMapPin,
  heroMap,
  heroClock,
  heroInformationCircle,
  heroExclamationCircle,
  heroBeaker,
  heroSparkles,
  heroGlobeAlt,
  heroCalendarDays,
  heroChartBar,
  heroArrowTrendingUp,
  heroPhone,
  heroChevronRight,
  heroArrowTopRightOnSquare,
  heroCheckCircle,
} from '@ng-icons/heroicons/outline';

/**
 * Venue Overview Component (formerly Visit Detail)
 *
 * Displays a venue overview with all visits to that venue:
 * - Venue info hero card (name, address, type)
 * - Visit statistics (total visits, total time, first/last visit)
 * - Visit history list showing all visits
 * - Quick actions (directions, website, share)
 */

@Component({
  selector: 'app-visit-detail',
  imports: [CommonModule, DurationPipe, ShareModalComponent, NgIconComponent, VenueMap],
  templateUrl: './visit-detail.html',
  standalone: true,
  viewProviders: [
    provideIcons({
      heroArrowLeft,
      heroShare,
      heroTrash,
      heroMapPin,
      heroMap,
      heroClock,
      heroInformationCircle,
      heroExclamationCircle,
      heroBeaker,
      heroSparkles,
      heroGlobeAlt,
      heroCalendarDays,
      heroChartBar,
      heroArrowTrendingUp,
      heroPhone,
      heroChevronRight,
      heroArrowTopRightOnSquare,
      heroCheckCircle,
    }),
  ],
})
export class VisitDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly localRepository = inject(VisitsLocalRepository);
  private readonly visitsApi = inject(VisitsApiService);
  private readonly venuesApi = inject(VenuesApiService);
  private readonly authState = inject(AuthStateService);

  @ViewChild(ShareModalComponent) shareModal?: ShareModalComponent;

  readonly venue = signal<Venue | null>(null);
  readonly visits = signal<Visit[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly nearbyVenues = signal<Venue[]>([]);
  readonly userLocation = signal<Coordinates | null>(null);
  readonly visitedVenueIds = signal<string[]>([]);

  // Statistics computed from all visits
  readonly totalVisits = computed(() => this.visits().length);

  readonly totalDuration = computed(() => {
    return this.visits().reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
  });

  readonly averageDuration = computed(() => {
    const completedVisits = this.visits().filter(v => v.duration_minutes && v.duration_minutes > 0);
    if (completedVisits.length === 0) return 0;
    const total = completedVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
    return Math.round(total / completedVisits.length);
  });

  readonly firstVisit = computed(() => {
    const sorted = [...this.visits()].sort(
      (a, b) => new Date(a.arrival_time).getTime() - new Date(b.arrival_time).getTime()
    );
    return sorted[0] || null;
  });

  readonly lastVisit = computed(() => {
    const sorted = [...this.visits()].sort(
      (a, b) => new Date(b.arrival_time).getTime() - new Date(a.arrival_time).getTime()
    );
    return sorted[0] || null;
  });

  readonly hasActiveVisit = computed(() => {
    return this.visits().some(v => v.is_active);
  });

  readonly venueWebsite = computed(() => {
    const v = this.venue();
    if (!v?.metadata) return null;
    return (v.metadata['website'] as string) || null;
  });

  readonly venuePhone = computed(() => {
    const v = this.venue();
    if (!v?.metadata) return null;
    return (v.metadata['phone'] as string) || null;
  });

  ngOnInit(): void {
    const visitId = this.route.snapshot.paramMap.get('id');
    if (visitId) {
      this.loadVenueFromVisit(visitId);
    } else {
      this.error.set('Invalid visit ID');
      this.isLoading.set(false);
    }
  }

  /**
   * Load venue and all visits from a single visit ID
   */
  private async loadVenueFromVisit(visitId: string): Promise<void> {
    try {
      // First, get the visit to find the venue_id
      const visit = await this.localRepository.getVisit(visitId);

      if (!visit) {
        this.error.set('Visit not found');
        this.isLoading.set(false);
        return;
      }

      const venueId = visit.venue_id;

      // Load venue details
      this.venuesApi.getVenue(venueId).subscribe({
        next: (venue) => {
          this.venue.set(venue);
          // Set current venue immediately so map can center on it
          this.nearbyVenues.set([venue]);
          // Then load nearby venues (will update with more venues)
          this.loadNearbyVenues(venue);
        },
        error: (err) => {
          console.error('Failed to load venue:', err);
        },
      });

      // Load ALL visits to this venue
      await this.loadAllVisitsForVenue(venueId);

      // Load user location for the map
      this.loadUserLocation();

      // Load visited venue IDs for map display
      this.loadVisitedVenueIds();

      this.isLoading.set(false);
    } catch (err) {
      console.error('Error loading venue overview:', err);
      this.error.set('Failed to load venue details');
      this.isLoading.set(false);
    }
  }

  /**
   * Load all visits for a venue (from API first, then local fallback)
   */
  private async loadAllVisitsForVenue(venueId: string): Promise<void> {
    let allVisits: Visit[] = [];

    // Try API first if authenticated
    const hasToken = !!this.authState.accessToken();
    if (hasToken) {
      try {
        const response = await firstValueFrom(this.visitsApi.getByVenueId(venueId));
        if (response.success && response.data) {
          allVisits = response.data;
        }
      } catch (error) {
        console.warn('Failed to load visits from API, falling back to local:', error);
      }
    }

    // Fallback to local if API didn't work or returned empty
    if (allVisits.length === 0) {
      allVisits = await this.localRepository.findByVenueId(venueId);
    }

    // Sort by arrival time (most recent first)
    allVisits.sort(
      (a, b) => new Date(b.arrival_time).getTime() - new Date(a.arrival_time).getTime()
    );

    this.visits.set(allVisits);
  }

  /**
   * Load nearby venues for the map
   */
  private loadNearbyVenues(currentVenue: Venue): void {
    this.venuesApi.nearby({
      latitude: currentVenue.latitude,
      longitude: currentVenue.longitude,
      radius_km: 5,
      limit: 20,
    }).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          // API returns full Venue objects with distance added
          // Cast to any to handle type mismatch between shared and API types
          const nearbyVenues = (response.data as unknown as Venue[])
            .filter(v => v.id !== currentVenue.id);
          this.nearbyVenues.set([currentVenue, ...nearbyVenues]);
        }
      },
      error: (err) => {
        console.warn('Failed to load nearby venues:', err);
        // Still show just the current venue on the map
        this.nearbyVenues.set([currentVenue]);
      },
    });
  }

  /**
   * Load user's current location
   */
  private async loadUserLocation(): Promise<void> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
      });
      this.userLocation.set({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      console.warn('Could not get user location:', err);
    }
  }

  /**
   * Load list of visited venue IDs for map display
   */
  private async loadVisitedVenueIds(): Promise<void> {
    try {
      const allVisits = await this.localRepository.findAll();
      const uniqueVenueIds = [...new Set(allVisits.map((v: Visit) => v.venue_id))];
      this.visitedVenueIds.set(uniqueVenueIds);
    } catch (err) {
      console.warn('Failed to load visited venue IDs:', err);
    }
  }

  /**
   * Format date for display
   */
  formatVisitDate(isoString: string): string {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  formatVisitTime(isoString: string): string {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  formatFullDate(isoString: string): string {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Navigate back to timeline
   */
  goBack(): void {
    this.router.navigate(['/visits']);
  }

  /**
   * Delete a specific visit
   */
  async deleteVisit(visit: Visit): Promise<void> {
    if (!confirm('Are you sure you want to delete this visit?')) {
      return;
    }

    try {
      await this.localRepository.deleteVisit(visit.id);
      // Remove from local state
      this.visits.update(visits => visits.filter(v => v.id !== visit.id));

      // If no more visits, go back to timeline
      if (this.visits().length === 0) {
        this.router.navigate(['/visits']);
      }
    } catch (err) {
      console.error('Failed to delete visit:', err);
      alert('Failed to delete visit. Please try again.');
    }
  }

  /**
   * Opens share modal with venue information
   */
  shareVenue(): void {
    const ven = this.venue();
    const lastV = this.lastVisit();

    if (!ven || !lastV || !this.shareModal) {
      console.error('Cannot share: venue or share modal not available');
      return;
    }

    this.shareModal.open({
      visitId: lastV.id,
      venueName: ven.name,
      visitDate: this.formatFullDate(lastV.arrival_time),
    });
  }

  /**
   * Open venue location in maps app
   */
  openInMaps(): void {
    const v = this.venue();
    if (!v) return;

    const lat = v.latitude;
    const lon = v.longitude;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(mapsUrl, '_blank');
  }

  /**
   * Open venue website
   */
  openWebsite(): void {
    const website = this.venueWebsite();
    if (!website) return;

    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  }
}
