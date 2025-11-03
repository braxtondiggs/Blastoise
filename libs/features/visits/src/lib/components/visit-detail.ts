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
import { Visit, Venue } from '@blastoise/shared';
import { VisitsLocalRepository } from '@blastoise/data';
import { VenuesApiService } from '@blastoise/data';
import { DurationPipe } from '@blastoise/ui';
import { ShareModalComponent } from '@blastoise/features-sharing';

/**
 * Visit Detail Component (T122)
 *
 * Displays detailed information about a single visit:
 * - Venue name, address, type
 * - Arrival and departure times
 * - Duration
 * - Map thumbnail/link
 * - Share button (User Story 4)
 * - Delete option
 *
 * User Story 2: Visual Timeline of Visits
 */

@Component({
  selector: 'app-visit-detail',
  imports: [CommonModule, DurationPipe, ShareModalComponent],
  templateUrl: './visit-detail.html',
  standalone: true,
})
export class VisitDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly localRepository = inject(VisitsLocalRepository);
  private readonly venuesApi = inject(VenuesApiService);

  @ViewChild(ShareModalComponent) shareModal?: ShareModalComponent;

  readonly visit = signal<Visit | null>(null);
  readonly venue = signal<Venue | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formattedArrival = computed(() => {
    const v = this.visit();
    if (!v) return '';
    return this.formatDateTime(v.arrival_time);
  });

  readonly formattedDeparture = computed(() => {
    const v = this.visit();
    if (!v || !v.departure_time) return '';
    return this.formatDateTime(v.departure_time);
  });

  readonly isActive = computed(() => {
    const v = this.visit();
    return v?.is_active ?? false;
  });

  ngOnInit(): void {
    const visitId = this.route.snapshot.paramMap.get('id');
    if (visitId) {
      this.loadVisit(visitId);
    } else {
      this.error.set('Invalid visit ID');
      this.isLoading.set(false);
    }
  }

  private async loadVisit(visitId: string): Promise<void> {
    try {
      const visit = await this.localRepository.getVisit(visitId);

      if (!visit) {
        this.error.set('Visit not found');
        this.isLoading.set(false);
        return;
      }

      this.visit.set(visit);

      // Load venue details
      this.venuesApi.getVenue(visit.venue_id).subscribe({
        next: (venue) => {
          this.venue.set(venue);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load venue:', err);
          this.isLoading.set(false);
          // Continue showing visit even if venue load fails
        },
      });
    } catch (err) {
      console.error('Error loading visit:', err);
      this.error.set('Failed to load visit details');
      this.isLoading.set(false);
    }
  }

  private formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  }

  /**
   * Navigate back to timeline
   */
  goBack(): void {
    this.router.navigate(['/timeline']);
  }

  /**
   * Delete this visit
   */
  async deleteVisit(): Promise<void> {
    const v = this.visit();
    if (!v) return;

    if (!confirm('Are you sure you want to delete this visit?')) {
      return;
    }

    try {
      await this.localRepository.deleteVisit(v.id);
      this.router.navigate(['/timeline']);
    } catch (err) {
      console.error('Failed to delete visit:', err);
      alert('Failed to delete visit. Please try again.');
    }
  }

  /**
   * T201: Share this visit (User Story 4)
   * Opens share modal with visit information
   */
  shareVisit(): void {
    const v = this.visit();
    const ven = this.venue();

    if (!v || !ven || !this.shareModal) {
      console.error('Cannot share: visit, venue, or share modal not available');
      return;
    }

    // Open share modal with visit config
    this.shareModal.open({
      visitId: v.id,
      venueName: ven.name,
      visitDate: this.formatDateTime(v.arrival_time),
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

    // Universal maps URL that works across platforms
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(mapsUrl, '_blank');
  }
}
