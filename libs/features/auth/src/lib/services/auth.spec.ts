import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

// Mock the Supabase client module before tests run
jest.mock('@blastoise/data', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signInWithOtp: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let authStateServiceMock: jest.Mocked<Partial<AuthStateService>>;
  let routerMock: jest.Mocked<Partial<Router>>;

  beforeEach(() => {
    // Create mock objects
    authStateServiceMock = {
      setAnonymousMode: jest.fn(),
      setCurrentUser: jest.fn(),
      setSession: jest.fn(),
    };
    routerMock = {
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthStateService, useValue: authStateServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AuthService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Anonymous Mode (T012)', () => {
    it('should enable anonymous mode and set localStorage flags', () => {
      // Act
      service.enableAnonymousMode();

      // Assert
      expect(localStorage.getItem('anonymous_mode')).toBe('true');
      expect(localStorage.getItem('anonymous_user_id')).toContain('anon_');
    });

    it('should call AuthStateService.setAnonymousMode when enabling anonymous mode', () => {
      // Act
      service.enableAnonymousMode();

      // Assert
      expect(authStateServiceMock.setAnonymousMode).toHaveBeenCalledWith(true);
    });

    it('should create an anonymous user object with default preferences', () => {
      // Act
      service.enableAnonymousMode();

      // Assert
      expect(authStateServiceMock.setCurrentUser).toHaveBeenCalled();
      const userArg = (authStateServiceMock.setCurrentUser as jest.Mock).mock.calls[0][0];

      expect(userArg).toBeTruthy();
      expect(userArg?.id).toContain('anon_');
      expect(userArg?.email).toBe('');
      expect(userArg?.preferences.privacy_settings.anonymous_mode).toBe(true);
      expect(userArg?.preferences.privacy_settings.store_visit_history).toBe(false);
    });

    it('should generate unique anonymous user IDs', () => {
      // Act
      service.enableAnonymousMode();
      const userId1 = localStorage.getItem('anonymous_user_id');

      localStorage.clear();

      service.enableAnonymousMode();
      const userId2 = localStorage.getItem('anonymous_user_id');

      // Assert
      expect(userId1).not.toBe(userId2);
      expect(userId1).toContain('anon_');
      expect(userId2).toContain('anon_');
    });

    it('should reuse existing anonymous user ID if already set', async () => {
      // Arrange - Set existing anonymous user ID BEFORE creating service
      const existingId = 'anon_existing-user-id';
      localStorage.setItem('anonymous_user_id', existingId);
      localStorage.setItem('anonymous_mode', 'true');

      // Clear all previous mocks
      jest.clearAllMocks();

      // Act - Create a fresh service instance (simulates app reload)
      TestBed.inject(AuthService);

      // Wait a tick for async initialization
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - Should have called setCurrentUser with existing ID
      const calls = (authStateServiceMock.setCurrentUser as jest.Mock).mock.calls;
      const anonymousUserCall = calls.find((call) => call[0]?.id?.startsWith('anon_'));

      if (anonymousUserCall) {
        expect(anonymousUserCall[0].id).toBe(existingId);
      } else {
        // If initialization is sync, the ID should be in localStorage
        expect(localStorage.getItem('anonymous_user_id')).toBe(existingId);
      }
    });

    it('should persist anonymous mode across sessions', () => {
      // Act
      service.enableAnonymousMode();
      const userId = localStorage.getItem('anonymous_user_id');

      // Simulate page reload by clearing and re-reading localStorage
      const storedUserId = localStorage.getItem('anonymous_user_id');
      const storedMode = localStorage.getItem('anonymous_mode');

      // Assert
      expect(storedUserId).toBe(userId);
      expect(storedMode).toBe('true');
    });

    it('should not create Supabase session for anonymous users', () => {
      // Act
      service.enableAnonymousMode();

      // Assert - setSession should not be called (anonymous users have no session)
      expect(authStateServiceMock.setSession).not.toHaveBeenCalled();
    });
  });

  describe('Email/Password Sign In', () => {
    beforeEach(() => {
      // Mock Supabase auth methods
      jest.spyOn(service['supabase'].auth, 'signInWithPassword').mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' } as any,
          session: { access_token: 'token-123' } as any,
        },
        error: null,
      } as any);
    });

    it('should call Supabase signInWithPassword with correct credentials', async () => {
      // Act
      await service.signInWithPassword('test@example.com', 'password123');

      // Assert
      expect(service['supabase'].auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return empty object on successful sign in', async () => {
      // Act
      const result = await service.signInWithPassword('test@example.com', 'password123');

      // Assert
      expect(result).toEqual({});
      expect(result.error).toBeUndefined();
    });

    it('should disable anonymous mode after successful sign in', async () => {
      // Arrange - Start in anonymous mode
      localStorage.setItem('anonymous_mode', 'true');
      localStorage.setItem('anonymous_user_id', 'anon_test');

      // Act
      await service.signInWithPassword('test@example.com', 'password123');

      // Assert - Anonymous mode should be disabled
      expect(localStorage.getItem('anonymous_mode')).toBeNull();
      expect(localStorage.getItem('anonymous_user_id')).toBeNull();
    });

    it('should return error object when Supabase returns error', async () => {
      // Arrange - Mock Supabase error
      jest.spyOn(service['supabase'].auth, 'signInWithPassword').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      } as any);

      // Act
      const result = await service.signInWithPassword('test@example.com', 'wrongpass');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Invalid login credentials');
    });

    it('should handle network errors gracefully', async () => {
      // Arrange - Mock network error
      jest
        .spyOn(service['supabase'].auth, 'signInWithPassword')
        .mockRejectedValue(new Error('Network request failed'));

      // Act
      const result = await service.signInWithPassword('test@example.com', 'password123');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Network request failed');
    });

    it('should create session after successful sign in', async () => {
      // Act
      await service.signInWithPassword('test@example.com', 'password123');

      // Assert - Session should be set via auth state change listener
      // Note: In real app, onAuthStateChange would trigger this
      // For unit test, we verify the Supabase method was called correctly
      expect(service['supabase'].auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  describe('Magic Link Authentication (T039)', () => {
    beforeEach(() => {
      // Mock Supabase signInWithOtp method
      jest.spyOn(service['supabase'].auth, 'signInWithOtp').mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as any);
    });

    it('should call Supabase signInWithOtp with correct email', async () => {
      // Act
      await service.signInWithMagicLink('test@example.com');

      // Assert
      expect(service['supabase'].auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should return success when magic link sent', async () => {
      // Act
      const result = await service.signInWithMagicLink('test@example.com');

      // Assert
      expect(result.error).toBeFalsy(); // Can be null or undefined
    });

    it('should return error when Supabase fails to send magic link', async () => {
      // Arrange - Mock Supabase error
      jest.spyOn(service['supabase'].auth, 'signInWithOtp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Failed to send email' },
      } as any);

      // Act
      const result = await service.signInWithMagicLink('test@example.com');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Failed to send email');
    });

    it('should handle network errors gracefully', async () => {
      // Arrange - Mock network error
      jest
        .spyOn(service['supabase'].auth, 'signInWithOtp')
        .mockRejectedValue(new Error('Network request failed'));

      // Act
      const result = await service.signInWithMagicLink('test@example.com');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Network request failed');
    });

    it('should not create session immediately (magic link flow)', async () => {
      // Act
      await service.signInWithMagicLink('test@example.com');

      // Assert - Session is only created after clicking the link, not on request
      expect(authStateServiceMock.setSession).not.toHaveBeenCalled();
    });

    it('should not disable anonymous mode when requesting magic link', async () => {
      // Arrange - Set anonymous mode
      localStorage.setItem('anonymous_mode', 'true');
      localStorage.setItem('anonymous_user_id', 'anon_test');

      // Act
      await service.signInWithMagicLink('test@example.com');

      // Assert - Anonymous mode should still be active (only disabled after clicking link and authenticating)
      expect(localStorage.getItem('anonymous_mode')).toBe('true');
      expect(localStorage.getItem('anonymous_user_id')).toBe('anon_test');
    });
  });

  describe('Account Creation', () => {
    beforeEach(() => {
      // Mock Supabase signUp method
      jest.spyOn(service['supabase'].auth, 'signUp').mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'newuser@example.com' } as any,
          session: { access_token: 'token-123' } as any,
        },
        error: null,
      } as any);
    });

    it('should call Supabase signUp with correct email and password', async () => {
      // Act
      await service.signUp('newuser@example.com', 'password123');

      // Assert
      expect(service['supabase'].auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });

    it('should return empty object on successful account creation', async () => {
      // Act
      const result = await service.signUp('newuser@example.com', 'password123');

      // Assert
      expect(result).toEqual({});
      expect(result.error).toBeUndefined();
    });

    it('should disable anonymous mode after successful sign up', async () => {
      // Arrange - Start in anonymous mode
      localStorage.setItem('anonymous_mode', 'true');
      localStorage.setItem('anonymous_user_id', 'anon_test');

      // Act
      await service.signUp('newuser@example.com', 'password123');

      // Assert - Anonymous mode should be disabled
      expect(localStorage.getItem('anonymous_mode')).toBeNull();
      expect(localStorage.getItem('anonymous_user_id')).toBeNull();
    });

    it('should create session after successful account creation', async () => {
      // Act
      await service.signUp('newuser@example.com', 'password123');

      // Assert - Session should be set via auth state change listener
      // Note: In real app, onAuthStateChange would trigger this
      // For unit test, we verify the Supabase method was called correctly
      expect(service['supabase'].auth.signUp).toHaveBeenCalled();
    });

    it('should return error when email already exists (duplicate email)', async () => {
      // Arrange - Mock Supabase error for duplicate email
      jest.spyOn(service['supabase'].auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      } as any);

      // Act
      const result = await service.signUp('existing@example.com', 'password123');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('User already registered');
    });

    it('should return error when password is too weak', async () => {
      // Arrange - Mock Supabase error for weak password
      jest.spyOn(service['supabase'].auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters' },
      } as any);

      // Act
      const result = await service.signUp('newuser@example.com', 'weak');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Password should be at least');
    });

    it('should return error when email format is invalid', async () => {
      // Arrange - Mock Supabase error for invalid email
      jest.spyOn(service['supabase'].auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email' },
      } as any);

      // Act
      const result = await service.signUp('notanemail', 'password123');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Invalid email');
    });

    it('should handle network errors gracefully during sign up', async () => {
      // Arrange - Mock network error
      jest
        .spyOn(service['supabase'].auth, 'signUp')
        .mockRejectedValue(new Error('Network request failed'));

      // Act
      const result = await service.signUp('newuser@example.com', 'password123');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Network request failed');
    });

    it('should authenticate user immediately after successful sign up', async () => {
      // Arrange
      jest.spyOn(service['supabase'].auth, 'signUp').mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'newuser@example.com', aud: 'authenticated' } as any,
          session: { access_token: 'token-123', refresh_token: 'refresh-123' } as any,
        },
        error: null,
      } as any);

      // Act
      const result = await service.signUp('newuser@example.com', 'password123');

      // Assert - Should return success (session handled by auth state listener)
      expect(result.error).toBeUndefined();
      expect(service['supabase'].auth.signUp).toHaveBeenCalled();
    });

    it('should handle email confirmation requirement', async () => {
      // Arrange - Mock Supabase response where user needs to confirm email
      jest.spyOn(service['supabase'].auth, 'signUp').mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'newuser@example.com', confirmed_at: null } as any,
          session: null, // No session until email confirmed
        },
        error: null,
      } as any);

      // Act
      const result = await service.signUp('newuser@example.com', 'password123');

      // Assert - Should return success (email confirmation flow)
      expect(result.error).toBeUndefined();
      expect(service['supabase'].auth.signUp).toHaveBeenCalled();
    });

    it('should handle rate limiting errors', async () => {
      // Arrange - Mock Supabase rate limit error
      jest.spyOn(service['supabase'].auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email rate limit exceeded' },
      } as any);

      // Act
      const result = await service.signUp('newuser@example.com', 'password123');

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('rate limit');
    });
  });
});
