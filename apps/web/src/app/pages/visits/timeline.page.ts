import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from '@blastoise/features-visits';
import type { Venue, Coordinates } from '@blastoise/shared';
import { VisitsLocalRepository } from '@blastoise/data';
import { provideIcons } from '@ng-icons/core';
import { heroChevronUp, heroChevronDown } from '@ng-icons/heroicons/outline';
import type { LatLngBounds } from 'leaflet';

/**
 * Timeline Page
 *
 * Main page that integrates:
 * - Venue map at the top for discovering nearby breweries/wineries
 * - Timeline component below for displaying user's visit history
 */

@Component({
  selector: 'app-timeline-page',
  imports: [CommonModule, TimelineComponent],
  viewProviders: [provideIcons({ heroChevronUp, heroChevronDown })],
  template: `
    <div class="min-h-screen bg-base-100">
      <!-- Timeline Section -->
      <div class="w-full max-w-4xl px-4 mx-auto">
        <app-timeline />
      </div>
      <!-- Collapsible Map Section -->
      <!--<div class="border-b border-base-300">
        <div class="w-full max-w-4xl px-4 mx-auto">
          <button
            type="button"
            class="flex items-center justify-between w-full py-3 text-left hover:opacity-80"
            (click)="toggleMapExpanded()"
            [attr.aria-expanded]="isMapExpanded()"
            aria-controls="venue-map-section"
          >
            <span class="text-lg font-semibold">Discover Nearby Venues</span>
            <ng-icon [name]="isMapExpanded() ? 'heroChevronUp' : 'heroChevronDown'" size="20" />
          </button>
        </div>

        @if (isMapExpanded()) {
          <div id="venue-map-section" class="relative h-64 sm:h-80 md:h-96 z-0 max-w-4xl mx-auto">
            @if (mapErrorMessage()) {
              <div class="absolute inset-0 flex items-center justify-center bg-base-200">
                <div class="alert alert-warning max-w-md mx-4">
                  <span>{{ mapErrorMessage() }}</span>
                </div>
              </div>
            }

            <app-venue-map
              [venues]="venues()"
              [visitedVenueIds]="visitedVenueIds()"
              [userLocation]="userLocation()"
              (venueSelected)="onVenueSelected($event)"
              (boundsChanged)="onMapBoundsChanged($event)"
            />
          </div>
        }
      </div>-->
    </div>
  `,
  standalone: true,
})
export class TimelinePage implements OnInit {
  // private readonly venuesApi = inject(VenuesApiService);
  private readonly visitsRepo = inject(VisitsLocalRepository);

  // Map state
  readonly isMapExpanded = signal(true);
  readonly venues = signal<Venue[]>([]);
  readonly visitedVenueIds = signal<string[]>([]);
  readonly userLocation = signal<Coordinates | null>(null);
  readonly mapErrorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadUserLocation();
    await this.loadVisitedVenues();
  }

  toggleMapExpanded(): void {
    this.isMapExpanded.update((expanded) => !expanded);
  }

  private async loadUserLocation(): Promise<void> {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.userLocation.set({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            // this.loadNearbyVenues();
          },
          (error) => {
            console.error('Failed to get user location:', error);
            // Default to Portland, OR
            this.userLocation.set({
              latitude: 45.5231,
              longitude: -122.6765,
            });
            // this.loadNearbyVenues();
          }
        );
      }
    } catch (error) {
      console.error('Geolocation error:', error);
    }
  }

  private async loadVisitedVenues(): Promise<void> {
    try {
      const visits = await this.visitsRepo.getVisits({});
      const uniqueVenueIds = [...new Set(visits.map((v) => v.venue_id))];
      this.visitedVenueIds.set(uniqueVenueIds);
    } catch (error) {
      console.error('Failed to load visited venues:', error);
    }
  }

  /*private loadNearbyVenues(): void {
    const location = this.userLocation();
    if (!location) {
      return;
    }

    this.venuesApi
      .nearby({
        latitude: location.latitude,
        longitude: location.longitude,
        radius_km: 5,
      })
      .subscribe({
        next: (response: ApiResponse<VenueWithDistance[]>) => {
          if (response.success && response.data) {
            // Convert VenueWithDistance to Venue format for the map component
            const venues: Venue[] = response.data.map((v) => ({
              id: v.venue_id,
              name: v.name,
              venue_type: v.venue_type,
              latitude: v.coordinates.latitude,
              longitude: v.coordinates.longitude,
              city: v.city,
              state: v.state,
              source: 'osm' as const,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
            this.venues.set(venues);
          }
        },
        error: (error: Error) => {
          console.error('Failed to load nearby venues:', error);
          this.mapErrorMessage.set('Unable to load nearby venues');
        },
      });
  }*/

  onVenueSelected(venue: Venue): void {
    console.log('Venue selected:', venue);
    // Could navigate to venue detail or show a modal
  }

  onMapBoundsChanged(bounds: LatLngBounds): void {
    // Could load venues based on current viewport
    console.log('Map bounds changed:', bounds);
  }
}
