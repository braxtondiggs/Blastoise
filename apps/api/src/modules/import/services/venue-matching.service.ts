/**
 * VenueMatchingService
 * Implements intelligent venue matching to prevent duplicates
 * Strategy: Place ID → Proximity (coordinates only) → Create New
 * Note: Names are enriched by external APIs (OSM, Brewery DB, Google) before matching
 */

import { Injectable, Logger } from '@nestjs/common';
import { VenuesRepository } from '@blastoise/data-backend';
import { Venue, PlaceVisit } from '@blastoise/shared';

interface MatchResult {
  matched: boolean;
  venue?: Venue;
  matchType?: 'place_id' | 'proximity' | 'none';
  confidence?: number;
}

@Injectable()
export class VenueMatchingService {
  private readonly logger = new Logger(VenueMatchingService.name);
  private venuesRepo: VenuesRepository;

  // Matching thresholds
  private readonly PROXIMITY_RADIUS_METERS = 100;

  constructor() {
    this.venuesRepo = new VenuesRepository();
  }

  /**
   * Match by Google Place ID (exact match, highest confidence)
   * Returns existing venue if Place ID matches
   */
  async matchByPlaceId(placeId: string): Promise<Venue | null> {
    if (!placeId) {
      return null;
    }

    try {
      const venue = await this.venuesRepo.findByGooglePlaceId(placeId);

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
      const nearbyVenues = await this.venuesRepo.findByProximity(
        placeVisit.latitude,
        placeVisit.longitude,
        this.PROXIMITY_RADIUS_METERS
      );

      if (nearbyVenues.length === 0) {
        return { venue: null, confidence: 0 };
      }

      // Return closest venue (already sorted by distance)
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
    googlePlacesMetadata: Record<string, unknown> | null = null
  ): Promise<Venue> {
    try {
      // Generate a placeholder name if missing
      const venueName =
        placeVisit.name ||
        `Unknown ${venueType} (${placeVisit.latitude.toFixed(4)}, ${placeVisit.longitude.toFixed(4)})`;

      // Build venue data with optional Google Places metadata
      const venueData: any = {
        name: venueName,
        latitude: placeVisit.latitude,
        longitude: placeVisit.longitude,
        venue_type: venueType,
        source: 'google_import',
        google_place_id: placeVisit.place_id,
        verification_tier: verificationTier,
      };

      // Add structured address fields from metadata if available
      if (googlePlacesMetadata) {
        if (googlePlacesMetadata.city) venueData.city = googlePlacesMetadata.city;
        if (googlePlacesMetadata.state) venueData.state_province = googlePlacesMetadata.state;
        if (googlePlacesMetadata.country) venueData.country = googlePlacesMetadata.country;

        // Store ALL other Google Places data in metadata field
        venueData.metadata = googlePlacesMetadata;
      }

      const venue = await this.venuesRepo.create(venueData);

      this.logger.debug(`Created new venue: ${venue.name} (${venue.id})`);
      return venue;
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
    verificationTier: 1 | 2 | 3 = 1,
    googlePlacesMetadata: Record<string, unknown> | null = null
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
    const newVenue = await this.createNewVenue(placeVisit, venueType, verificationTier, googlePlacesMetadata);
    return {
      matched: false,
      venue: newVenue,
      matchType: 'none',
      confidence: 0,
    };
  }
}
