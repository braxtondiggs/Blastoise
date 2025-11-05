/**
 * Tests preferences management with local and cloud storage:
 * - Default preferences initialization
 * - Update preferences with local storage
 * - Backend sync (success and failure scenarios)
 * - Reset to defaults
 * - Load from backend
 * - LocalStorage persistence
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PreferencesService, UserPreferences } from './preferences.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let httpClientMock: jasmine.SpyObj<HttpClient>;
  let localStorageMock: Record<string, string>;

  const DEFAULT_PREFERENCES: UserPreferences = {
    locationTrackingEnabled: true,
    backgroundTrackingEnabled: false,
    sharingPreference: 'ask',
    dataRetentionMonths: null,
    notificationsEnabled: true,
    notificationPreferences: {
      visitDetected: true,
      visitEnded: true,
      newNearbyVenues: false,
      weeklySummary: false,
      sharingActivity: false,
    },
  };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: jest.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
      configurable: true,
    });

    // Mock HttpClient
    httpClientMock = jasmine.createSpyObj('HttpClient', ['get', 'patch']);

    TestBed.configureTestingModule({
      providers: [
        PreferencesService,
        { provide: HttpClient, useValue: httpClientMock },
      ],
    });

    service = TestBed.inject(PreferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be created with default preferences', (done) => {
      service.getPreferences().subscribe((prefs) => {
        expect(prefs).toEqual(DEFAULT_PREFERENCES);
        done();
      });
    });

    it('should return current preferences synchronously', () => {
      const current = service.getCurrentPreferences();
      expect(current).toEqual(DEFAULT_PREFERENCES);
    });
  });

  describe('Update Preferences', () => {
    it('should update preferences locally when backend fails', (done) => {
      httpClientMock.patch.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      const updates: Partial<UserPreferences> = {
        locationTrackingEnabled: false,
        sharingPreference: 'never',
      };

      service.updatePreferences(updates).subscribe((updated) => {
        expect(updated.locationTrackingEnabled).toBe(false);
        expect(updated.sharingPreference).toBe('never');
        done();
      });
    });

    it('should save preferences to localStorage immediately', (done) => {
      httpClientMock.patch.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      const updates: Partial<UserPreferences> = {
        locationTrackingEnabled: false,
      };

      service.updatePreferences(updates).subscribe(() => {
        expect(global.localStorage.setItem).toHaveBeenCalledWith(
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

      httpClientMock.patch.and.returnValue(of(serverResponse));

      service.updatePreferences(updates).subscribe((result) => {
        expect(result).toEqual(serverResponse);
        expect(result.dataRetentionMonths).toBe(12);
        done();
      });
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all preferences to default values', (done) => {
      httpClientMock.patch.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      service.resetToDefaults().subscribe((result) => {
        expect(result).toEqual(DEFAULT_PREFERENCES);
        done();
      });
    });
  });

  describe('Load from Backend', () => {
    it('should load preferences from backend successfully', (done) => {
      const backendPreferences: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        locationTrackingEnabled: false,
        dataRetentionMonths: 24,
      };

      httpClientMock.get.and.returnValue(of(backendPreferences));

      service.loadFromBackend().subscribe((result) => {
        expect(result).toEqual(backendPreferences);
        done();
      });
    });

    it('should fall back to local preferences if backend fails', (done) => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      httpClientMock.get.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      // Set local state first
      const current = service.getCurrentPreferences();
      (service as any).preferences$.next({ ...current, dataRetentionMonths: 6 });

      service.loadFromBackend().subscribe((result) => {
        expect(result.dataRetentionMonths).toBe(6);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        done();
      });
    });
  });

  describe('LocalStorage Error Handling', () => {
    it('should handle localStorage.setItem errors gracefully', (done) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      httpClientMock.patch.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      (global.localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      service.updatePreferences({ locationTrackingEnabled: false }).subscribe(() => {
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        done();
      });
    });
  });

  describe('Notification Preferences', () => {
    it('should update notification preferences correctly', (done) => {
      httpClientMock.patch.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      const updates: Partial<UserPreferences> = {
        notificationPreferences: {
          visitDetected: false,
          visitEnded: false,
          newNearbyVenues: true,
          weeklySummary: true,
          sharingActivity: true,
        },
      };

      service.updatePreferences(updates).subscribe((result) => {
        expect(result.notificationPreferences).toEqual(updates.notificationPreferences);
        done();
      });
    });
  });

  describe('Data Retention', () => {
    it('should allow null dataRetentionMonths', (done) => {
      httpClientMock.patch.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      service.updatePreferences({ dataRetentionMonths: null }).subscribe((result) => {
        expect(result.dataRetentionMonths).toBeNull();
        done();
      });
    });

    it('should allow numeric dataRetentionMonths', (done) => {
      httpClientMock.patch.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      service.updatePreferences({ dataRetentionMonths: 18 }).subscribe((result) => {
        expect(result.dataRetentionMonths).toBe(18);
        done();
      });
    });
  });
});
