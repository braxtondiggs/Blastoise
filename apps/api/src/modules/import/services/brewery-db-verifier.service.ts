/**
 * Tier 2 Verification Service
 * Uses Open Brewery DB API for brewery verification
 */

import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import * as fuzzball from 'fuzzball';
import { VerificationCacheService } from './verification-cache.service';

export interface BreweryDbResult {
  id: string;
  name: string;
  brewery_type: string;
  address_1?: string;
  city?: string;
  state_province?: string;
  latitude: string;
  longitude: string;
  website_url?: string;
}

export interface Tier2VerificationResult {
  verified: boolean;
  confidence: number;
  venue_type?: 'brewery' | 'winery';
  matched_brewery?: {
    id: string;
    name: string;
    type: string;
    distance_km: number;
  };
}

@Injectable()
export class BreweryDbVerifierService {
  private readonly logger = new Logger(BreweryDbVerifierService.name);
  private readonly limiter: Bottleneck;
  private readonly baseUrl = 'https://api.openbrewerydb.org/v1/breweries';

  constructor(
    private readonly cacheService: VerificationCacheService
  ) {
    // Rate limiter - 100 requests per hour
    this.limiter = new Bottleneck({
      reservoir: 100, // 100 requests
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour in ms
      maxConcurrent: 5,
      minTime: 600, // 600ms between requests (100 req/hour)
    });

    this.logger.log('BreweryDbVerifierService initialized with 100 req/hour rate limit');
  }

  /**
   * Search Open Brewery DB by location
   * Returns nearby breweries within ~25km radius
   */
  async searchNearby(
    placeName: string,
    latitude: number,
    longitude: number
  ): Promise<Tier2VerificationResult> {
    try {
      // Check cache first (30-day TTL)
      const cached = await this.cacheService.getTier2Result(placeName, latitude, longitude);
      if (cached) {
        this.logger.debug(`Tier 2 cache hit for "${placeName}"`);
        return cached as Tier2VerificationResult;
      }

      this.logger.debug(`Tier 2 API call for "${placeName}" at ${latitude},${longitude}`);

      // Rate-limited API call
      const breweries = await this.limiter.schedule(() =>
        this.fetchBreweriesNearby(latitude, longitude)
      );

      if (!breweries || breweries.length === 0) {
        // Don't cache failed verifications - place might get added to DB later
        return { verified: false, confidence: 0 };
      }

      // Find best match using fuzzy name matching
      const bestMatch = this.findBestMatch(placeName, latitude, longitude, breweries);

      if (bestMatch) {
        const result: Tier2VerificationResult = {
          verified: true,
          confidence: bestMatch.confidence,
          venue_type: 'brewery', // Open Brewery DB only has breweries
          matched_brewery: {
            id: bestMatch.brewery.id,
            name: bestMatch.brewery.name,
            type: bestMatch.brewery.brewery_type,
            distance_km: bestMatch.distance,
          },
        };

        // Cache successful verification (30 days)
        // TypeScript type guard: we know venue_type exists when verified=true
        await this.cacheService.cacheTier2Result(placeName, latitude, longitude, {
          verified: result.verified,
          confidence: result.confidence,
          venue_type: result.venue_type as 'brewery' | 'winery',
        });

        this.logger.log(
          `Tier 2 verified "${placeName}" → "${bestMatch.brewery.name}" (${bestMatch.confidence.toFixed(2)} confidence, ${bestMatch.distance.toFixed(2)}km away)`
        );

        return result;
      }

      // No match found - don't cache failed verifications
      return { verified: false, confidence: 0 };
    } catch (error) {
      this.logger.error(`Tier 2 verification failed for "${placeName}": ${error}`);
      return { verified: false, confidence: 0 };
    }
  }

  /**
   * Discover breweries near a location (for venue discovery, not verification)
   * Uses the same rate limiter as verification
   * Returns all breweries found near the location (up to perPage limit)
   */
  async discoverNearby(
    latitude: number,
    longitude: number,
    perPage = 20
  ): Promise<BreweryDbResult[]> {
    try {
      this.logger.debug(`Discovering breweries near (${latitude}, ${longitude})`);

      // Rate-limited API call
      const breweries = await this.limiter.schedule(() =>
        this.fetchBreweriesNearby(latitude, longitude, perPage)
      );

      this.logger.log(`Discovered ${breweries.length} breweries near (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);

      return breweries;
    } catch (error) {
      this.logger.error(`Failed to discover breweries: ${error}`);
      return [];
    }
  }

  /**
   * Fetch breweries from Open Brewery DB API
   * Returns up to perPage breweries sorted by distance
   */
  private async fetchBreweriesNearby(
    latitude: number,
    longitude: number,
    perPage = 10
  ): Promise<BreweryDbResult[]> {
    const url = `${this.baseUrl}?by_dist=${latitude},${longitude}&per_page=${perPage}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Blastoise/1.0 (Brewery Visit Tracker; +https://blastoise.app)',
        },
      });

      if (!response.ok) {
        throw new Error(`Open Brewery DB API error: ${response.status} ${response.statusText}`);
      }

      const breweries: BreweryDbResult[] = await response.json();

      // Only return breweries with valid coordinates
      return breweries.filter((b) => b.latitude && b.longitude);
    } catch (error) {
      this.logger.error(`Failed to fetch from Open Brewery DB: ${error}`);
      return [];
    }
  }

  /**
   * Find best matching brewery using fuzzy name matching and proximity
   * Returns null if no match meets the 80% threshold
   */
  private findBestMatch(
    placeName: string,
    originLat: number,
    originLng: number,
    breweries: BreweryDbResult[]
  ): {
    brewery: BreweryDbResult;
    confidence: number;
    distance: number;
  } | null {
    let bestMatch: { brewery: BreweryDbResult; confidence: number; distance: number } | null =
      null;

    for (const brewery of breweries) {
      // Fuzzy name matching (0-100 score)
      const nameSimilarity = fuzzball.ratio(placeName.toLowerCase(), brewery.name.toLowerCase());
      const confidence = nameSimilarity / 100; // Convert to 0-1

      // Calculate distance
      const distance = this.calculateDistance(
        originLat,
        originLng,
        parseFloat(brewery.latitude),
        parseFloat(brewery.longitude)
      );

      // Require 80% name similarity and within 5km
      if (confidence >= 0.8 && distance <= 5.0) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { brewery, confidence, distance };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
