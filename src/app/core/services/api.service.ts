import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BrewerySearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
}

export interface GeoCodioResponse {
  address: string;
}

export interface ImportResponse {
  msg: string;
  status: boolean;
  candidates: Array<{ name: string }>;
}

export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  source?: string;
}

export interface LocationUpdateResponse {
  success: boolean;
  locationId?: string;
  msg: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Search for breweries by name
   */
  searchBreweries(breweryName: string): Observable<BrewerySearchResult[]> {
    return this.http.post<BrewerySearchResult[]>(
      `${this.baseUrl}/brewery`,
      { brewery: encodeURIComponent(breweryName) }
    );
  }

  /**
   * Get address from coordinates using Geocodio
   */
  getAddressFromLocation(latitude: number, longitude: number): Observable<GeoCodioResponse> {
    return this.http.post<GeoCodioResponse>(
      `${this.baseUrl}/geocodio`,
      { location: `${latitude},${longitude}` }
    );
  }

  /**
   * Import location data
   */
  importLocation(address: string, location: string): Observable<ImportResponse> {
    return this.http.post<ImportResponse>(
      `${this.baseUrl}/import`,
      { address, location }
    );
  }

  /**
   * Send notification (for reviews)
   */
  sendNotification(data: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/notification`,
      data
    );
  }

  /**
   * Send background location update
   */
  sendLocationUpdate(locationData: LocationUpdateRequest): Observable<LocationUpdateResponse> {
    return this.http.post<LocationUpdateResponse>(
      `${this.baseUrl}/location-update`,
      locationData
    );
  }
}
