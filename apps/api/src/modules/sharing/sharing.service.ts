/**
 * Sharing Service
 *
 * Business logic for anonymized visit sharing:
 * - Venue denormalization (store venue data to avoid joins)
 * - Expiration check with 410 Gone response
 * - View count tracking
 * - Privacy validation (no user_id, no GPS coordinates)
 */

import {
  Injectable,
  NotFoundException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedVisit } from '../../entities/shared-visit.entity';
import { Visit } from '../../entities/visit.entity';
import { Venue } from '../../entities/venue.entity';
import { CreateShareDto } from './dto/create-share.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SharingService {
  private readonly logger = new Logger(SharingService.name);

  constructor(
    @InjectRepository(SharedVisit)
    private readonly sharedVisitRepository: Repository<SharedVisit>,
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>
  ) {}

  /**
   * Create share with venue denormalization
   * Stores venue data directly to avoid joins and ensure data persistence
   */
  async createShare(
    visitId: string,
    userId: string,
    dto: CreateShareDto
  ): Promise<SharedVisit> {
    // Fetch the visit and verify ownership
    const visit = await this.visitRepository.findOne({
      where: { id: visitId, user_id: userId },
    });

    if (!visit) {
      throw new NotFoundException(`Visit with ID ${visitId} not found`);
    }

    // Fetch venue details
    const venue = await this.venueRepository.findOne({
      where: { id: visit.venue_id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue not found for visit`);
    }

    // Generate unique share ID
    const shareId = randomBytes(16).toString('hex');

    // Extract only date (no time) for privacy
    const arrivalDate = visit.arrival_time instanceof Date
      ? visit.arrival_time
      : new Date(visit.arrival_time);
    const dateOnly = arrivalDate.toISOString().split('T')[0];

    // Create shared visit record with denormalized venue data
    const sharedVisit = this.sharedVisitRepository.create({
      id: shareId,
      visit_id: visitId,
      venue_name: venue.name,
      venue_city: venue.city || undefined,
      visit_date: dateOnly,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
      view_count: 0,
    });

    const savedShare = await this.sharedVisitRepository.save(sharedVisit);
    this.logger.log(`Created shared visit ${shareId} for visit ${visitId}`);
    return savedShare;
  }

  /**
   * Get shared visit with expiration check and view tracking
   */
  async getShared(shareId: string): Promise<SharedVisit> {
    const sharedVisit = await this.sharedVisitRepository.findOne({
      where: { id: shareId },
    });

    if (!sharedVisit) {
      throw new NotFoundException(`Shared visit not found`);
    }

    // Check if expired (410 Gone response)
    if (sharedVisit.expires_at) {
      const expiryDate = sharedVisit.expires_at instanceof Date
        ? sharedVisit.expires_at
        : new Date(sharedVisit.expires_at);
      if (expiryDate < new Date()) {
        throw new GoneException('This shared visit has expired');
      }
    }

    // Increment view count
    await this.incrementViewCount(shareId);

    // Return data with updated view count
    return {
      ...sharedVisit,
      view_count: (sharedVisit.view_count || 0) + 1,
    };
  }

  /**
   * Increment view count for shared visit
   */
  private async incrementViewCount(shareId: string): Promise<void> {
    await this.sharedVisitRepository
      .createQueryBuilder()
      .update()
      .set({ view_count: () => 'view_count + 1' })
      .where('id = :shareId', { shareId })
      .execute();
  }

  /**
   * Delete share link
   */
  async deleteShare(shareId: string, userId: string): Promise<void> {
    // Fetch shared visit with associated visit
    const sharedVisit = await this.sharedVisitRepository.findOne({
      where: { id: shareId },
      relations: ['visit'],
    });

    if (!sharedVisit) {
      throw new NotFoundException(`Shared visit not found`);
    }

    // Verify ownership
    const visit = await this.visitRepository.findOne({
      where: { id: sharedVisit.visit_id, user_id: userId },
    });

    if (!visit) {
      throw new NotFoundException(`Shared visit not found`);
    }

    await this.sharedVisitRepository.delete(shareId);
    this.logger.log(`Deleted shared visit ${shareId}`);
  }

  /**
   * Get all shares for a user
   */
  async getUserShares(userId: string): Promise<SharedVisit[]> {
    // Get all visits for the user
    const visits = await this.visitRepository.find({
      where: { user_id: userId },
      select: ['id'],
    });

    if (visits.length === 0) {
      return [];
    }

    const visitIds = visits.map((v) => v.id);

    // Get all shared visits for those visits
    const sharedVisits = await this.sharedVisitRepository
      .createQueryBuilder('shared')
      .where('shared.visit_id IN (:...visitIds)', { visitIds })
      .orderBy('shared.shared_at', 'DESC')
      .getMany();

    return sharedVisits;
  }
}
