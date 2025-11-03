/**
 * T233, T234: Notification Service Tests
 *
 * Tests for notification permission handling and preferences persistence:
 * - Permission request handling
 * - Permission denial tracking
 * - Browser-specific instructions
 * - Preferences persistence to localStorage
 * - Notification sending
 *
 * Phase 7: Notifications & Observability
 */

import { TestBed } from '@angular/core/testing';
import { NotificationService, NotificationPreferences } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNotification: any;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    jest.spyOn(Storage.prototype, 'getItem')
      .mockImplementation((key: string) => localStorageMock[key] || null);
    jest.spyOn(Storage.prototype, 'setItem')
      .mockImplementation((key: string, value: string) => {
        localStorageMock[key] = value;
      });
    jest.spyOn(Storage.prototype, 'removeItem')
      .mockImplementation((key: string) => {
        delete localStorageMock[key];
      });

    // Mock Notification API
    mockNotification = {
      permission: 'default',
      requestPermission: jest.fn(),
    };

    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: mockNotification,
    });

    TestBed.configureTestingModule({
      providers: [NotificationService],
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('T233: Permission Handling', () => {
    it('should request permission successfully when granted', async () => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission = jest.fn().mockResolvedValue('granted');

      const result = await service.requestPermission();

      expect(result).toBe('granted');
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(service.getCurrentPermission()).toBe('granted');
    });

    it('should handle permission denial gracefully', async () => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission = jest.fn().mockResolvedValue('denied');

      const result = await service.requestPermission();

      expect(result).toBe('denied');
      expect(localStorageMock['notification_denied']).toBe('true');
      expect(localStorageMock['notification_denied_at']).toBeDefined();
    });

    it('should return denied immediately if already denied', async () => {
      mockNotification.permission = 'denied';

      const result = await service.requestPermission();

      expect(result).toBe('denied');
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
      expect(service.wasPermissionDenied()).toBe(true);
    });

    it('should clear denial tracking when permission granted', async () => {
      // Set up previous denial
      localStorageMock['notification_denied'] = 'true';
      localStorageMock['notification_denied_at'] = new Date().toISOString();

      mockNotification.permission = 'default';
      mockNotification.requestPermission = jest.fn().mockResolvedValue('granted');

      await service.requestPermission();

      expect(localStorageMock['notification_denied']).toBeUndefined();
      expect(localStorageMock['notification_denied_at']).toBeUndefined();
    });

    it('should handle missing Notification API', async () => {
      // Remove Notification API
      Object.defineProperty(window, 'Notification', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      const result = await service.requestPermission();

      expect(result).toBe('denied');
    });

    it('should handle request permission errors', async () => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission = jest.fn().mockRejectedValue(new Error('Permission error'));

      const result = await service.requestPermission();

      expect(result).toBe('denied');
      expect(service.wasPermissionDenied()).toBe(true);
    });
  });

  describe('T225: Permission Denial Handling', () => {
    it('should track permission denial', () => {
      service.handlePermissionDenial();

      expect(localStorageMock['notification_denied']).toBe('true');
      expect(localStorageMock['notification_denied_at']).toBeDefined();
      expect(service.wasPermissionDenied()).toBe(true);
    });

    it('should clear denial tracking', () => {
      localStorageMock['notification_denied'] = 'true';
      localStorageMock['notification_denied_at'] = new Date().toISOString();

      service.clearDenialTracking();

      expect(localStorageMock['notification_denied']).toBeUndefined();
      expect(localStorageMock['notification_denied_at']).toBeUndefined();
      expect(service.wasPermissionDenied()).toBe(false);
    });

    it('should provide Chrome-specific enable instructions', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      });

      const instructions = service.getEnableInstructions();

      expect(instructions).toContain('lock icon');
      expect(instructions).toContain('address bar');
    });

    it('should provide Firefox-specific enable instructions', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Firefox/120.0',
      });

      const instructions = service.getEnableInstructions();

      expect(instructions).toContain('Permissions');
    });

    it('should provide Safari-specific enable instructions', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      });

      const instructions = service.getEnableInstructions();

      expect(instructions).toContain('Safari');
      expect(instructions).toContain('Preferences');
    });

    it('should provide generic enable instructions for unknown browsers', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Unknown Browser',
      });

      const instructions = service.getEnableInstructions();

      expect(instructions).toContain('browser settings');
    });
  });

  describe('T234: Preferences Persistence', () => {
    it('should save preferences to localStorage', () => {
      const preferences: Partial<NotificationPreferences> = {
        visitDetected: false,
        visitEnded: true,
        newVenuesNearby: true,
      };

      service.setPreferences(preferences);

      expect(localStorageMock['notification_preferences']).toBeDefined();
      const stored = JSON.parse(localStorageMock['notification_preferences']);
      expect(stored.visitDetected).toBe(false);
      expect(stored.visitEnded).toBe(true);
      expect(stored.newVenuesNearby).toBe(true);
    });

    it('should load preferences from localStorage', () => {
      const preferences: NotificationPreferences = {
        visitDetected: false,
        visitEnded: false,
        newVenuesNearby: true,
        weeklySummary: true,
        sharingActivity: false,
      };

      localStorageMock['notification_preferences'] = JSON.stringify(preferences);

      service.loadPreferences();

      service.getPreferences().subscribe((loaded) => {
        expect(loaded.visitDetected).toBe(false);
        expect(loaded.visitEnded).toBe(false);
        expect(loaded.newVenuesNearby).toBe(true);
        expect(loaded.weeklySummary).toBe(true);
        expect(loaded.sharingActivity).toBe(false);
      });
    });

    it('should merge partial preferences with defaults', () => {
      const partial: Partial<NotificationPreferences> = {
        visitDetected: false,
      };

      service.setPreferences(partial);

      service.getPreferences().subscribe((prefs) => {
        expect(prefs.visitDetected).toBe(false);
        expect(prefs.visitEnded).toBe(true); // Default value
        expect(prefs.newVenuesNearby).toBe(false); // Default value
      });
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock['notification_preferences'] = 'invalid json{';

      expect(() => service.loadPreferences()).not.toThrow();

      service.getPreferences().subscribe((prefs) => {
        // Should use defaults when localStorage is invalid
        expect(prefs.visitDetected).toBe(true);
        expect(prefs.visitEnded).toBe(true);
      });
    });

    it('should handle localStorage errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => service.setPreferences({ visitDetected: false })).not.toThrow();
    });
  });

  describe('Notification Enabled Status', () => {
    it('should return true when notifications are enabled', () => {
      mockNotification.permission = 'granted';

      expect(service.isNotificationEnabled()).toBe(true);
    });

    it('should return false when notifications are denied', () => {
      mockNotification.permission = 'denied';

      expect(service.isNotificationEnabled()).toBe(false);
    });

    it('should return false when notifications are default', () => {
      mockNotification.permission = 'default';

      expect(service.isNotificationEnabled()).toBe(false);
    });

    it('should return false when Notification API is not available', () => {
      Object.defineProperty(window, 'Notification', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      expect(service.isNotificationEnabled()).toBe(false);
    });
  });

  describe('Permission Status Observable', () => {
    it('should emit permission status changes', (done) => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission = jest.fn().mockResolvedValue('granted');

      const statuses: string[] = [];

      service.getPermissionStatus().subscribe((status) => {
        statuses.push(status);

        if (statuses.length === 2) {
          expect(statuses[0]).toBe('default');
          expect(statuses[1]).toBe('granted');
          done();
        }
      });

      setTimeout(() => {
        service.requestPermission();
      }, 10);
    });
  });

  describe('Initialize', () => {
    it('should load preferences and permission status on initialize', () => {
      const preferences: NotificationPreferences = {
        visitDetected: false,
        visitEnded: false,
        newVenuesNearby: true,
        weeklySummary: false,
        sharingActivity: true,
      };

      localStorageMock['notification_preferences'] = JSON.stringify(preferences);
      mockNotification.permission = 'granted';

      service.initialize();

      expect(service.getCurrentPermission()).toBe('granted');
      service.getPreferences().subscribe((prefs) => {
        expect(prefs.newVenuesNearby).toBe(true);
        expect(prefs.sharingActivity).toBe(true);
      });
    });
  });
});
