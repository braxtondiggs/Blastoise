import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../../entities/venue.entity';
import { SearchVenuesDto } from './dto/search-venues.dto';
import { NearbyVenuesDto } from './dto/nearby-venues.dto';

@Injectable()
export class VenuesService {

  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>
  ) {}

  async findById(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return venue;
  }

  async search(dto: SearchVenuesDto): Promise<{ venues: Venue[]; total: number }> {
    const page = parseInt(dto.page || '1', 10);
    const limit = parseInt(dto.limit || '50', 10);
    const offset = (page - 1) * limit;

    const queryBuilder = this.venueRepository.createQueryBuilder('venue');

    if (dto.query) {
      queryBuilder.where('venue.name ILIKE :query', { query: `%${dto.query}%` });
    }

    if (dto.type) {
      queryBuilder.andWhere('venue.venue_type = :type', { type: dto.type });
    }

    const [venues, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { venues, total };
  }

  /**
   * Find nearby venues with distance calculation
   */
  async findNearby(dto: NearbyVenuesDto): Promise<VenueWithDistance[]> {
    const radiusKm = dto.radius || 5;
    const limit = dto.limit || 50;

    // Convert km to degrees (approximate at equator: 1 degree ≈ 111km)
    const radiusDegrees = radiusKm / 111;

    const queryBuilder = this.venueRepository
      .createQueryBuilder('venue')
      .where('venue.latitude BETWEEN :minLat AND :maxLat', {
        minLat: dto.latitude - radiusDegrees,
        maxLat: dto.latitude + radiusDegrees,
      })
      .andWhere('venue.longitude BETWEEN :minLng AND :maxLng', {
        minLng: dto.longitude - radiusDegrees,
        maxLng: dto.longitude + radiusDegrees,
      });

    if (dto.type) {
      queryBuilder.andWhere('venue.venue_type = :type', { type: dto.type });
    }

    const venues = await queryBuilder.take(limit * 2).getMany();

    // Calculate actual distances using Haversine formula
    const venuesWithDistance: VenueWithDistance[] = venues.map((venue) => {
      const distance = this.calculateHaversineDistance(
        dto.latitude,
        dto.longitude,
        Number(venue.latitude),
        Number(venue.longitude)
      );
      return { ...venue, distance };
    });

    // Filter by actual radius and sort by distance
    return venuesWithDistance
      .filter((v) => v.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

/**
 * Venue with distance from user location
 */
export interface VenueWithDistance extends Venue {
  distance: number; // Distance in kilometers
}
