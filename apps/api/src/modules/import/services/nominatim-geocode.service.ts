/**
 * Nominatim Reverse Geocoding Service
 * Uses OpenStreetMap Nominatim API to convert coordinates to addresses
 * FREE service with rate limiting (1 req/sec per Nominatim Usage Policy)
 */

import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import * as Sentry from '@sentry/nestjs';
import { VerificationCacheService } from './verification-cache.service';

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface NominatimResult {
  found: boolean;
  formatted_address?: string;
  address?: NominatimAddress;
  lat?: string;
  lon?: string;
}

interface NominatimResponse {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
}

@Injectable()
export class NominatimGeocodeService {
  private readonly logger = new Logger(NominatimGeocodeService.name);
  private readonly limiter: Bottleneck;
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/reverse';

  // Simple error tracking
  private consecutiveFailures = 0;

  constructor(private readonly cacheService: VerificationCacheService) {
    // Rate limiter - 1 request per second (Nominatim's requirement)
    this.limiter = new Bottleneck({
      reservoir: 60, // 60 requests
      reservoirRefreshAmount: 60,
      reservoirRefreshInterval: 60 * 1000, // per minute
      maxConcurrent: 1,
      minTime: 1000, // 1 second between requests
    });

    this.logger.log('Nominatim reverse geocoding service initialized');
  }

  /**
   * Reverse geocode coordinates to address
   * Searches for nearest address within ~10m precision
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<NominatimResult> {
    try {
      // Check cache first
      const cacheKey = `nominatim:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      const cached = await this.cacheService.get<NominatimResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for Nominatim: ${cacheKey}`);
        this.consecutiveFailures = 0; // Reset on success
        return cached;
      }

      // Build request URL
      const url = new URL(this.baseUrl);
      url.searchParams.set('format', 'json');
      url.searchParams.set('lat', latitude.toString());
      url.searchParams.set('lon', longitude.toString());
      url.searchParams.set('zoom', '18'); // Building/address level precision
      url.searchParams.set('addressdetails', '1'); // Include structured address

      // Execute rate-limited request
      const response = await this.limiter.schedule(() =>
        this.executeRequest(url.toString())
      );

      // Parse results
      const result = this.parseResponse(response);

      // Cache the result (30 day TTL - addresses rarely change)
      if (result.found) {
        await this.cacheService.set(cacheKey, result, 30 * 24 * 60 * 60);
        this.logger.log(
          `Nominatim reverse geocoded: ${result.formatted_address}`
        );
        this.consecutiveFailures = 0; // Reset on success
      } else {
        // Cache negative results (1 day TTL)
        await this.cacheService.set(cacheKey, result, 24 * 60 * 60);
      }

      return result;
    } catch (error) {
      this.consecutiveFailures++;

      // 🚨 FLAG: 5+ consecutive failures = service is down
      if (this.consecutiveFailures >= 5) {
        this.logger.error(
          `🚨 NOMINATIM DOWN: ${this.consecutiveFailures} consecutive failures!`
        );

        // Send to Sentry for alerting
        Sentry.captureException(error, {
          tags: {
            service: 'nominatim',
            tier: '2.5',
            failure_type: 'consecutive_failures',
          },
          extra: {
            consecutiveFailures: this.consecutiveFailures,
            latitude,
            longitude,
          },
        });
      } else {
        this.logger.warn(`Nominatim error: ${error}`);
      }

      return { found: false };
    }
  }

  /**
   * Execute HTTP request to Nominatim API
   * IMPORTANT: Must include User-Agent header per Nominatim Usage Policy
   */
  private async executeRequest(url: string): Promise<NominatimResponse> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Blastoise-Import/1.0 (https://github.com/braxtondiggs/Blastoise)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Parse Nominatim API response
   */
  private parseResponse(response: NominatimResponse): NominatimResult {
    if (response.error || !response.display_name) {
      this.logger.debug('Nominatim: No address found');
      return { found: false };
    }

    return {
      found: true,
      formatted_address: response.display_name,
      address: response.address,
      lat: response.lat,
      lon: response.lon,
    };
  }
}
