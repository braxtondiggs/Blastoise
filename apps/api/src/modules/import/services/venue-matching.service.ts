/**
 * T058: VenueMatchingService
 * Implements intelligent venue matching to prevent duplicates
 * Strategy: Place ID → Proximity + Fuzzy Name → Create New
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceVisit } from '@blastoise/shared';
import { Venue } from '../../../entities/venue.entity';
import * as fuzzball from 'fuzzball';

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
  private readonly FUZZY_NAME_THRESHOLD = 80; // 80% similarity required

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
   * Match by proximity (100m) + fuzzy name (≥80%)
   * Returns existing venue if within 100m AND name similarity ≥80%
   */
  async matchByProximity(
    placeVisit: PlaceVisit
  ): Promise<{ venue: Venue | null; confidence: number }> {
    try {
      // Find venues within 100m radius using Haversine formula
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

      // Check each nearby venue for fuzzy name match
      let bestMatch: Venue | null = null;
      let bestScore = 0;

      for (const venue of nearbyVenues) {
        // Use token set ratio for fuzzy matching (handles word order differences)
        const similarity = fuzzball.token_set_ratio(
          placeVisit.name.toLowerCase(),
          venue.name.toLowerCase()
        );

        if (similarity >= this.FUZZY_NAME_THRESHOLD && similarity > bestScore) {
          bestMatch = venue;
          bestScore = similarity;
        }
      }

      if (bestMatch) {
        this.logger.debug(
          `Matched venue by proximity + fuzzy name: ${bestMatch.name} (${bestScore}% similarity)`
        );
        return { venue: bestMatch, confidence: bestScore / 100 };
      }

      return { venue: null, confidence: 0 };
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
    verificationTier: 1 | 2 | 3
  ): Promise<Venue> {
    try {
      const venue = this.venueRepository.create({
        name: placeVisit.name,
        address: placeVisit.address,
        latitude: placeVisit.latitude,
        longitude: placeVisit.longitude,
        venue_type: venueType,
        source: 'google_import',
        google_place_id: placeVisit.place_id,
        verification_tier: verificationTier,
      });

      const savedVenue = await this.venueRepository.save(venue);
      this.logger.debug(`Created new venue: ${savedVenue.name} (${savedVenue.id})`);
      return savedVenue;
    } catch (error) {
      this.logger.error(`Failed to create venue "${placeVisit.name}": ${error}`);
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
    verificationTier: 1 | 2 | 3 = 1
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

    // Strategy 2: Try proximity + fuzzy name match
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
    const newVenue = await this.createNewVenue(placeVisit, venueType, verificationTier);
    return {
      matched: false,
      venue: newVenue,
      matchType: 'none',
      confidence: 0,
    };
  }
}
