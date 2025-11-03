/**
 * User Model
 * Represents an authenticated user of the application
 */

export type SharingDefault = 'never' | 'ask' | 'always';

export interface NotificationSettings {
  visit_detected: boolean; // Notify on visit detection (default: true)
  visit_ended: boolean; // Notify on visit end (default: true)
  new_venues_nearby: boolean; // Notify about new venues (default: false)
  weekly_summary: boolean; // Weekly visit summary (default: false)
  sharing_activity: boolean; // Notify on share views (default: false)
}

export interface PrivacySettings {
  store_visit_history: boolean; // Enable cloud sync (default: true)
  anonymous_mode: boolean; // Local-only mode, no server sync (default: false)
}

export interface MapSettings {
  default_radius_km: number; // Default proximity search radius (default: 5, min: 1, max: 50)
  cluster_markers: boolean; // Enable map clustering (default: true)
}

export interface UserPreferences {
  location_tracking_enabled: boolean; // Master toggle for visit detection (default: false)
  sharing_default: SharingDefault; // Default sharing behavior (default: 'ask')
  notification_settings: NotificationSettings;
  privacy_settings: PrivacySettings;
  map_settings: MapSettings;
}

export interface User {
  id: string; // UUID, maps to Supabase auth.uid()
  email: string; // User's email address
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  preferences: UserPreferences;
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  location_tracking_enabled: false,
  sharing_default: 'ask',
  notification_settings: {
    visit_detected: true,
    visit_ended: true,
    new_venues_nearby: false,
    weekly_summary: false,
    sharing_activity: false,
  },
  privacy_settings: {
    store_visit_history: true,
    anonymous_mode: false,
  },
  map_settings: {
    default_radius_km: 5,
    cluster_markers: true,
  },
};

/**
 * Update User Preferences DTO
 */
export type UpdateUserPreferencesDto = Partial<UserPreferences>;

/**
 * User preferences validation functions
 */
export const UserPreferencesValidation = {
  isValidRadius: (radius: number): boolean => radius >= 1 && radius <= 50,
  isValidSharingDefault: (value: string): value is SharingDefault =>
    ['never', 'ask', 'always'].includes(value),
};
