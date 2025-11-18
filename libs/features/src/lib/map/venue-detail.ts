import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type { Venue, Visit } from '@blastoise/shared';
import { VisitsLocalRepository } from '@blastoise/data';

/**
 * Detailed view of a venue with:
 * - Venue name, type, and full address
 * - Map showing venue location
 * - Visit history for this venue
 * - Distance from user
 * - Navigation button to open in maps app
 * - Quick add visit button
 */
@Component({
  selector: 'app-venue-detail',
  imports: [CommonModule],
  templateUrl: './venue-detail.html',
  standalone: true,
})
export class VenueDetail implements OnInit {
  private readonly router = inject(Router);
  private readonly visitsRepo = inject(VisitsLocalRepository);

  // Inputs
  @Input({ required: true }) venue!: Venue;
  @Input() distance: number | null = null;
  @Input() userLocation: { latitude: number; longitude: number } | null = null;

  // Outputs
  @Output() navigate = new EventEmitter<Venue>();
  @Output() addVisit = new EventEmitter<Venue>();
  @Output() close = new EventEmitter<void>();

  // Signals
  readonly visits = signal<Visit[]>([]);
  readonly isLoadingVisits = signal(false);

  // Computed
  readonly hasVisits = computed(() => this.visits().length > 0);
  readonly visitCount = computed(() => this.visits().length);
  readonly lastVisit = computed(() => {
    const sorted = [...this.visits()].sort(
      (a, b) =>
        new Date(b.arrival_time).getTime() - new Date(a.arrival_time).getTime()
    );
    return sorted[0] || null;
  });

  ngOnInit(): void {
    this.loadVenueVisits();
  }

  /**
   * Load visit history for this venue
   */
  private async loadVenueVisits(): Promise<void> {
    try {
      this.isLoadingVisits.set(true);
      const allVisits = await this.visitsRepo.findAll();
      const venueVisits = allVisits.filter((v) => v.venue_id === this.venue.id);
      this.visits.set(venueVisits);
    } catch (error) {
      console.error('Failed to load venue visits:', error);
    } finally {
      this.isLoadingVisits.set(false);
    }
  }

  /**
   * Get formatted distance
   */
  getFormattedDistance(): string {
    if (!this.distance) return '';

    if (this.distance < 1) {
      return `${Math.round(this.distance * 1000)}m away`;
    }
    return `${this.distance.toFixed(1)}km away`;
  }

  /**
   * Get venue type label
   */
  getVenueTypeLabel(): string {
    return this.venue.venue_type === 'brewery' ? 'Brewery' : 'Winery';
  }

  /**
   * Get venue icon
   */
  getVenueIcon(): string {
    return this.venue.venue_type === 'brewery' ? '🍺' : '🍷';
  }

  /**
   * Open venue in navigation app (Google Maps/Apple Maps)
   */
  openInMaps(): void {
    this.navigate.emit(this.venue);

    const latitude = this.venue.latitude;
    const longitude = this.venue.longitude;
    const label = encodeURIComponent(this.venue.name);

    // Detect platform and open appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let url: string;

    if (isIOS) {
      // Apple Maps
      url = `maps://maps.apple.com/?q=${label}&ll=${latitude},${longitude}`;
    } else if (isAndroid) {
      // Google Maps
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    } else {
      // Web fallback - Google Maps
      url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }

    window.open(url, '_blank');
  }

  /**
   * Quick add visit for this venue
   */
  onAddVisit(): void {
    this.addVisit.emit(this.venue);
  }

  /**
   * View full visit history
   */
  viewVisitHistory(): void {
    this.router.navigate(['/visits'], {
      queryParams: { venue: this.venue.id },
    });
  }

  /**
   * Close detail view
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Format visit date
   */
  formatVisitDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format visit duration
   */
  formatDuration(minutes: number | undefined | null): string {
    if (!minutes) return 'Unknown duration';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Get full address string
   */
  getFullAddress(): string {
    const parts = [
      this.venue.address,
      this.venue.city,
      this.venue.state_province,
      this.venue.postal_code
    ].filter(Boolean);
    return parts.join(', ');
  }

  /**
   * Copy address to clipboard
   */
  async copyAddress(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getFullAddress());
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }

  /**
   * Share venue (Web Share API)
   */
  async shareVenue(): Promise<void> {
    if (!navigator.share) {
      console.warn('Web Share API not supported');
      return;
    }

    try {
      await navigator.share({
        title: this.venue.name,
        text: `Check out ${this.venue.name} - ${this.getVenueTypeLabel()}`,
        url: window.location.href,
      });
    } catch (error) {
      // User cancelled share
      console.log('Share cancelled:', error);
    }
  }
}
