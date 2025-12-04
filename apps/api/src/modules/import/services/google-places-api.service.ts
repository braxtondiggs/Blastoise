/**
 * Google Places API Service
 * Looks up Place Details by Place ID for verification/enrichment
 * ONLY used to verify/enhance low-confidence matches from Tier 1/2
 * Cost: $0.017 per request (Basic Data fields)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bottleneck from 'bottleneck';
import { VerificationCacheService } from './verification-cache.service';

export interface GooglePlacesResult {
  found: boolean;
  name?: string;
  formatted_address?: string;
  types?: string[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id?: string;
  // Additional Basic Data fields
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string; // Google Maps URL
  business_status?: string; // OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  rating?: number; // 1.0 to 5.0
  user_ratings_total?: number;
  price_level?: number; // 0 to 4
  vicinity?: string; // Simplified address
}

interface GooglePlacesResponse {
  result?: {
    name: string;
    formatted_address: string;
    types: string[];
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    place_id: string;
    // Additional Basic Data fields
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    url?: string;
    business_status?: string;
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
    };
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    vicinity?: string;
  };
  status: string;
  error_message?: string;
}

@Injectable()
export class GooglePlacesApiService {
  private readonly logger = new Logger(GooglePlacesApiService.name);
  private readonly limiter: Bottleneck;
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';

  constructor(
    private readonly cacheService: VerificationCacheService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');

    // Rate limiter - 100 requests per second (Google's limit)
    this.limiter = new Bottleneck({
      reservoir: 100,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 1000, // per second
      maxConcurrent: 10,
      minTime: 10, // 10ms between requests
    });

    if (this.apiKey) {
      this.logger.log('Google Places API configured and ready');
    } else {
      this.logger.warn(
        'Google Places API key not configured - Tier 3 verification disabled'
      );
    }
  }

  /**
   * Check if Google Places API is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Look up place details by Place ID
   * Only requests Basic Data fields to minimize cost ($0.017/request)
   */
  async lookupPlaceId(placeId: string): Promise<GooglePlacesResult> {
    if (!this.apiKey) {
      this.logger.warn('Google Places API key not configured');
      return { found: false };
    }

    try {
      // Check cache first
      const cacheKey = `google-place:${placeId}`;
      const cached = await this.cacheService.get<GooglePlacesResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for Google Place ID: ${placeId}`);
        return cached;
      }

      // Build request URL with ALL Basic Data fields (same $0.017 cost)
      // Basic Data fields include: address, business info, contact, atmosphere
      const url = new URL(this.baseUrl);
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set(
        'fields',
        [
          // Core identification
          'place_id',
          'name',
          'types',
          'business_status',
          // Location data
          'geometry/location',
          'formatted_address',
          'address_components',
          'vicinity',
          // Contact information
          'formatted_phone_number',
          'international_phone_number',
          'website',
          'url',
          // Atmosphere/ratings
          'rating',
          'user_ratings_total',
          'price_level',
          'opening_hours',
        ].join(',')
      );

      // Execute rate-limited request
      const response = await this.limiter.schedule(() =>
        this.executeRequest(url.toString())
      );

      // Parse result
      const result = this.parseResponse(response);

      // Cache the result (7 days TTL for Place IDs - they rarely change)
      if (result.found) {
        await this.cacheService.set(cacheKey, result, 7 * 24 * 60 * 60);
        this.logger.log(
          `Google Places API lookup: ${result.name} (${placeId})`
        );
      } else {
        // Cache negative results (1 day TTL)
        await this.cacheService.set(cacheKey, result, 24 * 60 * 60);
      }

      return result;
    } catch (error) {
      this.logger.error(`Google Places API error for ${placeId}: ${error}`);
      return { found: false };
    }
  }

  /**
   * Execute HTTP request to Google Places API
   */
  private async executeRequest(url: string): Promise<GooglePlacesResponse> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Google Places API HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Parse Google Places API response
   */
  private parseResponse(response: GooglePlacesResponse): GooglePlacesResult {
    if (response.status !== 'OK' || !response.result) {
      if (response.status === 'ZERO_RESULTS') {
        this.logger.debug('Google Places API: No results found');
      } else {
        this.logger.warn(
          `Google Places API status: ${response.status}${
            response.error_message ? ` - ${response.error_message}` : ''
          }`
        );
      }
      return { found: false };
    }

    const result = response.result;

    return {
      found: true,
      name: result.name,
      formatted_address: result.formatted_address,
      types: result.types,
      geometry: result.geometry,
      place_id: result.place_id,
      // Additional Basic Data fields
      address_components: result.address_components,
      formatted_phone_number: result.formatted_phone_number,
      international_phone_number: result.international_phone_number,
      website: result.website,
      url: result.url,
      business_status: result.business_status,
      opening_hours: result.opening_hours,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      price_level: result.price_level,
      vicinity: result.vicinity,
    };
  }

  /**
   * Check if place types indicate a brewery or winery
   * Used to verify low-confidence matches from Tier 1/2
   */
  isBreweryOrWinery(types: string[]): boolean {
    const breweryTypes = [
      'bar',
      'night_club',
      'restaurant',
      'food',
      'establishment',
      'point_of_interest',
    ];

    // Must have at least one relevant type
    return types.some((type) => breweryTypes.includes(type));
  }
}
