import { TestBed } from '@angular/core/testing';
import { AuthStateService } from './auth-state.service';

describe('AuthStateService', () => {
  let service: AuthStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStateService],
    });
    service = TestBed.inject(AuthStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should have null currentUser initially', () => {
      expect(service.currentUser()).toBeNull();
    });

    it('should have null session initially', () => {
      expect(service.session()).toBeNull();
    });

    it('should not be authenticated initially', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should not be in anonymous mode initially', () => {
      expect(service.isAnonymous()).toBe(false);
    });

    it('should not be initialized initially', () => {
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('setCurrentUser', () => {
    it('should update currentUser signal', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        preferences: {
          location_tracking_enabled: true,
          sharing_default: 'private' as const,
          notification_settings: { visit_reminders: true, marketing: false },
          privacy_settings: { share_with_friends: false, anonymous_mode: false },
        },
      };

      service.setCurrentUser(mockUser);

      expect(service.currentUser()).toEqual(mockUser);
    });

    it('should update isAuthenticated when user is set', () => {
      expect(service.isAuthenticated()).toBe(false);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        preferences: {
          location_tracking_enabled: true,
          sharing_default: 'private' as const,
          notification_settings: { visit_reminders: true, marketing: false },
          privacy_settings: { share_with_friends: false, anonymous_mode: false },
        },
      };

      service.setCurrentUser(mockUser);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should allow setting user to null', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        preferences: {
          location_tracking_enabled: true,
          sharing_default: 'private' as const,
          notification_settings: { visit_reminders: true, marketing: false },
          privacy_settings: { share_with_friends: false, anonymous_mode: false },
        },
      };

      service.setCurrentUser(mockUser);
      expect(service.isAuthenticated()).toBe(true);

      service.setCurrentUser(null);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should update session signal', () => {
      const mockSession = {
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-123',
        user: { id: 'user-123', aud: 'authenticated', role: '', email: 'test@example.com' },
      };

      service.setSession(mockSession as any);

      expect(service.session()).toEqual(mockSession);
    });

    it('should allow setting session to null', () => {
      const mockSession = { access_token: 'token-123' };

      service.setSession(mockSession as any);
      expect(service.session()).not.toBeNull();

      service.setSession(null);
      expect(service.session()).toBeNull();
    });
  });

  describe('setAnonymousMode', () => {
    it('should update anonymous mode signal', () => {
      expect(service.isAnonymous()).toBe(false);

      service.setAnonymousMode(true);

      expect(service.isAnonymous()).toBe(true);
    });

    it('should allow disabling anonymous mode', () => {
      service.setAnonymousMode(true);
      expect(service.isAnonymous()).toBe(true);

      service.setAnonymousMode(false);
      expect(service.isAnonymous()).toBe(false);
    });
  });

  describe('setInitialized', () => {
    it('should update initialized signal', () => {
      expect(service.isInitialized()).toBe(false);

      service.setInitialized(true);

      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should reset all authentication state', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        preferences: {
          location_tracking_enabled: true,
          sharing_default: 'private' as const,
          notification_settings: { visit_reminders: true, marketing: false },
          privacy_settings: { share_with_friends: false, anonymous_mode: false },
        },
      };

      service.setCurrentUser(mockUser);
      service.setSession({ access_token: 'token-123' } as any);
      service.setAnonymousMode(true);

      service.clear();

      expect(service.currentUser()).toBeNull();
      expect(service.session()).toBeNull();
      expect(service.isAnonymous()).toBe(false);
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});
