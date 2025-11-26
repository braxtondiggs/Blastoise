/**
 * User Service
 *
 * Business logic for user preferences management using TypeORM
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserPreferences,
  NotificationPreferences,
} from '../../entities/user-preferences.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

export interface UserPreferencesResponse {
  user_id: string;
  location_tracking_enabled: boolean;
  background_tracking_enabled: boolean;
  sharing_preference: 'never' | 'ask' | 'always';
  data_retention_months: number | null;
  notifications_enabled: boolean;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<
  UserPreferences,
  'user_id' | 'user' | 'created_at' | 'updated_at'
> = {
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
};

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>
  ) {}

  /**
   * Get user preferences
   * Creates default preferences if none exist
   */
  async getPreferences(userId: string): Promise<UserPreferencesResponse> {
    let preferences = await this.preferencesRepository.findOne({
      where: { user_id: userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return this.toResponse(preferences);
  }

  /**
   * Update user preferences
   * Merges with existing preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto
  ): Promise<UserPreferencesResponse> {
    let preferences = await this.preferencesRepository.findOne({
      where: { user_id: userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    // Merge updates
    const updates = this.convertDtoToEntity(dto);
    Object.assign(preferences, updates);

    const saved = await this.preferencesRepository.save(preferences);
    return this.toResponse(saved);
  }

  /**
   * Create default preferences for new user
   * Called during registration or first preferences access
   */
  async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    const newPreferences = this.preferencesRepository.create({
      user_id: userId,
      ...DEFAULT_PREFERENCES,
    });

    return this.preferencesRepository.save(newPreferences);
  }

  /**
   * Convert entity to API response format
   */
  private toResponse(prefs: UserPreferences): UserPreferencesResponse {
    return {
      user_id: prefs.user_id,
      location_tracking_enabled: prefs.location_tracking_enabled,
      background_tracking_enabled: prefs.background_tracking_enabled,
      sharing_preference: prefs.sharing_preference,
      data_retention_months: prefs.data_retention_months,
      notifications_enabled: prefs.notifications_enabled,
      notification_preferences: prefs.notification_preferences,
      created_at:
        prefs.created_at instanceof Date
          ? prefs.created_at.toISOString()
          : prefs.created_at,
      updated_at:
        prefs.updated_at instanceof Date
          ? prefs.updated_at.toISOString()
          : prefs.updated_at,
    };
  }

  /**
   * Convert DTO from camelCase to entity format
   */
  private convertDtoToEntity(
    dto: UpdatePreferencesDto
  ): Partial<UserPreferences> {
    const converted: Partial<UserPreferences> = {};

    if (dto.locationTrackingEnabled !== undefined) {
      converted.location_tracking_enabled = dto.locationTrackingEnabled;
    }
    if (dto.backgroundTrackingEnabled !== undefined) {
      converted.background_tracking_enabled = dto.backgroundTrackingEnabled;
    }
    if (dto.sharingPreference !== undefined) {
      converted.sharing_preference = dto.sharingPreference;
    }
    if (dto.dataRetentionMonths !== undefined) {
      converted.data_retention_months = dto.dataRetentionMonths;
    }
    if (dto.notificationsEnabled !== undefined) {
      converted.notifications_enabled = dto.notificationsEnabled;
    }
    if (dto.notificationPreferences !== undefined) {
      converted.notification_preferences = {
        visit_detected: dto.notificationPreferences.visitDetected,
        visit_ended: dto.notificationPreferences.visitEnded,
        new_nearby_venues: dto.notificationPreferences.newNearbyVenues,
        weekly_summary: dto.notificationPreferences.weeklySummary,
        sharing_activity: dto.notificationPreferences.sharingActivity,
      };
    }

    return converted;
  }
}
