/**
 * VisitCreationService
 * Creates visits from imported Timeline data with privacy-preserving timestamp rounding
 */

import { Injectable, Logger } from '@nestjs/common';
import { VisitsRepository } from '@blastoise/data-backend';
import { Visit, roundTimestampToISO } from '@blastoise/shared';

@Injectable()
export class VisitCreationService {
  private readonly logger = new Logger(VisitCreationService.name);
  private visitsRepo: VisitsRepository;

  constructor() {
    this.visitsRepo = new VisitsRepository();
  }

  /**
   * Round timestamp to nearest 15 minutes (privacy protection)
   * Delegates to shared utility function
   */
  roundTimestampTo15Minutes(timestamp: string): string {
    return roundTimestampToISO(timestamp, 15);
  }

  /**
   * Detect duplicate visit within 15-minute window
   * Checks if a visit already exists for the same venue and time window
   */
  async detectDuplicateVisit(
    userId: string,
    venueId: string,
    arrivalTime: string
  ): Promise<boolean> {
    try {
      // Round arrival time to 15-minute window
      const roundedArrival = this.roundTimestampTo15Minutes(arrivalTime);

      // Query for existing visits in the same 15-minute window
      // NOTE: This is a simplified check - in production you'd want to check a wider window
      const existingVisits = await this.visitsRepo.findByUserId(userId, 100, 0);

      for (const visit of existingVisits) {
        if (visit.venue_id === venueId) {
          const visitRoundedArrival = this.roundTimestampTo15Minutes(visit.arrival_time);
          if (visitRoundedArrival === roundedArrival) {
            this.logger.debug(
              `Duplicate visit detected: venue=${venueId}, time=${roundedArrival}`
            );
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error detecting duplicate visit: ${error}`);
      // On error, assume not duplicate to avoid blocking import
      return false;
    }
  }

  /**
   * Create imported visit with source='google_import'
   */
  async createImportedVisit(
    userId: string,
    venueId: string,
    arrivalTime: string,
    departureTime: string
  ): Promise<Visit> {
    // Round timestamps to 15 minutes for privacy
    const roundedArrival = this.roundTimestampTo15Minutes(arrivalTime);
    const roundedDeparture = this.roundTimestampTo15Minutes(departureTime);

    try {
      const visit = await this.visitsRepo.create({
        user_id: userId,
        venue_id: venueId,
        arrival_time: roundedArrival,
        departure_time: roundedDeparture,
        is_active: false, // Imported visits are always complete
        detection_method: 'manual', // Imported data treated as manual
        // source and imported_at will be set by repository based on Visit model
      } as any);

      this.logger.debug(`Created imported visit ${visit.id} for venue ${venueId}`);
      return visit;
    } catch (error) {
      this.logger.error(`Failed to create imported visit: ${error}`);
      throw error;
    }
  }
}
