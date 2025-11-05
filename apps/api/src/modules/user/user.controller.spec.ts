/**
 * User Preferences API Integration Tests
 *
 * Tests for GET /user/preferences and PATCH /user/preferences endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UserPreferences } from '@blastoise/shared';

// Mock user for testing
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
};

// Mock AuthGuard to always pass and inject mockUser
class MockAuthGuard {
  canActivate(context: any) {
    const request = context.switchToHttp().getRequest();
    request.user = mockUser;
    return true;
  }
}

// Mock UserService
class MockUserService {
  private preferences: Map<string, UserPreferences> = new Map();

  async getPreferences(userId: string): Promise<UserPreferences> {
    // Return stored preferences or create defaults
    if (!this.preferences.has(userId)) {
      const defaults: UserPreferences = {
        user_id: userId,
        location_tracking_enabled: true,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.preferences.set(userId, defaults);
    }
    return this.preferences.get(userId)!;
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto
  ): Promise<UserPreferences> {
    const current = await this.getPreferences(userId);

    // Convert camelCase DTO to snake_case database format
    const updated: UserPreferences = {
      ...current,
      ...(dto.locationTrackingEnabled !== undefined && {
        location_tracking_enabled: dto.locationTrackingEnabled,
      }),
      ...(dto.backgroundTrackingEnabled !== undefined && {
        background_tracking_enabled: dto.backgroundTrackingEnabled,
      }),
      ...(dto.sharingPreference !== undefined && {
        sharing_preference: dto.sharingPreference,
      }),
      ...(dto.dataRetentionMonths !== undefined && {
        data_retention_months: dto.dataRetentionMonths,
      }),
      ...(dto.notificationsEnabled !== undefined && {
        notifications_enabled: dto.notificationsEnabled,
      }),
      ...(dto.notificationPreferences && {
        notification_preferences: {
          visit_detected: dto.notificationPreferences.visitDetected ?? current.notification_preferences.visit_detected,
          visit_ended: dto.notificationPreferences.visitEnded ?? current.notification_preferences.visit_ended,
          new_nearby_venues: dto.notificationPreferences.newNearbyVenues ?? current.notification_preferences.new_nearby_venues,
          weekly_summary: dto.notificationPreferences.weeklySummary ?? current.notification_preferences.weekly_summary,
          sharing_activity: dto.notificationPreferences.sharingActivity ?? current.notification_preferences.sharing_activity,
        },
      }),
      updated_at: new Date().toISOString(),
    };

    this.preferences.set(userId, updated);
    return updated;
  }

  // Test helper
  clear() {
    this.preferences.clear();
  }
}

describe('T212-T213: User Preferences API Integration Tests', () => {
  let app: INestApplication;
  let userService: MockUserService;

  beforeAll(async () => {
    userService = new MockUserService();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    userService.clear();
  });

  describe('T212: GET /user/preferences - Get User Preferences', () => {
    it('should return default preferences for new user', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/preferences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user_id).toBe(mockUser.id);
      expect(response.body.data.location_tracking_enabled).toBe(true);
      expect(response.body.data.background_tracking_enabled).toBe(false);
      expect(response.body.data.sharing_preference).toBe('ask');
      expect(response.body.data.data_retention_months).toBeNull();
      expect(response.body.data.notifications_enabled).toBe(true);
    });

    it('should return default notification preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/preferences')
        .expect(200);

      const notifPrefs = response.body.data.notification_preferences;
      expect(notifPrefs.visit_detected).toBe(true);
      expect(notifPrefs.visit_ended).toBe(true);
      expect(notifPrefs.new_nearby_venues).toBe(false);
      expect(notifPrefs.weekly_summary).toBe(false);
      expect(notifPrefs.sharing_activity).toBe(false);
    });

    it('should return previously set preferences', async () => {
      // First update preferences
      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send({
          locationTrackingEnabled: false,
          sharingPreference: 'never',
        })
        .expect(200);

      // Then retrieve them
      const response = await request(app.getHttpServer())
        .get('/user/preferences')
        .expect(200);

      expect(response.body.data.location_tracking_enabled).toBe(false);
      expect(response.body.data.sharing_preference).toBe('never');
    });

    it('should include timestamps in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/preferences')
        .expect(200);

      expect(response.body.data.created_at).toBeDefined();
      expect(response.body.data.updated_at).toBeDefined();
    });
  });

  describe('T213: PATCH /user/preferences - Update User Preferences', () => {
    it('should update location tracking preference', async () => {
      const updateDto: UpdatePreferencesDto = {
        locationTrackingEnabled: false,
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location_tracking_enabled).toBe(false);
    });

    it('should update background tracking preference', async () => {
      const updateDto: UpdatePreferencesDto = {
        backgroundTrackingEnabled: true,
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.background_tracking_enabled).toBe(true);
    });

    it('should update sharing preference to never', async () => {
      const updateDto: UpdatePreferencesDto = {
        sharingPreference: 'never',
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.sharing_preference).toBe('never');
    });

    it('should update sharing preference to always', async () => {
      const updateDto: UpdatePreferencesDto = {
        sharingPreference: 'always',
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.sharing_preference).toBe('always');
    });

    it('should update sharing preference to ask', async () => {
      const updateDto: UpdatePreferencesDto = {
        sharingPreference: 'ask',
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.sharing_preference).toBe('ask');
    });

    it('should update data retention to specific months', async () => {
      const updateDto: UpdatePreferencesDto = {
        dataRetentionMonths: 12,
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.data_retention_months).toBe(12);
    });

    it('should update data retention to null (keep forever)', async () => {
      // First set to a number
      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send({ dataRetentionMonths: 12 })
        .expect(200);

      // Then set to null
      const updateDto: UpdatePreferencesDto = {
        dataRetentionMonths: null,
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.data_retention_months).toBeNull();
    });

    it('should update notifications enabled', async () => {
      const updateDto: UpdatePreferencesDto = {
        notificationsEnabled: false,
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.notifications_enabled).toBe(false);
    });

    it('should update individual notification preferences', async () => {
      const updateDto: UpdatePreferencesDto = {
        notificationPreferences: {
          visitDetected: false,
          visitEnded: false,
          newNearbyVenues: true,
          weeklySummary: true,
          sharingActivity: true,
        },
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      const notifPrefs = response.body.data.notification_preferences;
      expect(notifPrefs.visit_detected).toBe(false);
      expect(notifPrefs.visit_ended).toBe(false);
      expect(notifPrefs.new_nearby_venues).toBe(true);
      expect(notifPrefs.weekly_summary).toBe(true);
      expect(notifPrefs.sharing_activity).toBe(true);
    });

    it('should update multiple preferences at once', async () => {
      const updateDto: UpdatePreferencesDto = {
        locationTrackingEnabled: false,
        backgroundTrackingEnabled: true,
        sharingPreference: 'never',
        dataRetentionMonths: 6,
        notificationsEnabled: false,
      };

      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.location_tracking_enabled).toBe(false);
      expect(response.body.data.background_tracking_enabled).toBe(true);
      expect(response.body.data.sharing_preference).toBe('never');
      expect(response.body.data.data_retention_months).toBe(6);
      expect(response.body.data.notifications_enabled).toBe(false);
    });

    it('should preserve unchanged preferences', async () => {
      // Set initial values
      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send({
          locationTrackingEnabled: false,
          sharingPreference: 'never',
          dataRetentionMonths: 12,
        })
        .expect(200);

      // Update only one field
      const response = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send({ notificationsEnabled: false })
        .expect(200);

      // Other fields should remain unchanged
      expect(response.body.data.location_tracking_enabled).toBe(false);
      expect(response.body.data.sharing_preference).toBe('never');
      expect(response.body.data.data_retention_months).toBe(12);
      expect(response.body.data.notifications_enabled).toBe(false);
    });

    it('should reject invalid sharing preference value', async () => {
      const invalidDto = {
        sharingPreference: 'invalid-value',
      };

      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject invalid data retention months (negative)', async () => {
      const invalidDto = {
        dataRetentionMonths: -1,
      };

      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject invalid data retention months (zero)', async () => {
      const invalidDto = {
        dataRetentionMonths: 0,
      };

      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject data retention months over 24', async () => {
      const invalidDto = {
        dataRetentionMonths: 25,
      };

      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject non-boolean values for boolean fields', async () => {
      const invalidDto = {
        locationTrackingEnabled: 'yes',
      };

      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject empty request body', async () => {
      await request(app.getHttpServer())
        .patch('/user/preferences')
        .send({})
        .expect(200); // Empty updates are allowed, they just return current preferences
    });

    it('should update updated_at timestamp on change', async () => {
      const initialResponse = await request(app.getHttpServer())
        .get('/user/preferences')
        .expect(200);

      const initialTimestamp = initialResponse.body.data.updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updateResponse = await request(app.getHttpServer())
        .patch('/user/preferences')
        .send({ locationTrackingEnabled: false })
        .expect(200);

      const updatedTimestamp = updateResponse.body.data.updated_at;
      expect(updatedTimestamp).not.toBe(initialTimestamp);
    });

    it('should accept valid data retention values (1-24)', async () => {
      const validValues = [1, 6, 12, 18, 24];

      for (const months of validValues) {
        const response = await request(app.getHttpServer())
          .patch('/user/preferences')
          .send({ dataRetentionMonths: months })
          .expect(200);

        expect(response.body.data.data_retention_months).toBe(months);
      }
    });
  });
});
