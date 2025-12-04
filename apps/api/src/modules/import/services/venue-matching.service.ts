/**
 * VenueMatchingService
 * Implements intelligent venue matching to prevent duplicates
 * Strategy: Place ID → Proximity (coordinates only) → Create New
 * Note: Names are enriched by external APIs (OSM, Brewery DB, Google) before matching
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceVisit } from '@blastoise/shared';
import { Venue } from '../../../entities/venue.entity';

interface MatchResult {
  matched: boolean;
  venue?: Venue;
  matchType?: 'place_id' | 'proximity' | 'none';
  confidence?: number;
}

@Injectable()
export class VenueMatchingService {
  private readonly logger = new Logger(VenueMatchingService.name);

  // Matching thresholds
  private readonly PROXIMITY_RADIUS_METERS = 100;

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>
  ) {}

  /**
   * Match by Google Place ID (exact match, highest confidence)
   * Returns existing venue if Place ID matches
   */
  async matchByPlaceId(placeId: string): Promise<Venue | null> {
    if (!placeId) {
      return null;
    }

    try {
      const venue = await this.venueRepository.findOne({
        where: { google_place_id: placeId },
      });

      if (venue) {
        this.logger.debug(`Matched venue by Place ID: ${venue.name} (${venue.id})`);
        return venue;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error matching by Place ID: ${error}`);
      return null;
    }
  }

  /**
   * Match by proximity (100m) - coordinates only
   * Returns closest venue within 100m radius
   * Note: Names are enriched by Tier 1/2 before calling this
   */
  async matchByProximity(
    placeVisit: PlaceVisit
  ): Promise<{ venue: Venue | null; confidence: number }> {
    try {
      // Find venues within 100m radius
      // Convert meters to degrees (approximate at equator: 1 degree ≈ 111km)
      const radiusDegrees = this.PROXIMITY_RADIUS_METERS / 111000;

      const nearbyVenues = await this.venueRepository
        .createQueryBuilder('venue')
        .where('venue.latitude BETWEEN :minLat AND :maxLat', {
          minLat: placeVisit.latitude - radiusDegrees,
          maxLat: placeVisit.latitude + radiusDegrees,
        })
        .andWhere('venue.longitude BETWEEN :minLng AND :maxLng', {
          minLng: placeVisit.longitude - radiusDegrees,
          maxLng: placeVisit.longitude + radiusDegrees,
        })
        .getMany();

      if (nearbyVenues.length === 0) {
        return { venue: null, confidence: 0 };
      }

      // Return closest venue (first result)
      const closestVenue = nearbyVenues[0];
      this.logger.debug(
        `Matched venue by proximity: ${closestVenue.name} at ${placeVisit.latitude}, ${placeVisit.longitude}`
      );

      // Medium confidence - matched by location only
      return { venue: closestVenue, confidence: 0.75 };
    } catch (error) {
      this.logger.error(`Error matching by proximity: ${error}`);
      return { venue: null, confidence: 0 };
    }
  }

  /**
   * Create new venue with google_place_id and source='google_import'
   * Only called when no matches found
   */
  async createNewVenue(
    placeVisit: PlaceVisit,
    venueType: 'brewery' | 'winery',
    verificationTier: 1 | 2 | 3,
    googlePlacesMetadata?: Record<string, unknown> | null
  ): Promise<Venue> {
    try {
      // Generate a placeholder name if missing
      const venueName =
        placeVisit.name ||
        `Unknown ${venueType} (${placeVisit.latitude.toFixed(4)}, ${placeVisit.longitude.toFixed(4)})`;

      // Extract city, state, country from Google Places metadata if available
      const city = googlePlacesMetadata?.city as string | undefined;
      const state = googlePlacesMetadata?.state as string | undefined;
      const country = googlePlacesMetadata?.country as string | undefined;
      const postalCode = googlePlacesMetadata?.postal_code as string | undefined;

      const venue = this.venueRepository.create({
        name: venueName,
        address: placeVisit.address,
        city,
        state,
        country,
        postal_code: postalCode,
        latitude: placeVisit.latitude,
        longitude: placeVisit.longitude,
        venue_type: venueType,
        source: 'google_import',
        google_place_id: placeVisit.place_id,
        verification_tier: verificationTier,
        // Store full Google Places metadata in JSONB field
        metadata: googlePlacesMetadata || undefined,
      });

      const savedVenue = await this.venueRepository.save(venue);
      this.logger.debug(`Created new venue: ${savedVenue.name} (${savedVenue.id})`);
      return savedVenue;
    } catch (error) {
      this.logger.error(`Failed to create venue "${placeVisit.name ?? 'coordinate-only entry'}": ${error}`);
      throw error;
    }
  }

  /**
   * Main matching workflow: Try Place ID → Proximity → Create New
   * Returns matched or newly created venue
   */
  async findOrCreateVenue(
    placeVisit: PlaceVisit,
    venueType: 'brewery' | 'winery',
    verificationTier: 1 | 2 | 3 = 1,
    googlePlacesMetadata?: Record<string, unknown> | null
  ): Promise<MatchResult> {
    // Strategy 1: Try exact Place ID match
    if (placeVisit.place_id) {
      const placeIdMatch = await this.matchByPlaceId(placeVisit.place_id);
      if (placeIdMatch) {
        return {
          matched: true,
          venue: placeIdMatch,
          matchType: 'place_id',
          confidence: 1.0,
        };
      }
    }

    // Strategy 2: Try proximity match (coordinates only)
    const { venue: proximityMatch, confidence } = await this.matchByProximity(placeVisit);
    if (proximityMatch) {
      return {
        matched: true,
        venue: proximityMatch,
        matchType: 'proximity',
        confidence,
      };
    }

    // Strategy 3: No match - create new venue
    const newVenue = await this.createNewVenue(placeVisit, venueType, verificationTier, googlePlacesMetadata);
    return {
      matched: false,
      venue: newVenue,
      matchType: 'none',
      confidence: 0,
    };
  }
}
