jest.mock('@blastoise/shared', () => ({
  VisitValidation: {
    isValidTimeSequence: jest.fn((arrival: string, departure?: string) => {
      if (!departure) return true;
      return new Date(departure).getTime() > new Date(arrival).getTime();
    }),
    calculateDuration: jest.fn((arrival: string, departure: string) =>
      Math.round(
        (new Date(departure).getTime() - new Date(arrival).getTime()) /
          (1000 * 60)
      )
    ),
  },
}));

import { VisitValidation } from '@blastoise/shared';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { Visit } from '../../entities/visit.entity';

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('VisitsService', () => {
  let service: VisitsService;
  let repository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    repository = createMockRepository();
    service = new VisitsService(repository as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('throws when departure time is before arrival', async () => {
    const dto = {
      venue_id: 'venue-1',
      arrival_time: '2024-01-01T10:00:00.000Z',
      departure_time: '2024-01-01T09:00:00.000Z',
    } as any;

    await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('creates a visit with defaults and converts dates', async () => {
    const dto = {
      venue_id: 'venue-1',
      arrival_time: '2024-01-01T10:00:00.000Z',
      detection_method: undefined,
      is_active: undefined,
    } as any;

    repository.create.mockImplementation((payload) => ({
      id: 'visit-1',
      ...payload,
    }));
    repository.save.mockImplementation(async (payload) => payload as Visit);

    const result = await service.create('user-1', dto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        detection_method: 'manual',
        is_active: true,
        arrival_time: expect.any(Date),
      })
    );
    expect(result.id).toBe('visit-1');
  });

  it('throws NotFound when visit does not exist or belongs to another user', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException
    );

    repository.findOne.mockResolvedValue({
      id: 'visit-1',
      user_id: 'other-user',
    } as Visit);

    await expect(service.findOne('visit-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('updates a visit with departure time and duration', async () => {
    const existingVisit = {
      id: 'visit-1',
      user_id: 'user-1',
      arrival_time: new Date('2024-01-01T10:00:00.000Z'),
    } as Visit;

    const findOneSpy = jest.spyOn(service, 'findOne');
    findOneSpy
      .mockResolvedValueOnce(existingVisit)
      .mockResolvedValueOnce({ ...existingVisit, is_active: false } as Visit);
    const durationSpy = jest
      .spyOn(VisitValidation, 'calculateDuration')
      .mockReturnValue(60);

    repository.update.mockResolvedValue({} as any);

    const result = await service.update('visit-1', 'user-1', {
      departure_time: '2024-01-01T11:00:00.000Z',
    });

    expect(durationSpy).toHaveBeenCalledWith(
      existingVisit.arrival_time.toISOString(),
      '2024-01-01T11:00:00.000Z'
    );
    expect(repository.update).toHaveBeenCalledWith(
      'visit-1',
      expect.objectContaining({
        departure_time: expect.any(Date),
        duration_minutes: 60,
        is_active: false,
      })
    );
    expect(result.is_active).toBe(false);
  });

  it('throws when batch sync payload is invalid', async () => {
    await expect(
      service.batchSync('user-1', { visits: [] } as any)
    ).rejects.toBeInstanceOf(BadRequestException);

    const largePayload = { visits: Array.from({ length: 101 }, (_, i) => ({ venue_id: `v-${i}`, arrival_time: new Date().toISOString() })) } as any;
    await expect(service.batchSync('user-1', largePayload)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('batch syncs visits with duration and defaults', async () => {
    const visits = [
      {
        venue_id: 'v-1',
        arrival_time: '2024-01-01T10:00:00.000Z',
        departure_time: '2024-01-01T11:00:00.000Z',
      },
      {
        venue_id: 'v-2',
        arrival_time: '2024-01-02T10:00:00.000Z',
      },
    ] as any[];

    repository.create.mockImplementation((payload) => ({
      id: payload.venue_id,
      ...payload,
    }));
    repository.save.mockImplementation(async (payloads) =>
      (payloads as Visit[]).map((p, idx) => ({
        ...p,
        id: `visit-${idx + 1}`,
      }))
    );

    const result = await service.batchSync('user-1', { visits });

    expect(repository.save).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'visit-1',
      user_id: 'user-1',
      detection_method: 'auto',
      is_active: false,
      duration_minutes: expect.any(Number),
    });
    expect(result[1].is_active).toBe(true);
  });

  it('retrieves active visit for user', async () => {
    repository.findOne.mockResolvedValue({ id: 'active', is_active: true } as Visit);

    const visit = await service.getActiveVisit('user-1');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { user_id: 'user-1', is_active: true },
      order: { arrival_time: 'DESC' },
    });
    expect(visit?.id).toBe('active');
  });
});
