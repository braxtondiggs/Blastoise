jest.mock('@blastoise/shared', () => ({
  VisitValidation: {
    isValidTimeSequence: jest.fn(() => true),
  },
}));

import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { Visit } from '../../entities/visit.entity';

const mockUser = { user_id: 'user-1', email: 'test@example.com' };

const createVisit = (overrides: Partial<Visit> = {}): Visit => ({
  id: 'visit-1',
  user_id: 'user-1',
  venue_id: 'venue-1',
  arrival_time: new Date('2024-01-01T10:00:00.000Z'),
  is_active: true,
  detection_method: 'auto',
  synced: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('VisitsController', () => {
  let controller: VisitsController;
  let service: jest.Mocked<VisitsService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      batchSync: jest.fn(),
      getActiveVisit: jest.fn(),
    } as unknown as jest.Mocked<VisitsService>;

    controller = new VisitsController(service);
  });

  it('creates a visit and marks it synced', async () => {
    const visit = createVisit();
    service.create.mockResolvedValue(visit);

    const result = await controller.create(mockUser as any, {
      venue_id: 'venue-1',
      arrival_time: '2024-01-01T10:00:00.000Z',
      detection_method: 'auto',
      is_active: true,
    } as any);

    expect(service.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ venue_id: 'venue-1' })
    );
    expect(result.data?.synced).toBe(true);
    expect(result.success).toBe(true);
  });

  it('paginates visits and returns metadata', async () => {
    const visit = createVisit({ id: 'visit-2' });
    service.findAll.mockResolvedValue({ visits: [visit], total: 5 });

    const result = await controller.findAll(mockUser as any, '2', '2');

    expect(service.findAll).toHaveBeenCalledWith('user-1', 2, 2);
    expect(result.data?.[0].synced).toBe(true);
    expect(result.metadata?.pagination).toMatchObject({
      page: 2,
      limit: 2,
      total: 5,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it('returns a single visit with synced flag', async () => {
    const visit = createVisit({ id: 'visit-3', is_active: false });
    service.findOne.mockResolvedValue(visit);

    const result = await controller.findOne(mockUser as any, 'visit-3');

    expect(service.findOne).toHaveBeenCalledWith('visit-3', 'user-1');
    expect(result.data?.synced).toBe(true);
  });

  it('updates and deletes visits', async () => {
    const updatedVisit = createVisit({ id: 'visit-4', is_active: false });
    service.update.mockResolvedValue(updatedVisit);

    const updated = await controller.update(
      mockUser as any,
      'visit-4',
      { notes: 'updated' } as any
    );

    expect(service.update).toHaveBeenCalledWith('visit-4', 'user-1', { notes: 'updated' });
    expect(updated.data?.synced).toBe(true);

    await controller.delete(mockUser as any, 'visit-4');
    expect(service.delete).toHaveBeenCalledWith('visit-4', 'user-1');
  });

  it('returns active visit or undefined', async () => {
    const visit = createVisit({ id: 'active-1' });
    service.getActiveVisit.mockResolvedValue(visit);

    const active = await controller.getActive(mockUser as any);
    expect(active.data?.synced).toBe(true);

    service.getActiveVisit.mockResolvedValue(null as any);
    const none = await controller.getActive(mockUser as any);
    expect(none.data).toBeUndefined();
  });

  it('batch syncs visits and adds synced flag', async () => {
    const visits = [createVisit({ id: 'batch-1' }), createVisit({ id: 'batch-2' })];
    service.batchSync.mockResolvedValue(visits);

    const result = await controller.batchSync(mockUser as any, {
      visits: [],
    } as any);

    expect(service.batchSync).toHaveBeenCalledWith('user-1', { visits: [] });
    expect(result.data?.every((v) => v.synced)).toBe(true);
  });
});
