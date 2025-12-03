import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitValidation } from '@blastoise/shared';
import { Visit } from '../../entities/visit.entity';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { BatchVisitSyncDto } from './dto/batch-visit-sync.dto';

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>
  ) {}

  /**
   * Create a new visit (T092: POST /visits endpoint)
   */
  async create(userId: string, dto: CreateVisitDto): Promise<Visit> {
    // Validate timestamp sequence if departure_time provided
    if (dto.departure_time) {
      if (!VisitValidation.isValidTimeSequence(dto.arrival_time, dto.departure_time)) {
        throw new BadRequestException(
          'Departure time must be after arrival time'
        );
      }
    }

    try {
      const visit = this.visitRepository.create({
        ...dto,
        user_id: userId,
        arrival_time: new Date(dto.arrival_time),
        departure_time: dto.departure_time ? new Date(dto.departure_time) : undefined,
        detection_method: dto.detection_method || 'manual',
        is_active: dto.is_active ?? !dto.departure_time,
      });

      const savedVisit = await this.visitRepository.save(visit);
      this.logger.log(`Created visit ${savedVisit.id} for user ${userId}`);
      return savedVisit;
    } catch (error) {
      this.logger.error(`Failed to create visit: ${error}`);
      throw error;
    }
  }

  /**
   * Get all visits for a user with pagination (T093: GET /visits endpoint)
   */
  async findAll(
    userId: string,
    page = 1,
    limit = 50
  ): Promise<{ visits: Visit[]; total: number }> {
    // Validate pagination parameters
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    try {
      const offset = (page - 1) * limit;
      const [visits, total] = await this.visitRepository.findAndCount({
        where: { user_id: userId },
        order: { arrival_time: 'DESC' },
        skip: offset,
        take: limit,
      });

      this.logger.debug(
        `Retrieved ${visits.length} visits (page ${page}) for user ${userId}`
      );

      return { visits, total };
    } catch (error) {
      this.logger.error(`Failed to find visits: ${error}`);
      throw error;
    }
  }

  /**
   * Get a single visit by ID (T094: GET /visits/:id endpoint)
   */
  async findOne(visitId: string, userId: string): Promise<Visit> {
    try {
      const visit = await this.visitRepository.findOne({
        where: { id: visitId },
      });

      if (!visit) {
        throw new NotFoundException(`Visit with ID ${visitId} not found`);
      }

      // Ensure user owns this visit (Row-Level Security)
      if (visit.user_id !== userId) {
        throw new NotFoundException(`Visit with ID ${visitId} not found`);
      }

      return visit;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to find visit ${visitId}: ${error}`);
      throw error;
    }
  }

  /**
   * Update a visit (T095: PATCH /visits/:id endpoint)
   */
  async update(
    visitId: string,
    userId: string,
    dto: UpdateVisitDto
  ): Promise<Visit> {
    // Verify ownership first
    const existingVisit = await this.findOne(visitId, userId);

    // Validate departure time if provided
    if (dto.departure_time) {
      const arrivalTimeStr = existingVisit.arrival_time instanceof Date
        ? existingVisit.arrival_time.toISOString()
        : existingVisit.arrival_time;

      if (!VisitValidation.isValidTimeSequence(arrivalTimeStr, dto.departure_time)) {
        throw new BadRequestException(
          'Departure time must be after arrival time'
        );
      }

      // Calculate duration if departure time is set
      const duration = VisitValidation.calculateDuration(arrivalTimeStr, dto.departure_time);

      // Update with duration and mark as inactive
      await this.visitRepository.update(visitId, {
        ...dto,
        departure_time: new Date(dto.departure_time),
        duration_minutes: duration,
        is_active: false,
      });

      return this.findOne(visitId, userId);
    }

    try {
      await this.visitRepository.update(visitId, dto);
      const updated = await this.findOne(visitId, userId);
      this.logger.log(`Updated visit ${visitId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update visit ${visitId}: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a visit (T096: DELETE /visits/:id endpoint)
   */
  async delete(visitId: string, userId: string): Promise<void> {
    // Verify ownership
    await this.findOne(visitId, userId);

    try {
      await this.visitRepository.delete(visitId);
      this.logger.log(`Deleted visit ${visitId}`);
    } catch (error) {
      this.logger.error(`Failed to delete visit ${visitId}: ${error}`);
      throw error;
    }
  }

  /**
   * Batch sync visits from offline devices (T097: POST /visits/batch endpoint)
   * Uses upsert logic: updates existing visits or creates new ones based on
   * (user_id, venue_id, arrival_time) uniqueness
   */
  async batchSync(userId: string, dto: BatchVisitSyncDto): Promise<Visit[]> {
    if (!dto.visits || dto.visits.length === 0) {
      throw new BadRequestException('No visits provided for sync');
    }

    if (dto.visits.length > 100) {
      throw new BadRequestException(
        'Cannot sync more than 100 visits at once'
      );
    }

    // Validate all visits
    for (const visit of dto.visits) {
      if (visit.departure_time) {
        if (
          !VisitValidation.isValidTimeSequence(
            visit.arrival_time,
            visit.departure_time
          )
        ) {
          throw new BadRequestException(
            `Invalid time sequence for visit to venue ${visit.venue_id}`
          );
        }
      }
    }

    try {
      const syncedVisits: Visit[] = [];

      for (const visit of dto.visits) {
        const arrivalDate = new Date(visit.arrival_time);

        // Check for existing visit with same (user_id, venue_id, arrival_time)
        const existingVisit = await this.visitRepository.findOne({
          where: {
            user_id: userId,
            venue_id: visit.venue_id,
            arrival_time: arrivalDate,
          },
        });

        const duration =
          visit.departure_time
            ? VisitValidation.calculateDuration(
                visit.arrival_time,
                visit.departure_time
              )
            : undefined;

        if (existingVisit) {
          // Update existing visit (only if new data has more info)
          const updates: Partial<Visit> = {};

          // Update departure_time if provided and not already set
          if (visit.departure_time && !existingVisit.departure_time) {
            updates.departure_time = new Date(visit.departure_time);
            updates.duration_minutes = duration;
            updates.is_active = false;
          }

          // Update is_active if explicitly set to false
          if (visit.is_active === false && existingVisit.is_active) {
            updates.is_active = false;
          }

          if (Object.keys(updates).length > 0) {
            await this.visitRepository.update(existingVisit.id, updates);
            const updatedVisit = await this.visitRepository.findOne({
              where: { id: existingVisit.id },
            });
            if (updatedVisit) {
              syncedVisits.push(updatedVisit);
            }
          } else {
            // No updates needed, return existing visit
            syncedVisits.push(existingVisit);
          }
        } else {
          // Create new visit
          const newVisit = this.visitRepository.create({
            ...visit,
            user_id: userId,
            arrival_time: arrivalDate,
            departure_time: visit.departure_time ? new Date(visit.departure_time) : undefined,
            detection_method: visit.detection_method || 'auto',
            is_active: visit.is_active ?? !visit.departure_time,
            duration_minutes: duration,
          });

          const savedVisit = await this.visitRepository.save(newVisit);
          syncedVisits.push(savedVisit);
        }
      }

      this.logger.log(
        `Batch synced ${syncedVisits.length} visits for user ${userId}`
      );

      return syncedVisits;
    } catch (error) {
      this.logger.error(`Failed to batch sync visits: ${error}`);
      throw error;
    }
  }

  /**
   * Get currently active visit for a user (T098: GET /visits/active endpoint)
   */
  async getActiveVisit(userId: string): Promise<Visit | null> {
    try {
      const activeVisit = await this.visitRepository.findOne({
        where: { user_id: userId, is_active: true },
        order: { arrival_time: 'DESC' },
      });
      return activeVisit;
    } catch (error) {
      this.logger.error(`Failed to get active visit: ${error}`);
      throw error;
    }
  }
}
