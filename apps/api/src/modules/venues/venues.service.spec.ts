import { NotFoundException } from '@nestjs/common';
import { Venue } from '../../entities/venue.entity';
import { VenuesService } from './venues.service';

const createQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
});

describe('VenuesService', () => {
  const repository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as any;

  let service: VenuesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VenuesService(repository);
  });

  it('finds venue by id or throws', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException
    );

    const venue = { id: 'venue-1' } as Venue;
    repository.findOne.mockResolvedValue(venue);

    const result = await service.findById('venue-1');
    expect(result).toBe(venue);
  });

  it('searches venues with pagination and filters', async () => {
    const qb = createQueryBuilder();
    qb.getManyAndCount.mockResolvedValue([[{ id: 'v1' } as Venue], 1]);
    repository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.search({
      query: 'brew',
      type: 'brewery',
      page: '2',
      limit: '10',
    });

    expect(qb.where).toHaveBeenCalledWith('venue.name ILIKE :query', {
      query: '%brew%',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('venue.venue_type = :type', {
      type: 'brewery',
    });
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({ venues: [{ id: 'v1' }], total: 1 });
  });

  it('finds nearby venues within radius', async () => {
    const qb = createQueryBuilder();
    qb.take.mockReturnThis();
    qb.getMany.mockResolvedValue([
      { id: 'near', latitude: 40, longitude: -70 } as any,
      { id: 'far', latitude: 50, longitude: -80 } as any,
    ]);
    repository.createQueryBuilder.mockReturnValue(qb);

    const results = await service.findNearby({
      latitude: 40,
      longitude: -70,
      radius: 5,
      limit: 5,
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('venue');
    expect(results[0].id).toBe('near');
    expect(results).toHaveLength(1);
  });
});
