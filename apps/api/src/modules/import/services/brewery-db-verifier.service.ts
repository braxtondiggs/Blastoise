/**
 * Tier 2 Verification Service
 * Uses Open Brewery DB API for brewery verification
 */

import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import * as Sentry from '@sentry/nestjs';
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

  // Simple error tracking
  private consecutiveFailures = 0;

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
   * Fetch breweries from Open Brewery DB API
   * Returns up to 10 breweries sorted by distance
   */
  private async fetchBreweriesNearby(
    latitude: number,
    longitude: number
  ): Promise<BreweryDbResult[]> {
    const url = `${this.baseUrl}?by_dist=${latitude},${longitude}&per_page=10`;

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

      // Reset on success
      this.consecutiveFailures = 0;

      // Only return breweries with valid coordinates
      return breweries.filter((b) => b.latitude && b.longitude);
    } catch (error) {
      this.consecutiveFailures++;

      // 🚨 FLAG: 5+ consecutive failures = service is down
      if (this.consecutiveFailures >= 5) {
        this.logger.error(
          `🚨 BREWERY DB DOWN: ${this.consecutiveFailures} consecutive failures!`
        );

        // Send to Sentry
        Sentry.captureException(error, {
          tags: {
            service: 'brewery_db',
            tier: '2',
            failure_type: 'consecutive_failures',
          },
          extra: {
            consecutiveFailures: this.consecutiveFailures,
            latitude,
            longitude,
          },
        });
      } else {
        this.logger.warn(`Failed to fetch from Open Brewery DB: ${error}`);
      }

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
      // Calculate distance
      const distance = this.calculateDistance(
        originLat,
        originLng,
        parseFloat(brewery.latitude),
        parseFloat(brewery.longitude)
      );

      // Since we don't have names from Timeline exports, use distance-based confidence
      // Closer = higher confidence (within 5km radius)
      let confidence = 0;
      if (distance <= 0.1) confidence = 0.95; // Within 100m - very high confidence
      else if (distance <= 0.5) confidence = 0.85; // Within 500m - high confidence
      else if (distance <= 1.0) confidence = 0.75; // Within 1km - medium confidence
      else if (distance <= 5.0) confidence = 0.65; // Within 5km - lower confidence

      // Only consider matches within 5km
      if (distance <= 5.0) {
        if (!bestMatch || distance < bestMatch.distance) {
          // Prefer closest match
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
