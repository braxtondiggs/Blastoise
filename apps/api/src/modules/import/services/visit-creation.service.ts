/**
 * VisitCreationService
 * Creates visits from imported Timeline data with privacy-preserving timestamp rounding
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { roundTimestampToISO } from '@blastoise/shared';
import { Visit } from '../../../entities/visit.entity';

@Injectable()
export class VisitCreationService {
  private readonly logger = new Logger(VisitCreationService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>
  ) {}

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

      // Query for existing visits for this user and venue
      const existingVisits = await this.visitRepository.find({
        where: { user_id: userId, venue_id: venueId },
        take: 100,
      });

      for (const visit of existingVisits) {
        const visitArrivalStr = visit.arrival_time instanceof Date
          ? visit.arrival_time.toISOString()
          : visit.arrival_time;
        const visitRoundedArrival = this.roundTimestampTo15Minutes(visitArrivalStr);
        if (visitRoundedArrival === roundedArrival) {
          this.logger.debug(
            `Duplicate visit detected: venue=${venueId}, time=${roundedArrival}`
          );
          return true;
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
      const visit = this.visitRepository.create({
        user_id: userId,
        venue_id: venueId,
        arrival_time: new Date(roundedArrival),
        departure_time: new Date(roundedDeparture),
        is_active: false, // Imported visits are always complete
        detection_method: 'manual', // Imported data treated as manual
        source: 'google_import',
        imported_at: new Date(),
      });

      const savedVisit = await this.visitRepository.save(visit);
      this.logger.debug(`Created imported visit ${savedVisit.id} for venue ${venueId}`);
      return savedVisit;
    } catch (error) {
      this.logger.error(`Failed to create imported visit: ${error}`);
      throw error;
    }
  }
}
