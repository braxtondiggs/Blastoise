/**
 * Tests preferences management with local and cloud storage:
 * - Default preferences initialization
 * - Update preferences with local storage
 * - Backend sync (success and failure scenarios)
 * - Reset to defaults
 * - Load from backend
 * - LocalStorage persistence
 */

import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PreferencesService, UserPreferences } from './preferences.service';

describe('PreferencesService', () => {
  let spectator: SpectatorService<PreferencesService>;
  let httpClient: SpyObject<HttpClient>;
  let localStorageMock: Record<string, string>;

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

  const createService = createServiceFactory({
    service: PreferencesService,
    mocks: [HttpClient],
  });

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => localStorageMock[key] || null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete localStorageMock[key];
    });

    spectator = createService();
    httpClient = spectator.inject(HttpClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should be created with default preferences', (done) => {
      spectator.service.getPreferences().subscribe((prefs) => {
        expect(prefs.locationTrackingEnabled).toBe(DEFAULT_PREFERENCES.locationTrackingEnabled);
        expect(prefs.sharingPreference).toBe(DEFAULT_PREFERENCES.sharingPreference);
        done();
      });
    });

    it('should return current preferences synchronously', () => {
      const current = spectator.service.getCurrentPreferences();
      expect(current.locationTrackingEnabled).toBe(DEFAULT_PREFERENCES.locationTrackingEnabled);
    });
  });

  describe('Update Preferences', () => {
    it('should update preferences locally when backend fails', (done) => {
      httpClient.patch.mockReturnValue(throwError(() => new Error('Network error')));

      const updates: Partial<UserPreferences> = {
        locationTrackingEnabled: false,
        sharingPreference: 'never',
      };

      spectator.service.updatePreferences(updates).subscribe((updated) => {
        expect(updated.locationTrackingEnabled).toBe(false);
        expect(updated.sharingPreference).toBe('never');
        done();
      });
    });

    it('should save preferences to localStorage immediately', (done) => {
      httpClient.patch.mockReturnValue(throwError(() => new Error('Network error')));

      const updates: Partial<UserPreferences> = {
        locationTrackingEnabled: false,
      };

      spectator.service.updatePreferences(updates).subscribe(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'blastoise_preferences',
          expect.stringContaining('"locationTrackingEnabled":false')
        );
        done();
      });
    });

    it('should sync with backend successfully', (done) => {
      const updates: Partial<UserPreferences> = {
        dataRetentionMonths: 12,
      };

      const serverResponse: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        ...updates,
      };

      httpClient.patch.mockReturnValue(of(serverResponse));

      spectator.service.updatePreferences(updates).subscribe((result) => {
        expect(result).toEqual(serverResponse);
        expect(result.dataRetentionMonths).toBe(12);
        done();
      });
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all preferences to default values', (done) => {
      httpClient.patch.mockReturnValue(throwError(() => new Error('Network error')));

      spectator.service.resetToDefaults().subscribe((result) => {
        expect(result.locationTrackingEnabled).toBe(DEFAULT_PREFERENCES.locationTrackingEnabled);
        expect(result.sharingPreference).toBe(DEFAULT_PREFERENCES.sharingPreference);
        done();
      });
    });
  });

  describe('Load from Backend', () => {
    it('should load preferences from backend successfully', (done) => {
      const backendPreferences: any = {
        user_id: 'user-1',
        location_tracking_enabled: false,
        background_tracking_enabled: false,
        sharing_preference: 'ask',
        data_retention_months: 24,
        notifications_enabled: true,
        notification_preferences: {
          visit_detected: true,
          visit_ended: true,
          new_nearby_venues: false,
          weekly_summary: false,
          sharing_activity: false,
        },
      };

      httpClient.get.mockReturnValue(of({ success: true, data: backendPreferences }));

      spectator.service.loadFromBackend().subscribe((result) => {
        expect(result.locationTrackingEnabled).toBe(false);
        expect(result.dataRetentionMonths).toBe(24);
        done();
      });
    });

    it('should fall back to local preferences if backend fails', (done) => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      httpClient.get.mockReturnValue(throwError(() => new Error('Network error')));

      spectator.service.loadFromBackend().subscribe((result) => {
        expect(result).toBeDefined();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        done();
      });
    });
  });

  describe('LocalStorage Error Handling', () => {
    it('should handle localStorage.setItem errors gracefully', (done) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      httpClient.patch.mockReturnValue(throwError(() => new Error('Network error')));

      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      spectator.service.updatePreferences({ locationTrackingEnabled: false }).subscribe(() => {
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        done();
      });
    });
  });

  describe('Notification Settings', () => {
    it('should update notification settings correctly', (done) => {
      httpClient.patch.mockReturnValue(throwError(() => new Error('Network error')));

      const updates = {
        visit_detected: false,
        visit_ended: false,
        new_venues_nearby: true,
        weekly_summary: true,
        sharing_activity: true,
      };

      spectator.service.updateNotificationSettings(updates).subscribe((result) => {
        expect(result.notification_settings).toEqual(updates);
        done();
      });
    });
  });

  describe('Data Retention', () => {
    it('should allow null dataRetentionMonths', (done) => {
      httpClient.patch.mockReturnValue(throwError(() => new Error('Network error')));

      spectator.service.updatePreferences({ dataRetentionMonths: null }).subscribe((result) => {
        expect(result.dataRetentionMonths).toBeNull();
        done();
      });
    });

    it('should allow numeric dataRetentionMonths', (done) => {
      httpClient.patch.mockReturnValue(throwError(() => new Error('Network error')));

      spectator.service.updatePreferences({ dataRetentionMonths: 18 }).subscribe((result) => {
        expect(result.dataRetentionMonths).toBe(18);
        done();
      });
    });
  });
});
