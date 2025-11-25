import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { Router } from '@angular/router';
import { AuthService } from './auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock Supabase client
const mockSupabaseAuth = {
  getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
  onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  signInWithPassword: jest.fn(),
  signInWithOtp: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

const mockSupabase = {
  auth: mockSupabaseAuth,
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

jest.mock('@blastoise/data', () => ({
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: jest.fn(() => 'web'),
    isNativePlatform: jest.fn(() => false),
  },
}));

describe('AuthService', () => {
  let spectator: SpectatorService<AuthService>;
  let authStateService: SpyObject<AuthStateService>;

  const createService = createServiceFactory({
    service: AuthService,
    mocks: [AuthStateService, Router],
  });

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();

    spectator = createService();
    authStateService = spectator.inject(AuthStateService);
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('Anonymous Mode', () => {
    it('should enable anonymous mode and set localStorage flags', () => {
      spectator.service.enableAnonymousMode();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('anonymous_mode', 'true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'anonymous_user_id',
        expect.stringContaining('anon_')
      );
    });

    it('should call AuthStateService.setAnonymousMode when enabling anonymous mode', () => {
      spectator.service.enableAnonymousMode();

      expect(authStateService.setAnonymousMode).toHaveBeenCalledWith(true);
    });

    it('should create an anonymous user with default preferences', () => {
      spectator.service.enableAnonymousMode();

      expect(authStateService.setCurrentUser).toHaveBeenCalled();
      const userArg = (authStateService.setCurrentUser as jest.Mock).mock.calls[0][0];

      expect(userArg?.id).toContain('anon_');
      expect(userArg?.email).toBe('');
      expect(userArg?.preferences.privacy_settings.anonymous_mode).toBe(true);
    });

    it('should generate unique anonymous user IDs', () => {
      spectator.service.enableAnonymousMode();
      const firstCallId = (localStorageMock.setItem as jest.Mock).mock.calls.find(
        (call: string[]) => call[0] === 'anonymous_user_id'
      )?.[1];

      localStorageMock.clear();
      jest.clearAllMocks();

      spectator.service.enableAnonymousMode();
      const secondCallId = (localStorageMock.setItem as jest.Mock).mock.calls.find(
        (call: string[]) => call[0] === 'anonymous_user_id'
      )?.[1];

      expect(firstCallId).not.toBe(secondCallId);
    });
  });

  describe('Email/Password Sign In', () => {
    beforeEach(() => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });
    });

    it('should call Supabase signInWithPassword with correct credentials', async () => {
      await spectator.service.signInWithPassword('test@example.com', 'password123');

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return empty object on successful sign in', async () => {
      const result = await spectator.service.signInWithPassword('test@example.com', 'password123');

      expect(result).toEqual({});
      expect(result.error).toBeUndefined();
    });

    it('should disable anonymous mode after successful sign in', async () => {
      localStorageMock.setItem('anonymous_mode', 'true');
      localStorageMock.setItem('anonymous_user_id', 'anon_test');

      await spectator.service.signInWithPassword('test@example.com', 'password123');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('anonymous_mode');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('anonymous_user_id');
    });

    it('should return error object when Supabase returns error', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await spectator.service.signInWithPassword('test@example.com', 'wrongpass');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Invalid login credentials');
    });

    it('should handle network errors gracefully', async () => {
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(new Error('Network request failed'));

      const result = await spectator.service.signInWithPassword('test@example.com', 'password123');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Network request failed');
    });
  });

  describe('Magic Link Authentication', () => {
    beforeEach(() => {
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
    });

    it('should call Supabase signInWithOtp with correct email', async () => {
      await spectator.service.signInWithMagicLink('test@example.com');

      expect(mockSupabaseAuth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should return success when magic link sent', async () => {
      const result = await spectator.service.signInWithMagicLink('test@example.com');

      expect(result.error).toBeFalsy();
    });

    it('should return error when Supabase fails to send magic link', async () => {
      mockSupabaseAuth.signInWithOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Failed to send email' },
      });

      const result = await spectator.service.signInWithMagicLink('test@example.com');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Failed to send email');
    });

    it('should not disable anonymous mode when requesting magic link', async () => {
      localStorageMock.setItem('anonymous_mode', 'true');
      localStorageMock.setItem('anonymous_user_id', 'anon_test');

      await spectator.service.signInWithMagicLink('test@example.com');

      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('anonymous_mode');
    });
  });

  describe('Account Creation', () => {
    beforeEach(() => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'newuser@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });
    });

    it('should call Supabase signUp with correct email and password', async () => {
      await spectator.service.signUp('newuser@example.com', 'password123');

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should return empty object on successful account creation', async () => {
      const result = await spectator.service.signUp('newuser@example.com', 'password123');

      expect(result).toEqual({});
      expect(result.error).toBeUndefined();
    });

    it('should disable anonymous mode after successful sign up', async () => {
      localStorageMock.setItem('anonymous_mode', 'true');
      localStorageMock.setItem('anonymous_user_id', 'anon_test');

      await spectator.service.signUp('newuser@example.com', 'password123');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('anonymous_mode');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('anonymous_user_id');
    });

    it('should return error when email already exists', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await spectator.service.signUp('existing@example.com', 'password123');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('User already registered');
    });
  });
});
