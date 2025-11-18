/**
 * TimelineParserService
 * Parses Google Timeline JSON data from mobile export formats (Android/iOS)
 * Note: Google Takeout Timeline format has been discontinued
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  GoogleTimelineData,
  NewTimelineFormat,
  SemanticSegmentsFormat,
  PlaceVisit,
  TimelineFormatDetection,
  NewPlaceVisit,
} from '@blastoise/shared';

@Injectable()
export class TimelineParserService {
  private readonly logger = new Logger(TimelineParserService.name);

  /**
   * Detect Timeline format (new mobile format vs semantic segments)
   */
  detectFormat(data: unknown): 'new' | 'semantic' | 'unknown' {
    if (TimelineFormatDetection.isNewFormat(data)) {
      return 'new';
    }
    if (TimelineFormatDetection.isSemanticSegmentsFormat(data)) {
      return 'semantic';
    }
    return 'unknown';
  }

  /**
   * Parse new mobile export format
   * Returns placeVisits array directly
   */
  parseNewFormat(data: NewTimelineFormat): NewPlaceVisit[] {
    this.logger.debug(`Parsed ${data.placeVisits.length} place visits from new format`);
    return data.placeVisits;
  }

  /**
   * Parse semantic segments format (Android Timeline export)
   * Extracts visit entries and converts to common format
   */
  parseSemanticSegmentsFormat(data: SemanticSegmentsFormat): Array<{
    location: {
      placeId?: string;
      name?: string;
      address?: string;
      latitudeE7?: number;
      longitudeE7?: number;
      latLng?: string;
    };
    duration: {
      startTimestamp: string;
      endTimestamp: string;
    };
  }> {
    const visits: Array<any> = [];

    for (const segment of data.semanticSegments) {
      // Skip activity segments, only process visits
      if (!segment.visit || !segment.startTime || !segment.endTime) {
        continue;
      }

      const topCandidate = segment.visit.topCandidate;
      if (!topCandidate || !topCandidate.placeLocation) {
        continue;
      }

      const location = topCandidate.placeLocation;

      // Handle latLng string format
      let latitudeE7: number | undefined;
      let longitudeE7: number | undefined;

      if (location.latLng) {
        const coords = TimelineFormatDetection.parseLatLngString(location.latLng);
        if (coords) {
          latitudeE7 = Math.round(coords.lat * 10000000);
          longitudeE7 = Math.round(coords.lng * 10000000);
        }
      }

      if (latitudeE7 === undefined || longitudeE7 === undefined) {
        this.logger.warn(`Skipping segment with invalid coordinates: ${location.latLng}`);
        continue;
      }

      visits.push({
        location: {
          placeId: topCandidate.placeId,
          name: location.name,
          address: location.address,
          latitudeE7,
          longitudeE7,
          latLng: location.latLng,
        },
        duration: {
          startTimestamp: segment.startTime,
          endTimestamp: segment.endTime,
        },
      });
    }

    this.logger.debug(`Parsed ${visits.length} visits from semantic segments format`);
    return visits;
  }

  /**
   * Extract and normalize PlaceVisits from mobile export formats
   * Converts all formats into common PlaceVisit[] structure
   */
  extractPlaceVisits(timelineData: GoogleTimelineData): PlaceVisit[] {
    const format = this.detectFormat(timelineData);

    if (format === 'unknown') {
      throw new BadRequestException(
        'Invalid Timeline format. Expected Android/iOS mobile export format (placeVisits or semanticSegments).'
      );
    }

    let rawPlaceVisits: Array<any> = [];

    if (format === 'new') {
      rawPlaceVisits = this.parseNewFormat(timelineData as NewTimelineFormat);
    } else if (format === 'semantic') {
      rawPlaceVisits = this.parseSemanticSegmentsFormat(timelineData as SemanticSegmentsFormat);
    }

    // Normalize all formats into common PlaceVisit structure
    const normalizedPlaceVisits: PlaceVisit[] = [];

    for (const rawVisit of rawPlaceVisits) {
      try {
        const normalized = this.normalizePlaceVisit(rawVisit);
        if (normalized) {
          normalizedPlaceVisits.push(normalized);
        }
      } catch (error) {
        this.logger.warn(`Failed to normalize place visit: ${error}`);
        // Skip invalid entries instead of failing entire import
      }
    }

    this.logger.log(
      `Extracted ${normalizedPlaceVisits.length} valid place visits from ${rawPlaceVisits.length} total`
    );

    return normalizedPlaceVisits;
  }

  /**
   * Helper: Normalize individual place visit
   * Handles both NewPlaceVisit format and parsed semantic segments
   */
  private normalizePlaceVisit(rawVisit: NewPlaceVisit | any): PlaceVisit | null {
    const location = rawVisit.location;
    const duration = rawVisit.duration;

    // Validate required fields
    if (!location || !duration || !duration.startTimestamp || !duration.endTimestamp) {
      return null;
    }

    // Extract name (optional - may not be present in real exports)
    const name = location.name?.trim() || null;

    // Extract coordinates (required)
    const latE7 = location.latitudeE7;
    const lngE7 = location.longitudeE7;
    if (latE7 === undefined || lngE7 === undefined) {
      return null;
    }

    const latitude = TimelineFormatDetection.convertE7ToDecimal(latE7);
    const longitude = TimelineFormatDetection.convertE7ToDecimal(lngE7);

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      this.logger.warn(`Invalid coordinates: ${latitude}, ${longitude}`);
      return null;
    }

    return {
      place_id: location.placeId,
      name,
      address: location.address?.trim(),
      latitude,
      longitude,
      arrival_time: duration.startTimestamp,
      departure_time: duration.endTimestamp,
      confidence: undefined, // Confidence not available in mobile exports
    };
  }
}
