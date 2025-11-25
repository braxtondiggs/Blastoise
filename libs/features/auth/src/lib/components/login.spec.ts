import { createComponentFactory, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { Router } from '@angular/router';
import { fakeAsync, tick } from '@angular/core/testing';
import { Login } from './login';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: jest.fn(() => 'web'),
  },
}));

describe('Login', () => {
  let spectator: Spectator<Login>;
  let authService: SpyObject<AuthService>;
  let authState: AuthStateService;
  let router: SpyObject<Router>;

  const createComponent = createComponentFactory({
    component: Login,
    providers: [AuthStateService],
    mocks: [AuthService, Router],
    detectChanges: false,
  });

  beforeEach(() => {
    spectator = createComponent();
    authService = spectator.inject(AuthService);
    authState = spectator.inject(AuthStateService);
    router = spectator.inject(Router);

    // Default mock setup - use real AuthStateService with setter methods
    authState.setCurrentUser(null);
    authState.setAnonymousMode(false);
    authService.enableAnonymousMode.mockReturnValue(undefined);
    authService.signInWithPassword.mockResolvedValue({});
    authService.signInWithMagicLink.mockResolvedValue({ error: null });
    router.navigate.mockResolvedValue(true);

    spectator.detectChanges();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should have a login form with email and password controls', () => {
      expect(spectator.component.loginForm).toBeTruthy();
      expect(spectator.component.loginForm.controls['email']).toBeTruthy();
      expect(spectator.component.loginForm.controls['password']).toBeTruthy();
    });

    it('should start in password mode', () => {
      expect(spectator.component.mode()).toBe('password');
    });

    it('should not show loading state initially', () => {
      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should not show error initially', () => {
      expect(spectator.component.error()).toBeNull();
    });

    it('should not show success message initially', () => {
      expect(spectator.component.showSuccessMessage()).toBe(false);
    });
  });

  describe('Tab Navigation', () => {
    it('should show password and magic link tabs', () => {
      const passwordTab = spectator.query('[data-testid="password-tab"]');
      const magicLinkTab = spectator.query('[data-testid="magic-link-tab"]');

      expect(passwordTab).toBeTruthy();
      expect(magicLinkTab).toBeTruthy();
    });

    it('should switch to magic link mode when clicking magic link tab', () => {
      spectator.click('[data-testid="magic-link-tab"]');

      expect(spectator.component.mode()).toBe('magic-link');
    });

    it('should switch back to password mode when clicking password tab', () => {
      spectator.component.mode.set('magic-link');
      spectator.detectChanges();

      spectator.click('[data-testid="password-tab"]');

      expect(spectator.component.mode()).toBe('password');
    });

    it('should hide password field in magic link mode', () => {
      spectator.component.mode.set('magic-link');
      spectator.detectChanges();

      const passwordInput = spectator.query('[data-testid="password-input"]');
      expect(passwordInput).toBeNull();
    });

    it('should show password field in password mode', () => {
      spectator.component.mode.set('password');
      spectator.detectChanges();

      const passwordInput = spectator.query('[data-testid="password-input"]');
      expect(passwordInput).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', () => {
      const emailControl = spectator.component.loginForm.controls['email'];

      emailControl.setValue('invalid-email');
      emailControl.markAsTouched();

      expect(emailControl.invalid).toBe(true);

      emailControl.setValue('valid@example.com');

      expect(emailControl.valid).toBe(true);
    });

    it('should require email', () => {
      const emailControl = spectator.component.loginForm.controls['email'];

      emailControl.setValue('');
      emailControl.markAsTouched();

      expect(emailControl.errors?.['required']).toBeTruthy();
    });

    it('should validate password minimum length', () => {
      const passwordControl = spectator.component.loginForm.controls['password'];

      passwordControl.setValue('short');
      passwordControl.markAsTouched();

      expect(passwordControl.errors?.['minlength']).toBeTruthy();

      passwordControl.setValue('validpassword123');

      expect(passwordControl.valid).toBe(true);
    });

    it('should disable submit button when form is invalid', () => {
      spectator.component.loginForm.controls['email'].setValue('');
      spectator.component.loginForm.controls['password'].setValue('');
      spectator.detectChanges();

      const submitButton = spectator.query<HTMLButtonElement>('[data-testid="login-submit"]');

      expect(submitButton?.disabled).toBe(true);
    });

    it('should enable submit button when form is valid', () => {
      spectator.component.loginForm.controls['email'].setValue('test@example.com');
      spectator.component.loginForm.controls['password'].setValue('validpassword');
      spectator.detectChanges();

      const submitButton = spectator.query<HTMLButtonElement>('[data-testid="login-submit"]');

      expect(submitButton?.disabled).toBe(false);
    });

    it('should show email error message when email is invalid and touched', () => {
      spectator.component.loginForm.controls['email'].setValue('invalid');
      spectator.component.loginForm.controls['email'].markAsTouched();
      spectator.detectChanges();

      const errorMessage = spectator.query('[data-testid="email-error"]');

      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('valid email');
    });
  });

  describe('Password Sign In', () => {
    beforeEach(() => {
      spectator.component.loginForm.controls['email'].setValue('test@example.com');
      spectator.component.loginForm.controls['password'].setValue('validpassword');
      spectator.detectChanges();
    });

    it('should call AuthService.signInWithPassword on form submit', async () => {
      await spectator.component.onSubmit();

      expect(authService.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'validpassword');
    });

    it('should navigate to /visits on successful sign in', async () => {
      await spectator.component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/visits']);
    });

    it('should show loading state during sign in', async () => {
      const submitPromise = spectator.component.onSubmit();

      expect(spectator.component.isLoading()).toBe(true);

      await submitPromise;

      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should display error message on failed sign in', async () => {
      authService.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      await spectator.component.onSubmit();
      spectator.detectChanges();

      expect(spectator.component.error()).toBeTruthy();

      const errorAlert = spectator.query('[data-testid="login-error"]');
      expect(errorAlert).toBeTruthy();
    });
  });

  describe('Magic Link Sign In', () => {
    beforeEach(() => {
      spectator.component.mode.set('magic-link');
      spectator.component.loginForm.controls['email'].setValue('test@example.com');
      spectator.detectChanges();
    });

    it('should call AuthService.signInWithMagicLink in magic link mode', async () => {
      await spectator.component.onSubmit();

      expect(authService.signInWithMagicLink).toHaveBeenCalledWith('test@example.com');
      expect(authService.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should show success message after magic link sent', async () => {
      await spectator.component.onSubmit();
      spectator.detectChanges();

      expect(spectator.component.showSuccessMessage()).toBe(true);

      const successAlert = spectator.query('[data-testid="magic-link-success"]');
      expect(successAlert).toBeTruthy();
      expect(successAlert?.textContent).toContain('Check your email');
    });

    it('should auto-dismiss success message after 5 seconds', fakeAsync(() => {
      spectator.component.onSubmit();
      tick();
      spectator.detectChanges();

      expect(spectator.component.showSuccessMessage()).toBe(true);

      tick(5000);

      expect(spectator.component.showSuccessMessage()).toBe(false);
    }));

    it('should not show success message on magic link error', async () => {
      authService.signInWithMagicLink.mockResolvedValue({
        error: { message: 'Failed to send email' },
      });

      await spectator.component.onSubmit();
      spectator.detectChanges();

      expect(spectator.component.showSuccessMessage()).toBe(false);
      expect(spectator.component.error()).toBeTruthy();
    });
  });
});
