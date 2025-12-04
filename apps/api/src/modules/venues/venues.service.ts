import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../../entities/venue.entity';
import { SearchVenuesDto } from './dto/search-venues.dto';
import { NearbyVenuesDto } from './dto/nearby-venues.dto';
import { VerificationCacheService } from '../import/services/verification-cache.service';
import { BreweryDbVerifierService, BreweryDbResult } from '../import/services/brewery-db-verifier.service';
import { OverpassApiService, OsmVenueResult } from '../import/services/overpass-api.service';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    private readonly cacheService: VerificationCacheService,
    private readonly breweryDbService: BreweryDbVerifierService,
    private readonly overpassApiService: OverpassApiService
  ) {}

  async findById(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return venue;
  }

  async search(dto: SearchVenuesDto): Promise<{ venues: Venue[]; total: number }> {
    const page = parseInt(dto.page || '1', 10);
    const limit = parseInt(dto.limit || '50', 10);
    const offset = (page - 1) * limit;

    const queryBuilder = this.venueRepository.createQueryBuilder('venue');

    if (dto.query) {
      queryBuilder.where('venue.name ILIKE :query', { query: `%${dto.query}%` });
    }

    if (dto.type) {
      queryBuilder.andWhere('venue.venue_type = :type', { type: dto.type });
    }

    const [venues, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { venues, total };
  }

  /**
   * Find nearby venues with distance calculation
   * Always checks both local DB and external sources to ensure completeness
   */
  async findNearby(dto: NearbyVenuesDto): Promise<VenueWithDistance[]> {
    const radiusKm = dto.radius || 5;
    const limit = dto.limit || 50;

    // Step 1: Check local database first
    const localVenues = await this.findNearbyFromDb(dto.latitude, dto.longitude, radiusKm, limit * 2, dto.type);
    this.logger.debug(`Found ${localVenues.length} venues in local DB near (${dto.latitude}, ${dto.longitude})`);

    // Step 2: Check if we should run discovery (cache prevents hammering external APIs)
    // Discovery cache expires after 24 hours, allowing periodic re-discovery
    const cachedSearch = await this.cacheService.getDiscoverySearch(dto.latitude, dto.longitude);

    if (!cachedSearch) {
      // Step 3: Discover venues from ALL external sources (not just fallback)
      this.logger.log(`Running discovery for area near (${dto.latitude}, ${dto.longitude})...`);
      const discoveredVenues = await this.discoverAndSaveVenues(dto.latitude, dto.longitude, radiusKm * 1000);

      // Step 4: Cache that we searched this area (24h TTL in cache service)
      await this.cacheService.cacheDiscoverySearch(dto.latitude, dto.longitude, discoveredVenues.length);

      // Add any newly discovered venues to our results
      if (discoveredVenues.length > 0) {
        const newVenuesWithDistance = discoveredVenues
          .filter(v => !localVenues.some(lv => lv.id === v.id)) // Avoid duplicates
          .map((venue) => {
            const distance = this.calculateHaversineDistance(
              dto.latitude,
              dto.longitude,
              Number(venue.latitude),
              Number(venue.longitude)
            );
            return { ...venue, distance };
          });

        localVenues.push(...newVenuesWithDistance);
        this.logger.log(`Added ${newVenuesWithDistance.length} newly discovered venues`);
      }
    } else {
      this.logger.debug(`Discovery cache hit for grid near (${dto.latitude}, ${dto.longitude}) - searched ${cachedSearch.searched_at}`);
    }

    // Step 5: Return combined results sorted by distance
    return localVenues
      .filter((v) => v.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Query local database for nearby venues
   */
  private async findNearbyFromDb(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number,
    type?: string
  ): Promise<VenueWithDistance[]> {
    // Convert km to degrees (approximate at equator: 1 degree ≈ 111km)
    const radiusDegrees = radiusKm / 111;

    const queryBuilder = this.venueRepository
      .createQueryBuilder('venue')
      .where('venue.latitude BETWEEN :minLat AND :maxLat', {
        minLat: latitude - radiusDegrees,
        maxLat: latitude + radiusDegrees,
      })
      .andWhere('venue.longitude BETWEEN :minLng AND :maxLng', {
        minLng: longitude - radiusDegrees,
        maxLng: longitude + radiusDegrees,
      });

    if (type) {
      queryBuilder.andWhere('venue.venue_type = :type', { type });
    }

    const venues = await queryBuilder.take(limit * 2).getMany();

    // Calculate actual distances using Haversine formula
    const venuesWithDistance: VenueWithDistance[] = venues.map((venue) => {
      const distance = this.calculateHaversineDistance(
        latitude,
        longitude,
        Number(venue.latitude),
        Number(venue.longitude)
      );
      return { ...venue, distance };
    });

    // Filter by actual radius and sort by distance
    return venuesWithDistance
      .filter((v) => v.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Discover venues from external APIs and save to database
   * Queries BOTH Open Brewery DB AND OpenStreetMap in parallel to ensure comprehensive coverage
   * Some venues exist only in one source (e.g., Evil Twin Brewing is in OSM but not Open Brewery DB)
   */
  private async discoverAndSaveVenues(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<Venue[]> {
    const savedVenues: Venue[] = [];

    // Query BOTH sources in parallel for comprehensive venue discovery
    // This adds ~1 extra API call per location per 24h (cached), but ensures we don't miss venues
    this.logger.debug(`Discovering from ALL sources near (${latitude}, ${longitude})`);

    const [breweryDbResults, osmResults] = await Promise.all([
      this.breweryDbService.discoverNearby(latitude, longitude, 20).catch((error) => {
        this.logger.warn(`Open Brewery DB discovery failed: ${error.message}`);
        return [] as BreweryDbResult[];
      }),
      this.overpassApiService.discoverNearby(latitude, longitude, radiusMeters).catch((error) => {
        this.logger.warn(`OpenStreetMap discovery failed: ${error.message}`);
        return [] as OsmVenueResult[];
      }),
    ]);

    // Process Open Brewery DB results
    if (breweryDbResults.length > 0) {
      this.logger.log(`Found ${breweryDbResults.length} venues from Open Brewery DB`);
      const venues = await this.saveBreweryDbResults(breweryDbResults);
      savedVenues.push(...venues);
    }

    // Process OpenStreetMap results (may include venues not in Open Brewery DB)
    if (osmResults.length > 0) {
      this.logger.log(`Found ${osmResults.length} venues from OpenStreetMap`);
      const venues = await this.saveOsmResults(osmResults);
      savedVenues.push(...venues);
    }

    this.logger.log(`Total discovered and saved: ${savedVenues.length} venues (from ${breweryDbResults.length} BreweryDB + ${osmResults.length} OSM)`);
    return savedVenues;
  }

  /**
   * Save Open Brewery DB results to database
   */
  private async saveBreweryDbResults(results: BreweryDbResult[]): Promise<Venue[]> {
    const savedVenues: Venue[] = [];

    for (const brewery of results) {
      try {
        // Check if venue already exists (by external ID or name + location)
        const existing = await this.findExistingVenue(
          brewery.name,
          parseFloat(brewery.latitude),
          parseFloat(brewery.longitude),
          brewery.id
        );

        if (existing) {
          this.logger.debug(`Venue "${brewery.name}" already exists, skipping`);
          savedVenues.push(existing);
          continue;
        }

        // Create new venue
        const venue = this.venueRepository.create({
          name: brewery.name,
          latitude: parseFloat(brewery.latitude),
          longitude: parseFloat(brewery.longitude),
          venue_type: 'brewery',
          address: brewery.address_1,
          city: brewery.city,
          state: brewery.state_province,
          source_id: brewery.id,
          source: 'brewerydb',
          metadata: brewery.website_url ? { website: brewery.website_url } : undefined,
        });

        const saved = await this.venueRepository.save(venue);
        savedVenues.push(saved);
        this.logger.debug(`Saved new venue: ${brewery.name}`);
      } catch (error) {
        this.logger.error(`Failed to save venue "${brewery.name}": ${error}`);
      }
    }

    return savedVenues;
  }

  /**
   * Save OpenStreetMap results to database
   */
  private async saveOsmResults(results: OsmVenueResult[]): Promise<Venue[]> {
    const savedVenues: Venue[] = [];

    for (const osmVenue of results) {
      try {
        // Check if venue already exists
        const existing = await this.findExistingVenue(
          osmVenue.name,
          osmVenue.latitude,
          osmVenue.longitude,
          `osm_${osmVenue.osm_type}_${osmVenue.id}`
        );

        if (existing) {
          this.logger.debug(`Venue "${osmVenue.name}" already exists, skipping`);
          savedVenues.push(existing);
          continue;
        }

        // Create new venue
        const venue = this.venueRepository.create({
          name: osmVenue.name,
          latitude: osmVenue.latitude,
          longitude: osmVenue.longitude,
          venue_type: osmVenue.venue_type,
          address: osmVenue.address,
          city: osmVenue.city,
          source_id: `osm_${osmVenue.osm_type}_${osmVenue.id}`,
          source: 'osm',
          metadata: osmVenue.website ? { website: osmVenue.website } : undefined,
        });

        const saved = await this.venueRepository.save(venue);
        savedVenues.push(saved);
        this.logger.debug(`Saved new venue from OSM: ${osmVenue.name}`);
      } catch (error) {
        this.logger.error(`Failed to save OSM venue "${osmVenue.name}": ${error}`);
      }
    }

    return savedVenues;
  }

  /**
   * Find existing venue by source ID or name + proximity
   */
  private async findExistingVenue(
    name: string,
    latitude: number,
    longitude: number,
    sourceId?: string
  ): Promise<Venue | null> {
    // First try by source ID
    if (sourceId) {
      const bySourceId = await this.venueRepository.findOne({
        where: { source_id: sourceId },
      });
      if (bySourceId) {
        return bySourceId;
      }
    }

    // Then try by name + proximity (within 100m)
    const radiusDegrees = 0.001; // ~100m
    const byNameAndLocation = await this.venueRepository
      .createQueryBuilder('venue')
      .where('LOWER(venue.name) = LOWER(:name)', { name })
      .andWhere('venue.latitude BETWEEN :minLat AND :maxLat', {
        minLat: latitude - radiusDegrees,
        maxLat: latitude + radiusDegrees,
      })
      .andWhere('venue.longitude BETWEEN :minLng AND :maxLng', {
        minLng: longitude - radiusDegrees,
        maxLng: longitude + radiusDegrees,
      })
      .getOne();

    return byNameAndLocation;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
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

/**
 * Venue with distance from user location
 */
export interface VenueWithDistance extends Venue {
  distance: number; // Distance in kilometers
}
