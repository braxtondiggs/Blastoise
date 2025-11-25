/**
 * TimelineParserService
 * Parses Google Timeline JSON data from both legacy and new formats
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  GoogleTimelineData,
  LegacyTimelineFormat,
  NewTimelineFormat,
  PlaceVisit,
  TimelineFormatDetection,
  LegacyPlaceVisit,
  NewPlaceVisit,
} from '@blastoise/shared';

@Injectable()
export class TimelineParserService {
  private readonly logger = new Logger(TimelineParserService.name);

  /**
   * Detect Timeline format (legacy vs new)
   */
  detectFormat(data: unknown): 'legacy' | 'new' | 'unknown' {
    if (TimelineFormatDetection.isLegacyFormat(data)) {
      return 'legacy';
    }
    if (TimelineFormatDetection.isNewFormat(data)) {
      return 'new';
    }
    return 'unknown';
  }

  /**
   * Parse legacy Google Takeout format
   * Extracts placeVisit entries from timelineObjects array
   */
  parseLegacyFormat(data: LegacyTimelineFormat): LegacyPlaceVisit[] {
    const placeVisits: LegacyPlaceVisit[] = [];

    for (const timelineObject of data.timelineObjects) {
      if (timelineObject.placeVisit) {
        placeVisits.push(timelineObject.placeVisit);
      }
    }

    this.logger.debug(`Parsed ${placeVisits.length} place visits from legacy format`);
    return placeVisits;
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
   * Extract and normalize PlaceVisits from both formats
   * Converts both formats into common PlaceVisit[] structure
   */
  extractPlaceVisits(timelineData: GoogleTimelineData): PlaceVisit[] {
    const format = this.detectFormat(timelineData);

    if (format === 'unknown') {
      throw new BadRequestException(
        'Invalid Timeline format. Expected Google Takeout or mobile export format.'
      );
    }

    let rawPlaceVisits: (LegacyPlaceVisit | NewPlaceVisit)[] = [];

    if (format === 'legacy') {
      rawPlaceVisits = this.parseLegacyFormat(timelineData as LegacyTimelineFormat);
    } else {
      rawPlaceVisits = this.parseNewFormat(timelineData as NewTimelineFormat);
    }

    // Normalize both formats into common PlaceVisit structure
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
   */
  private normalizePlaceVisit(rawVisit: LegacyPlaceVisit | NewPlaceVisit): PlaceVisit | null {
    const location = rawVisit.location;
    const duration = rawVisit.duration;

    // Validate required fields
    if (!location || !duration || !duration.startTimestamp || !duration.endTimestamp) {
      return null;
    }

    // Extract name (required)
    const name = location.name?.trim();
    if (!name) {
      return null;
    }

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

    // Extract confidence (legacy format only)
    let confidence: PlaceVisit['confidence'] = undefined;
    if ('placeConfidence' in rawVisit) {
      const legacyVisit = rawVisit as LegacyPlaceVisit;
      if (legacyVisit.placeConfidence) {
        switch (legacyVisit.placeConfidence) {
          case 'LOW_CONFIDENCE':
            confidence = 'low';
            break;
          case 'MEDIUM_CONFIDENCE':
            confidence = 'medium';
            break;
          case 'HIGH_CONFIDENCE':
            confidence = 'high';
            break;
          case 'USER_CONFIRMED':
            confidence = 'user_confirmed';
            break;
        }
      }
    }

    return {
      place_id: location.placeId,
      name,
      address: location.address?.trim(),
      latitude,
      longitude,
      arrival_time: duration.startTimestamp,
      departure_time: duration.endTimestamp,
      confidence,
    };
  }
}
