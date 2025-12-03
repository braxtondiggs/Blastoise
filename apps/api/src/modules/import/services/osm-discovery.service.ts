/**
 * OpenStreetMap Discovery Service
 * Uses Overpass API to discover breweries and wineries
 * Fallback for Open Brewery DB when no results found
 */

import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';

export interface OsmVenueResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  venue_type: 'brewery' | 'winery';
  address?: string;
  city?: string;
  website?: string;
  osm_type: 'node' | 'way' | 'relation';
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    craft?: string;
    microbrewery?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    website?: string;
    [key: string]: string | undefined;
  };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

@Injectable()
export class OsmDiscoveryService {
  private readonly logger = new Logger(OsmDiscoveryService.name);
  private readonly limiter: Bottleneck;
  private readonly overpassUrl = 'https://overpass-api.de/api/interpreter';

  constructor() {
    // Rate limiter - be respectful to Overpass API (1 request per 2 seconds)
    this.limiter = new Bottleneck({
      reservoir: 30,
      reservoirRefreshAmount: 30,
      reservoirRefreshInterval: 60 * 1000, // 1 minute
      maxConcurrent: 1,
      minTime: 2000, // 2 seconds between requests
    });

    this.logger.log('OsmDiscoveryService initialized with rate limiting');
  }

  /**
   * Discover breweries and wineries near a location using Overpass API
   * @param latitude Center latitude
   * @param longitude Center longitude
   * @param radiusMeters Search radius in meters (default 10km)
   */
  async discoverNearby(
    latitude: number,
    longitude: number,
    radiusMeters = 10000
  ): Promise<OsmVenueResult[]> {
    try {
      this.logger.debug(`Discovering venues from OSM near (${latitude}, ${longitude})`);

      const venues = await this.limiter.schedule(() =>
        this.fetchFromOverpass(latitude, longitude, radiusMeters)
      );

      this.logger.log(`Discovered ${venues.length} venues from OpenStreetMap`);

      return venues;
    } catch (error) {
      this.logger.error(`Failed to discover venues from OSM: ${error}`);
      return [];
    }
  }

  /**
   * Build and execute Overpass query
   */
  private async fetchFromOverpass(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<OsmVenueResult[]> {
    // Overpass QL query for breweries and wineries
    const query = `
      [out:json][timeout:25];
      (
        // Breweries
        node["craft"="brewery"](around:${radiusMeters},${latitude},${longitude});
        way["craft"="brewery"](around:${radiusMeters},${latitude},${longitude});
        node["microbrewery"="yes"](around:${radiusMeters},${latitude},${longitude});
        way["microbrewery"="yes"](around:${radiusMeters},${latitude},${longitude});
        node["industrial"="brewery"](around:${radiusMeters},${latitude},${longitude});
        way["industrial"="brewery"](around:${radiusMeters},${latitude},${longitude});

        // Wineries
        node["craft"="winery"](around:${radiusMeters},${latitude},${longitude});
        way["craft"="winery"](around:${radiusMeters},${latitude},${longitude});
      );
      out center;
    `;

    try {
      const response = await fetch(this.overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Blastoise/1.0 (Brewery Visit Tracker; +https://blastoise.app)',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data: OverpassResponse = await response.json();

      return this.parseOverpassResponse(data);
    } catch (error) {
      this.logger.error(`Overpass API request failed: ${error}`);
      return [];
    }
  }

  /**
   * Parse Overpass response into venue results
   */
  private parseOverpassResponse(data: OverpassResponse): OsmVenueResult[] {
    const venues: OsmVenueResult[] = [];
    const seenIds = new Set<string>();

    for (const element of data.elements) {
      // Skip elements without names
      if (!element.tags?.name) {
        continue;
      }

      // Get coordinates (nodes have lat/lon, ways have center)
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;

      if (!lat || !lon) {
        continue;
      }

      // Deduplicate by name + approximate location
      const dedupeKey = `${element.tags.name.toLowerCase()}-${lat.toFixed(3)}-${lon.toFixed(3)}`;
      if (seenIds.has(dedupeKey)) {
        continue;
      }
      seenIds.add(dedupeKey);

      // Determine venue type
      const venueType = this.determineVenueType(element.tags);

      venues.push({
        id: element.id,
        name: element.tags.name,
        latitude: lat,
        longitude: lon,
        venue_type: venueType,
        address: element.tags['addr:street'],
        city: element.tags['addr:city'],
        website: element.tags.website,
        osm_type: element.type,
      });
    }

    return venues;
  }

  /**
   * Determine venue type from OSM tags
   */
  private determineVenueType(tags: OverpassElement['tags']): 'brewery' | 'winery' {
    if (tags?.craft === 'winery') {
      return 'winery';
    }
    return 'brewery';
  }
}
