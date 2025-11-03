import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api.client';
import { Venue, ApiResponse, ProximitySearchParams, VenueWithDistance } from '@blastoise/shared';

@Injectable({
  providedIn: 'root'
})
export class VenuesApiService {
  constructor(private apiClient: ApiClient) {}

  getById(venueId: string): Observable<ApiResponse<Venue>> {
    return this.apiClient.get<Venue>(`/venues/${venueId}`);
  }

  /**
   * Get venue (alias for getById that returns unwrapped venue)
   */
  getVenue(venueId: string): Observable<Venue> {
    return new Observable((observer) => {
      this.getById(venueId).subscribe({
        next: (response) => {
          if (response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(`Venue ${venueId} not found`));
          }
        },
        error: (err) => observer.error(err),
      });
    });
  }

  search(query: string): Observable<ApiResponse<Venue[]>> {
    return this.apiClient.get<Venue[]>(`/venues/search?q=${encodeURIComponent(query)}`);
  }

  nearby(params: ProximitySearchParams): Observable<ApiResponse<VenueWithDistance[]>> {
    const queryParams = new URLSearchParams({
      lat: params.latitude.toString(),
      lng: params.longitude.toString(),
      radius: params.radius_km.toString(),
      ...(params.venue_type && { type: params.venue_type }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    return this.apiClient.get<VenueWithDistance[]>(`/venues/nearby?${queryParams}`);
  }
}
