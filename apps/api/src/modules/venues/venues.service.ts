import { Injectable, NotFoundException } from '@nestjs/common';
import { VenuesRepository, GeospatialService, CacheService, CacheKeys } from '@blastoise/data-backend';
import { Venue } from '@blastoise/shared';
import { SearchVenuesDto } from './dto/search-venues.dto';
import { NearbyVenuesDto } from './dto/nearby-venues.dto';

@Injectable()
export class VenuesService {
  private venuesRepo: VenuesRepository;
  private geoService: GeospatialService;
  private cacheService: CacheService;

  constructor() {
    this.venuesRepo = new VenuesRepository();
    this.geoService = new GeospatialService();
    this.cacheService = new CacheService();
  }

  async findById(id: string): Promise<Venue> {
    // Try cache first
    const cacheKey = CacheKeys.venue(id);
    const cached = await this.cacheService.get<Venue>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from database
    const venue = await this.venuesRepo.findById(id);

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, venue, { ttl: 3600 });

    return venue;
  }

  async search(dto: SearchVenuesDto): Promise<{ venues: Venue[]; total: number }> {
    const page = parseInt(dto.page || '1', 10);
    const limit = parseInt(dto.limit || '50', 10);

    const cacheKey = CacheKeys.venueSearch(dto.query || '', dto.type || undefined);
    const cached = await this.cacheService.get<Venue[]>(cacheKey);

    if (cached) {
      const start = (page - 1) * limit;
      const end = start + limit;
      return {
        venues: cached.slice(start, end),
        total: cached.length,
      };
    }

    // If no query and type is provided, use findByType
    let venues: Venue[];
    if (!dto.query && dto.type) {
      venues = await this.venuesRepo.findByType(dto.type, 1000);
    } else if (dto.query) {
      // Search by query
      venues = await this.venuesRepo.search(dto.query, 1000);
      // Filter by type if specified
      if (dto.type) {
        venues = venues.filter(v => v.venue_type === dto.type);
      }
    } else {
      // No query and no type - return empty or all venues
      venues = [];
    }

    // Cache search results for 15 minutes
    await this.cacheService.set(cacheKey, venues, { ttl: 900 });

    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      venues: venues.slice(start, end),
      total: venues.length,
    };
  }

  /**
   * Find nearby venues with distance calculation
   */
  async findNearby(dto: NearbyVenuesDto): Promise<VenueWithDistance[]> {
    const radiusKm = dto.radius || 5;
    const limit = dto.limit || 50;

    const cacheKey = CacheKeys.venuesNearby(dto.latitude, dto.longitude, radiusKm);
    const cached = await this.cacheService.get<VenueWithDistance[]>(cacheKey);

    if (cached) {
      // Apply type filter if specified
      const filtered = dto.type
        ? cached.filter((v) => v.venue_type === dto.type)
        : cached;
      return filtered.slice(0, limit);
    }

    // Use Redis geospatial query for fast proximity search
    const nearbyResults = await this.geoService.findNearby(
      { latitude: dto.latitude, longitude: dto.longitude },
      radiusKm,
      limit * 2 // Fetch more to account for type filtering
    );

    // Fetch full venue details for each result and add distance
    const venueIds = nearbyResults.map((r) => r.venueId);
    const venuesWithDistance: VenueWithDistance[] = [];

    for (let i = 0; i < venueIds.length; i++) {
      const id = venueIds[i];
      const distanceKm = nearbyResults[i].distance;

      try {
        const venue = await this.findById(id);

        if (!dto.type || venue.venue_type === dto.type) {
          venuesWithDistance.push({
            ...venue,
            distance: distanceKm,
          });
        }
      } catch {
        // Skip venues that no longer exist
        console.warn(`Venue ${id} not found in database`);
      }
    }

    // Sort by distance (closest first)
    venuesWithDistance.sort((a, b) => a.distance - b.distance);

    // Cache for 5 minutes (shorter TTL for location-based queries)
    await this.cacheService.set(cacheKey, venuesWithDistance, { ttl: 300 });

    return venuesWithDistance.slice(0, limit);
  }
}

/**
 * Venue with distance from user location
 */
export interface VenueWithDistance extends Venue {
  distance: number; // Distance in kilometers
}
