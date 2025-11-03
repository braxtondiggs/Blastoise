/**
 * T195: Preferences Service
 *
 * Manages user preferences with local and cloud storage:
 * - Privacy settings (sharing, tracking)
 * - Notification preferences
 * - Data retention settings
 * - Syncs with backend when authenticated
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

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

  constructor() {
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
    // TODO: Replace with actual API endpoint when backend is ready
    const apiUrl = '/api/v1/user/preferences';

    return this.http.get<UserPreferences>(apiUrl).pipe(
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

  private syncToBackend(preferences: UserPreferences): Observable<UserPreferences> {
    // TODO: Replace with actual API endpoint when backend is ready
    const apiUrl = '/api/v1/user/preferences';

    return this.http.patch<UserPreferences>(apiUrl, preferences);
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
