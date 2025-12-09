/**
 * VisitCreationService
 * Creates visits from imported Timeline data
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit } from '../../../entities/visit.entity';

@Injectable()
export class VisitCreationService {
  private readonly logger = new Logger(VisitCreationService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>
  ) {}

  /**
   * Detect duplicate visit within 15-minute window
   * Uses a single SQL query with time range filtering instead of fetching all visits
   */
  async detectDuplicateVisit(
    userId: string,
    venueId: string,
    arrivalTime: string
  ): Promise<boolean> {
    try {
      const arrivalDate = new Date(arrivalTime);
      const windowMs = 15 * 60 * 1000; // 15 minutes in milliseconds

      // Calculate time window bounds
      const windowStart = new Date(arrivalDate.getTime() - windowMs);
      const windowEnd = new Date(arrivalDate.getTime() + windowMs);

      // Single query with time range filter - much more efficient than N+1
      const duplicateCount = await this.visitRepository
        .createQueryBuilder('visit')
        .where('visit.user_id = :userId', { userId })
        .andWhere('visit.venue_id = :venueId', { venueId })
        .andWhere('visit.arrival_time BETWEEN :windowStart AND :windowEnd', {
          windowStart,
          windowEnd,
        })
        .getCount();

      if (duplicateCount > 0) {
        this.logger.debug(
          `Duplicate visit detected: venue=${venueId}, time=${arrivalTime}`
        );
        return true;
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
    try {
      const visit = this.visitRepository.create({
        user_id: userId,
        venue_id: venueId,
        arrival_time: new Date(arrivalTime),
        departure_time: new Date(departureTime),
        is_active: false, // Imported visits are always complete
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
