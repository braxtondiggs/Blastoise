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

  search(query: string): Observable<ApiResponse<Venue[]>> {
    return this.apiClient.get<Venue[]>(`/venues/search?q=${encodeURIComponent(query)}`);
  }

  nearby(params: ProximitySearchParams): Observable<ApiResponse<VenueWithDistance[]>> {
    const queryParams = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
      radius: params.radius_km.toString(),
      ...(params.venue_type && { type: params.venue_type }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    return this.apiClient.get<VenueWithDistance[]>(`/venues/nearby?${queryParams}`);
  }
}
