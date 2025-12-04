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
   * Uses tiered discovery: Local DB → Cache Check → Open Brewery DB → OpenStreetMap
   */
  async findNearby(dto: NearbyVenuesDto): Promise<VenueWithDistance[]> {
    const radiusKm = dto.radius || 5;
    const limit = dto.limit || 50;

    // Step 1: Check local database first
    const localVenues = await this.findNearbyFromDb(dto.latitude, dto.longitude, radiusKm, limit, dto.type);

    if (localVenues.length > 0) {
      this.logger.debug(`Found ${localVenues.length} venues in local DB near (${dto.latitude}, ${dto.longitude})`);
      return localVenues;
    }

    // Step 2: Check if we've already searched this area recently (geo-grid cache)
    const cachedSearch = await this.cacheService.getDiscoverySearch(dto.latitude, dto.longitude);
    if (cachedSearch) {
      this.logger.debug(`Discovery cache hit for grid near (${dto.latitude}, ${dto.longitude}) - searched ${cachedSearch.searched_at}`);
      // Area was searched recently but no venues found, don't search again
      return [];
    }

    // Step 3: Discover venues from external sources
    this.logger.log(`No local venues near (${dto.latitude}, ${dto.longitude}), initiating discovery...`);
    const discoveredVenues = await this.discoverAndSaveVenues(dto.latitude, dto.longitude, radiusKm * 1000);

    // Step 4: Cache that we searched this area
    await this.cacheService.cacheDiscoverySearch(dto.latitude, dto.longitude, discoveredVenues.length);

    // Step 5: Return discovered venues with distance
    if (discoveredVenues.length > 0) {
      const venuesWithDistance = discoveredVenues.map((venue) => {
        const distance = this.calculateHaversineDistance(
          dto.latitude,
          dto.longitude,
          Number(venue.latitude),
          Number(venue.longitude)
        );
        return { ...venue, distance };
      });

      return venuesWithDistance
        .filter((v) => v.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    }

    return [];
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
   * Uses Open Brewery DB as primary, OpenStreetMap as fallback
   */
  private async discoverAndSaveVenues(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<Venue[]> {
    const savedVenues: Venue[] = [];

    // Step 1: Try Open Brewery DB first (primary source)
    this.logger.debug(`Discovering from Open Brewery DB near (${latitude}, ${longitude})`);
    const breweryDbResults = await this.breweryDbService.discoverNearby(latitude, longitude, 20);

    if (breweryDbResults.length > 0) {
      this.logger.log(`Found ${breweryDbResults.length} venues from Open Brewery DB`);
      const venues = await this.saveBreweryDbResults(breweryDbResults);
      savedVenues.push(...venues);
    }

    // Step 2: If no results from Open Brewery DB, try OpenStreetMap as fallback
    if (breweryDbResults.length === 0) {
      this.logger.debug(`No results from Open Brewery DB, trying OpenStreetMap...`);
      const osmResults = await this.overpassApiService.discoverNearby(latitude, longitude, radiusMeters);

      if (osmResults.length > 0) {
        this.logger.log(`Found ${osmResults.length} venues from OpenStreetMap`);
        const venues = await this.saveOsmResults(osmResults);
        savedVenues.push(...venues);
      }
    }

    this.logger.log(`Total discovered and saved: ${savedVenues.length} venues`);
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
