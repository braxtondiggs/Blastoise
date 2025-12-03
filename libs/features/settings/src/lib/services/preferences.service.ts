/**
 * Manages user preferences with local and cloud storage:
 * - Privacy settings (sharing, tracking)
 * - Notification preferences
 * - Data retention settings
 * - Syncs with backend when authenticated
 */

import { Injectable, inject, Inject, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '@blastoise/shared';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Backend returns snake_case format
interface BackendPreferences {
  user_id: string;
  location_tracking_enabled: boolean;
  background_tracking_enabled: boolean;
  sharing_preference: 'never' | 'ask' | 'always';
  data_retention_months: number | null;
  notifications_enabled: boolean;
  notification_preferences?: {
    visit_detected?: boolean;
    visit_ended?: boolean;
    new_nearby_venues?: boolean;
    weekly_summary?: boolean;
    sharing_activity?: boolean;
  };
}

export interface NotificationSettings {
  visit_detected?: boolean;
  visit_ended?: boolean;
  new_venues_nearby?: boolean;
  weekly_summary?: boolean;
  sharing_activity?: boolean;
}

export interface UserPreferences {
  locationTrackingEnabled: boolean;
  backgroundTrackingEnabled: boolean;
  sharingPreference: 'never' | 'ask' | 'always';
  dataRetentionMonths: number | null; // null = keep forever
  notificationsEnabled: boolean;
  notification_settings?: NotificationSettings;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  locationTrackingEnabled: true,
  backgroundTrackingEnabled: false,
  sharingPreference: 'ask',
  dataRetentionMonths: null,
  notificationsEnabled: true,
  notification_settings: {
    visit_detected: true,
    visit_ended: true,
    new_venues_nearby: false,
    weekly_summary: false,
    sharing_activity: false,
  },
};

const STORAGE_KEY = 'blastoise_preferences';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private readonly http = inject(HttpClient);
  private readonly preferences$ = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);
  private readonly apiUrl: string;

  constructor(@Optional() @Inject(API_BASE_URL) apiUrl?: string) {
    // Default to localhost if not provided
    this.apiUrl = apiUrl || 'http://localhost:3000/api/v1';
    // Load from local storage on init
    this.loadFromLocalStorage();
  }

  /**
   * Get current preferences as Observable
   */
  getPreferences(): Observable<UserPreferences> {
    return this.preferences$.asObservable();
  }

  /**
   * Get current preferences synchronously
   */
  getCurrentPreferences(): UserPreferences {
    return this.preferences$.value;
  }

  /**
   * Update preferences (saves locally and syncs to backend if authenticated)
   */
  updatePreferences(preferences: Partial<UserPreferences>): Observable<UserPreferences> {
    const updated = { ...this.preferences$.value, ...preferences };

    // Save to local storage immediately
    this.saveToLocalStorage(updated);

    // Update in-memory state
    this.preferences$.next(updated);

    // Try to sync with backend (will fail gracefully if not authenticated)
    return this.syncToBackend(updated).pipe(
      tap((synced) => {
        // Update with any server-side changes
        this.preferences$.next(synced);
        this.saveToLocalStorage(synced);
      }),
      catchError((error) => {
        console.warn('Failed to sync preferences to backend:', error);
        // Return local preferences even if sync fails
        return of(updated);
      })
    );
  }

  /**
   * Update notification settings only
   */
  updateNotificationSettings(settings: NotificationSettings): Observable<UserPreferences> {
    return this.updatePreferences({
      notification_settings: settings,
    });
  }

  /**
   * Reset preferences to defaults
   */
  resetToDefaults(): Observable<UserPreferences> {
    return this.updatePreferences(DEFAULT_PREFERENCES);
  }

  /**
   * Load preferences from backend (for authenticated users)
   */
  loadFromBackend(): Observable<UserPreferences> {
    return this.http.get<ApiResponse<BackendPreferences>>(`${this.apiUrl}/user/preferences`).pipe(
      map((response) => this.mapBackendToFrontend(response.data)),
      tap((preferences) => {
        this.preferences$.next(preferences);
        this.saveToLocalStorage(preferences);
      }),
      catchError((error) => {
        console.warn('Failed to load preferences from backend:', error);
        // Fall back to local storage
        return of(this.preferences$.value);
      })
    );
  }

  /**
   * Map backend snake_case format to frontend camelCase format
   */
  private mapBackendToFrontend(backend: BackendPreferences): UserPreferences {
    return {
      locationTrackingEnabled: backend.location_tracking_enabled ?? true,
      backgroundTrackingEnabled: backend.background_tracking_enabled ?? false,
      sharingPreference: backend.sharing_preference ?? 'ask',
      dataRetentionMonths: backend.data_retention_months ?? null,
      notificationsEnabled: backend.notifications_enabled ?? true,
      notification_settings: backend.notification_preferences ? {
        visit_detected: backend.notification_preferences.visit_detected,
        visit_ended: backend.notification_preferences.visit_ended,
        new_venues_nearby: backend.notification_preferences.new_nearby_venues,
        weekly_summary: backend.notification_preferences.weekly_summary,
        sharing_activity: backend.notification_preferences.sharing_activity,
      } : this.preferences$.value.notification_settings,
    };
  }

  private syncToBackend(preferences: UserPreferences): Observable<UserPreferences> {
    // Transform frontend format to backend DTO format (camelCase for DTO validation)
    const dto = {
      locationTrackingEnabled: preferences.locationTrackingEnabled,
      backgroundTrackingEnabled: preferences.backgroundTrackingEnabled,
      sharingPreference: preferences.sharingPreference,
      dataRetentionMonths: preferences.dataRetentionMonths,
      notificationsEnabled: preferences.notificationsEnabled,
      notificationPreferences: preferences.notification_settings ? {
        visitDetected: preferences.notification_settings.visit_detected,
        visitEnded: preferences.notification_settings.visit_ended,
        newNearbyVenues: preferences.notification_settings.new_venues_nearby,
        weeklySummary: preferences.notification_settings.weekly_summary,
        sharingActivity: preferences.notification_settings.sharing_activity,
      } : undefined,
    };

    return this.http.patch<ApiResponse<BackendPreferences>>(`${this.apiUrl}/user/preferences`, dto).pipe(
      map((response) => this.mapBackendToFrontend(response.data))
    );
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        this.preferences$.next({ ...DEFAULT_PREFERENCES, ...preferences });
      }
    } catch (error) {
      console.error('Failed to load preferences from local storage:', error);
    }
  }

  private saveToLocalStorage(preferences: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences to local storage:', error);
    }
  }
}
