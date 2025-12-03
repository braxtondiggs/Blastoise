import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import { UserPreferences } from '../../entities/user-preferences.entity';

const createUserRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

const createPrefsRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('UserService', () => {
  let userRepo: ReturnType<typeof createUserRepo>;
  let prefsRepo: ReturnType<typeof createPrefsRepo>;
  let service: UserService;

  beforeEach(() => {
    userRepo = createUserRepo();
    prefsRepo = createPrefsRepo();
    service = new UserService(userRepo as any, prefsRepo as any);
  });

  it('creates default preferences when missing', async () => {
    prefsRepo.findOne.mockResolvedValue(null);
    prefsRepo.create.mockImplementation((payload) => payload);
    prefsRepo.save.mockImplementation(async (payload) => ({
      ...payload,
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
    }) as UserPreferences);

    const prefs = await service.getPreferences('user-1');

    expect(prefsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1' })
    );
    expect(prefs.location_tracking_enabled).toBe(true);
    expect(prefs.user_id).toBe('user-1');
  });

  it('updates preferences with DTO mapping', async () => {
    const existing = {
      user_id: 'user-1',
      location_tracking_enabled: false,
      background_tracking_enabled: false,
      sharing_preference: 'ask',
      data_retention_months: null,
      notifications_enabled: true,
      notification_preferences: {
        visit_detected: true,
        visit_ended: true,
        new_nearby_venues: false,
        weekly_summary: false,
        sharing_activity: false,
      },
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
    } as UserPreferences;

    prefsRepo.findOne.mockResolvedValue(existing);
    prefsRepo.save.mockImplementation(async (payload) => ({
      ...existing,
      ...payload,
      updated_at: new Date('2024-02-01T00:00:00.000Z'),
    }));

    const result = await service.updatePreferences('user-1', {
      locationTrackingEnabled: true,
      notificationPreferences: {
        visitDetected: false,
        visitEnded: true,
        newNearbyVenues: true,
        weeklySummary: true,
        sharingActivity: false,
      },
    } as any);

    expect(prefsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        location_tracking_enabled: true,
        notification_preferences: expect.objectContaining({
          visit_detected: false,
          new_nearby_venues: true,
        }),
      })
    );
    expect(result.updated_at).toContain('2024-02-01');
  });

  it('returns onboarding status or throws when user missing', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.getOnboardingStatus('missing')).rejects.toBeInstanceOf(
      NotFoundException
    );

    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      onboarding_completed: true,
      updated_at: new Date('2024-03-01T00:00:00.000Z'),
    } as User);

    const status = await service.getOnboardingStatus('user-1');
    expect(status).toEqual({
      completed: true,
      completed_at: '2024-03-01T00:00:00.000Z',
    });
  });

  it('completes onboarding if not already done', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      onboarding_completed: false,
    } as User);

    await service.completeOnboarding('user-1');
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_completed: true })
    );
  });
});
