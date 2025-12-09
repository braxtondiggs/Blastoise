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

    // Always exclude closed venues
    queryBuilder.where('venue.is_closed = :isClosed', { isClosed: false });

    if (dto.query) {
      queryBuilder.andWhere('venue.name ILIKE :query', { query: `%${dto.query}%` });
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
      })
      // Exclude closed venues
      .andWhere('venue.is_closed = :isClosed', { isClosed: false });

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

    // Process OpenStreetMap results FIRST (these are more reliable/current)
    if (osmResults.length > 0) {
      this.logger.log(`Found ${osmResults.length} venues from OpenStreetMap`);
      const venues = await this.saveOsmResults(osmResults);
      savedVenues.push(...venues);
    }

    // Process Open Brewery DB results - cross-reference with OSM to filter closed venues
    if (breweryDbResults.length > 0) {
      this.logger.log(`Found ${breweryDbResults.length} venues from Open Brewery DB`);
      const venues = await this.saveBreweryDbResults(breweryDbResults, osmResults);
      savedVenues.push(...venues);
    }

    this.logger.log(`Total discovered and saved: ${savedVenues.length} venues (from ${breweryDbResults.length} BreweryDB + ${osmResults.length} OSM)`);
    return savedVenues;
  }

  /**
   * Save Open Brewery DB results to database
   * Cross-references with OSM results to filter out likely closed venues
   */
  private async saveBreweryDbResults(
    results: BreweryDbResult[],
    osmResults: OsmVenueResult[]
  ): Promise<Venue[]> {
    const savedVenues: Venue[] = [];

    for (const brewery of results) {
      try {
        // Skip if no valid coordinates
        if (!brewery.latitude || !brewery.longitude) {
          this.logger.debug(`Skipping "${brewery.name}" - no coordinates`);
          continue;
        }

        const breweryLat = parseFloat(brewery.latitude);
        const breweryLon = parseFloat(brewery.longitude);

        // Cross-reference with OSM: if venue is NOT in OSM, it may be closed
        // Check if any OSM venue is within 100m with similar name
        const isInOsm = this.isVenueInOsmResults(
          brewery.name,
          breweryLat,
          breweryLon,
          osmResults
        );

        if (!isInOsm) {
          this.logger.warn(
            `Skipping "${brewery.name}" - not found in OpenStreetMap (likely closed)`
          );
          continue;
        }

        // Check if venue already exists (by external ID or name + location)
        const existing = await this.findExistingVenue(
          brewery.name,
          breweryLat,
          breweryLon,
          brewery.id
        );

        if (existing) {
          this.logger.debug(`Venue "${brewery.name}" already exists, skipping`);
          savedVenues.push(existing);
          continue;
        }

        // Create new venue (verified to exist in OSM)
        const venue = this.venueRepository.create({
          name: brewery.name,
          latitude: breweryLat,
          longitude: breweryLon,
          venue_type: 'brewery',
          address: brewery.address_1,
          city: brewery.city,
          state: brewery.state_province,
          source_id: brewery.id,
          source: 'brewerydb',
          metadata: brewery.website_url ? { website: brewery.website_url } : undefined,
          last_verified_at: new Date(), // Mark as verified since it's in OSM
        });

        const saved = await this.venueRepository.save(venue);
        savedVenues.push(saved);
        this.logger.debug(`Saved new venue: ${brewery.name} (verified in OSM)`);
      } catch (error) {
        this.logger.error(`Failed to save venue "${brewery.name}": ${error}`);
      }
    }

    return savedVenues;
  }

  /**
   * Check if a venue from BreweryDB exists in OSM results
   * Uses Levenshtein distance for fuzzy name matching and proximity check (within 200m)
   */
  private isVenueInOsmResults(
    name: string,
    latitude: number,
    longitude: number,
    osmResults: OsmVenueResult[]
  ): boolean {
    const PROXIMITY_THRESHOLD_KM = 0.2; // 200 meters
    const SIMILARITY_THRESHOLD = 0.75; // 75% similarity required

    // Normalize name for comparison (only remove legal suffixes, keep core business name)
    const normalizedName = this.normalizeVenueName(name);

    for (const osmVenue of osmResults) {
      const distance = this.calculateHaversineDistance(
        latitude,
        longitude,
        osmVenue.latitude,
        osmVenue.longitude
      );

      // Check proximity first (must be within 200m)
      if (distance > PROXIMITY_THRESHOLD_KM) {
        continue;
      }

      // Check name similarity using Levenshtein distance
      const osmNormalizedName = this.normalizeVenueName(osmVenue.name);

      // Exact match after normalization
      if (normalizedName === osmNormalizedName) {
        return true;
      }

      // Calculate similarity using Levenshtein distance
      const similarity = this.calculateStringSimilarity(normalizedName, osmNormalizedName);
      if (similarity >= SIMILARITY_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize venue name for comparison
   * Only removes legal suffixes and punctuation, keeps core business name words intact
   */
  private normalizeVenueName(name: string): string {
    return name
      .toLowerCase()
      // Only remove legal/business suffixes, NOT descriptive words like "brewing" or "brewery"
      .replace(/\b(llc|inc|incorporated|corp|corporation|co\.|ltd|limited)\b/gi, '')
      // Remove punctuation but keep alphanumeric and spaces
      .replace(/[^a-z0-9\s]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 && len2 === 0) return 1;
    if (len1 === 0 || len2 === 0) return 0;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(len1, len2);

    return 1 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Uses dynamic programming with space optimization
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Use two rows instead of full matrix for space efficiency
    let prevRow = Array.from({ length: len2 + 1 }, (_, i) => i);
    let currRow = new Array(len2 + 1);

    for (let i = 1; i <= len1; i++) {
      currRow[0] = i;

      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        currRow[j] = Math.min(
          prevRow[j] + 1,      // deletion
          currRow[j - 1] + 1,  // insertion
          prevRow[j - 1] + cost // substitution
        );
      }

      // Swap rows
      [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[len2];
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
