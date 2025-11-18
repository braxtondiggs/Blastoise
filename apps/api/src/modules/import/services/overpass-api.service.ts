/**
 * Overpass API Service
 * Queries OpenStreetMap for breweries and wineries by coordinates
 * FREE service with rate limiting (1 req/sec to be respectful)
 */

import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { VerificationCacheService } from './verification-cache.service';

export interface OverpassResult {
  found: boolean;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  tags?: {
    craft?: string;
    amenity?: string;
    brewery?: string;
    [key: string]: string | undefined;
  };
  distance_meters?: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: {
    name?: string;
    craft?: string;
    amenity?: string;
    brewery?: string;
    'addr:housenumber'?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    'addr:state'?: string;
    'addr:postcode'?: string;
    [key: string]: string | undefined;
  };
}

interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

@Injectable()
export class OverpassApiService {
  private readonly logger = new Logger(OverpassApiService.name);
  private readonly limiter: Bottleneck;
  private readonly baseUrl = 'https://overpass-api.de/api/interpreter';

  constructor(private readonly cacheService: VerificationCacheService) {
    // Rate limiter - 1 request per second (conservative for Overpass API)
    this.limiter = new Bottleneck({
      reservoir: 60, // 60 requests
      reservoirRefreshAmount: 60,
      reservoirRefreshInterval: 60 * 1000, // per minute
      maxConcurrent: 1,
      minTime: 1000, // 1 second between requests
    });
  }

  /**
   * Search for breweries/wineries near coordinates
   * Searches within 100m radius
   */
  async searchByCoordinates(
    latitude: number,
    longitude: number,
    radiusMeters = 100
  ): Promise<OverpassResult> {
    try {
      // Check cache first
      const cacheKey = `overpass:${latitude.toFixed(6)},${longitude.toFixed(6)}:${radiusMeters}`;
      const cached = await this.cacheService.get<OverpassResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for Overpass API: ${cacheKey}`);
        return cached;
      }

      // Build Overpass QL query
      const query = this.buildQuery(latitude, longitude, radiusMeters);

      // Execute rate-limited request
      const response = await this.limiter.schedule(() =>
        this.executeQuery(query)
      );

      // Parse results
      const result = this.parseResponse(response, latitude, longitude);

      // Cache the result (24 hour TTL)
      if (result.found) {
        await this.cacheService.set(cacheKey, result, 24 * 60 * 60);
        this.logger.log(
          `Overpass API found: ${result.name || 'unnamed venue'} at (${latitude}, ${longitude})`
        );
      } else {
        // Cache negative results too (shorter TTL - 1 hour)
        await this.cacheService.set(cacheKey, result, 60 * 60);
      }

      return result;
    } catch (error) {
      this.logger.error(`Overpass API error: ${error}`);
      return { found: false };
    }
  }

  /**
   * Build Overpass QL query for breweries and wineries
   */
  private buildQuery(lat: number, lng: number, radius: number): string {
    return `
      [out:json];
      (
        node["craft"="brewery"](around:${radius},${lat},${lng});
        way["craft"="brewery"](around:${radius},${lat},${lng});
        node["craft"="winery"](around:${radius},${lat},${lng});
        way["craft"="winery"](around:${radius},${lat},${lng});
        node["amenity"="bar"]["brewery"](around:${radius},${lat},${lng});
        way["amenity"="bar"]["brewery"](around:${radius},${lat},${lng});
        node["amenity"="pub"]["microbrewery"="yes"](around:${radius},${lat},${lng});
        way["amenity"="pub"]["microbrewery"="yes"](around:${radius},${lat},${lng});
      );
      out body;
    `.trim();
  }

  /**
   * Execute HTTP request to Overpass API
   */
  private async executeQuery(query: string): Promise<OverpassResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Parse Overpass API response and find closest match
   */
  private parseResponse(
    response: OverpassResponse,
    searchLat: number,
    searchLng: number
  ): OverpassResult {
    if (!response.elements || response.elements.length === 0) {
      return { found: false };
    }

    // Find closest element
    let closestElement: OverpassElement | null = null;
    let closestDistance = Infinity;

    for (const element of response.elements) {
      if (element.lat && element.lon) {
        const distance = this.calculateDistance(
          searchLat,
          searchLng,
          element.lat,
          element.lon
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestElement = element;
        }
      }
    }

    if (!closestElement) {
      return { found: false };
    }

    // Build address from tags
    const tags = closestElement.tags || {};
    let address: string | undefined;

    if (tags['addr:housenumber'] || tags['addr:street']) {
      const parts: string[] = [];
      if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
      if (tags['addr:street']) parts.push(tags['addr:street']);
      if (tags['addr:city']) parts.push(tags['addr:city']);
      if (tags['addr:state']) parts.push(tags['addr:state']);
      if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
      address = parts.join(', ');
    }

    return {
      found: true,
      name: tags.name,
      address,
      lat: closestElement.lat,
      lng: closestElement.lon,
      tags: {
        craft: tags.craft,
        amenity: tags.amenity,
        brewery: tags.brewery,
      },
      distance_meters: Math.round(closestDistance * 1000),
    };
  }

  /**
   * Calculate distance between two coordinates in kilometers using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
