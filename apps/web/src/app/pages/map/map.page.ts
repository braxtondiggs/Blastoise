/**
 * Map Page
 *
 * Integrates the venue map component with user location and visited venues tracking
 */

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VenueMap } from '@blastoise/features';
import type { Venue, Coordinates } from '@blastoise/shared';
import { VenuesApiService } from '@blastoise/data';
import { VisitsLocalRepository } from '@blastoise/data';

@Component({
  selector: 'app-map-page',
  imports: [CommonModule, VenueMap],
  template: `
    <div class="flex flex-col h-full">
      <div class="p-4 bg-base-200">
        <h1 class="text-2xl font-bold">Discover Venues</h1>
      </div>

      @if (errorMessage()) {
      <div class="alert alert-error m-4">
        <span>{{ errorMessage() }}</span>
      </div>
      }

      <div class="flex-1 relative">
        <app-venue-map
          [venues]="venues()"
          [visitedVenueIds]="visitedVenueIds()"
          [userLocation]="userLocation()"
          (venueSelected)="onVenueSelected($event)"
          (boundsChanged)="onMapBoundsChanged($event)"
        />
      </div>
    </div>
  `,
  standalone: true,
})
export class MapPage implements OnInit {
  private readonly venuesApi = inject(VenuesApiService);
  private readonly visitsRepo = inject(VisitsLocalRepository);

  readonly venues = signal<Venue[]>([]);
  readonly visitedVenueIds = signal<string[]>([]);
  readonly userLocation = signal<Coordinates | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadUserLocation();
    await this.loadVisitedVenues();
    await this.loadNearbyVenues();
  }

  private async loadUserLocation(): Promise<void> {
    try {
      // Get user's current location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.userLocation.set({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Failed to get user location:', error);
            // Default to Portland, OR
            this.userLocation.set({
              latitude: 45.5231,
              longitude: -122.6765,
            });
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

  private async loadNearbyVenues(): Promise<void> {
    const location = this.userLocation();
    if (!location) {
      return;
    }

    try {
      // Load venues near user location (5km radius)
      this.venuesApi
        .nearby({
          latitude: location.latitude,
          longitude: location.longitude,
          radius_km: 5,
        })
        .subscribe({
          next: (response: any) => {
            if (response.success && response.data) {
              this.venues.set(response.data);
            }
          },
          error: (error: any) => {
            console.error('Failed to load nearby venues:', error);
            this.errorMessage.set('Failed to load nearby venues');
          },
        });
    } catch (error) {
      console.error('Error loading nearby venues:', error);
      this.errorMessage.set('Error loading nearby venues');
    }
  }

  onVenueSelected(venue: Venue): void {
    console.log('Venue selected:', venue);
    // Navigate to venue detail (T148 integration)
    // this.router.navigate(['/venues', venue.id]);
  }

  onMapBoundsChanged(bounds: any): void {
    // Load venues based on viewport
    // Could fetch venues for the visible map area
    console.log('Map bounds changed:', bounds);
  }
}
