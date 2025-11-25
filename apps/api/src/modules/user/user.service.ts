/**
 * User Service
 *
 * Business logic for user preferences management
 */

import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@blastoise/data-backend';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

export interface UserPreferences {
  user_id: string;
  location_tracking_enabled: boolean;
  background_tracking_enabled: boolean;
  sharing_preference: 'never' | 'ask' | 'always';
  data_retention_months: number | null;
  notifications_enabled: boolean;
  notification_preferences: {
    visit_detected?: boolean;
    visit_ended?: boolean;
    new_nearby_venues?: boolean;
    weekly_summary?: boolean;
    sharing_activity?: boolean;
  };
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES = {
  location_tracking_enabled: true,
  background_tracking_enabled: false,
  sharing_preference: 'ask' as const,
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
  /**
   * Get user preferences
   * Creates default preferences if none exist
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No preferences found - create defaults
      return this.createDefaultPreferences(userId);
    }

    if (error) {
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    return data as UserPreferences;
  }

  /**
   * Update user preferences
   * Merges with existing preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto
  ): Promise<UserPreferences> {
    const supabase = getSupabaseClient();

    // Get current preferences or create defaults
    const current = await this.getPreferences(userId);

    // Merge updates
    const updated = {
      ...current,
      ...this.convertDtoToDb(dto),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updated, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }

    return data as UserPreferences;
  }

  /**
   * Create default preferences for new user
   */
  private async createDefaultPreferences(
    userId: string
  ): Promise<UserPreferences> {
    const supabase = getSupabaseClient();

    const newPreferences = {
      user_id: userId,
      ...DEFAULT_PREFERENCES,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .insert(newPreferences)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default preferences: ${error.message}`);
    }

    return data as UserPreferences;
  }

  /**
   * Convert DTO from camelCase to snake_case for database
   */
  private convertDtoToDb(dto: UpdatePreferencesDto): Partial<UserPreferences> {
    const converted: any = {};

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
