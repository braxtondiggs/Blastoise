import { createComponentFactory, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { Router } from '@angular/router';
import { Registration } from './registration';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: jest.fn(() => 'web'),
  },
}));

describe('Registration', () => {
  let spectator: Spectator<Registration>;
  let authService: SpyObject<AuthService>;
  let authState: AuthStateService;
  let router: SpyObject<Router>;

  const createComponent = createComponentFactory({
    component: Registration,
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
    authService.signUp.mockResolvedValue({});
    router.navigate.mockResolvedValue(true);

    spectator.detectChanges();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('Registration Form Validation', () => {
    it('should have a form with all required controls', () => {
      const form = spectator.component.registrationForm;
      expect(form).toBeTruthy();
      expect(form.controls['email']).toBeTruthy();
      expect(form.controls['password']).toBeTruthy();
      expect(form.controls['confirmPassword']).toBeTruthy();
      expect(form.controls['agreeToTerms']).toBeTruthy();
    });

    it('should validate email format', () => {
      const emailControl = spectator.component.registrationForm.controls['email'];

      emailControl.setValue('invalid');
      emailControl.markAsTouched();

      expect(emailControl.invalid).toBe(true);
      expect(emailControl.errors?.['email']).toBeTruthy();

      emailControl.setValue('valid@example.com');

      expect(emailControl.valid).toBe(true);
    });

    it('should require email', () => {
      const emailControl = spectator.component.registrationForm.controls['email'];

      emailControl.setValue('');
      emailControl.markAsTouched();

      expect(emailControl.errors?.['required']).toBeTruthy();
    });

    it('should validate password minimum length (8 characters)', () => {
      const passwordControl = spectator.component.registrationForm.controls['password'];

      passwordControl.setValue('short');
      passwordControl.markAsTouched();

      expect(passwordControl.errors?.['minlength']).toBeTruthy();

      passwordControl.setValue('validpassword');

      expect(passwordControl.valid).toBe(true);
    });

    it('should validate password strength (must have letter and number)', () => {
      const passwordControl = spectator.component.registrationForm.controls['password'];

      passwordControl.setValue('onlyletters');
      passwordControl.markAsTouched();

      expect(passwordControl.errors?.['passwordStrength']).toBeTruthy();

      passwordControl.setValue('12345678');
      passwordControl.markAsTouched();

      expect(passwordControl.errors?.['passwordStrength']).toBeTruthy();

      passwordControl.setValue('password123');

      expect(passwordControl.valid).toBe(true);
    });

    it('should require agreeToTerms to be checked', () => {
      const agreeControl = spectator.component.registrationForm.controls['agreeToTerms'];

      agreeControl.setValue(false);
      agreeControl.markAsTouched();

      expect(agreeControl.errors?.['required']).toBeTruthy();

      agreeControl.setValue(true);

      expect(agreeControl.valid).toBe(true);
    });

    it('should disable submit button when form is invalid', () => {
      spectator.component.registrationForm.controls['email'].setValue('');
      spectator.detectChanges();

      const submitButton = spectator.query<HTMLButtonElement>('[data-testid="register-submit"]');

      expect(submitButton?.disabled).toBe(true);
    });

    it('should enable submit button when form is valid', () => {
      spectator.component.registrationForm.controls['email'].setValue('test@example.com');
      spectator.component.registrationForm.controls['password'].setValue('password123');
      spectator.component.registrationForm.controls['confirmPassword'].setValue('password123');
      spectator.component.registrationForm.controls['agreeToTerms'].setValue(true);
      spectator.detectChanges();

      const submitButton = spectator.query<HTMLButtonElement>('[data-testid="register-submit"]');

      expect(submitButton?.disabled).toBe(false);
    });
  });

  describe('Password Strength Checklist', () => {
    it('should have password strength signals', () => {
      expect(spectator.component.hasMinLength).toBeDefined();
      expect(spectator.component.hasLetter).toBeDefined();
      expect(spectator.component.hasNumber).toBeDefined();
    });

    it('should update hasMinLength based on password length', () => {
      const passwordControl = spectator.component.registrationForm.controls['password'];

      passwordControl.setValue('short');
      spectator.detectChanges();

      expect(spectator.component.hasMinLength()).toBe(false);

      passwordControl.setValue('longenoughpassword');
      spectator.detectChanges();

      expect(spectator.component.hasMinLength()).toBe(true);
    });

    it('should update hasLetter based on password content', () => {
      const passwordControl = spectator.component.registrationForm.controls['password'];

      passwordControl.setValue('12345678');
      spectator.detectChanges();

      expect(spectator.component.hasLetter()).toBe(false);

      passwordControl.setValue('password123');
      spectator.detectChanges();

      expect(spectator.component.hasLetter()).toBe(true);
    });

    it('should update hasNumber based on password content', () => {
      const passwordControl = spectator.component.registrationForm.controls['password'];

      passwordControl.setValue('onlyletters');
      spectator.detectChanges();

      expect(spectator.component.hasNumber()).toBe(false);

      passwordControl.setValue('password123');
      spectator.detectChanges();

      expect(spectator.component.hasNumber()).toBe(true);
    });
  });

  describe('Confirm Password Match', () => {
    it('should validate that passwords match', () => {
      spectator.component.registrationForm.controls['password'].setValue('password123');
      spectator.component.registrationForm.controls['confirmPassword'].setValue('different');
      spectator.component.registrationForm.controls['confirmPassword'].markAsTouched();
      spectator.detectChanges();

      expect(spectator.component.registrationForm.controls['confirmPassword'].errors?.['passwordMatch']).toBeTruthy();

      spectator.component.registrationForm.controls['confirmPassword'].setValue('password123');
      spectator.detectChanges();

      expect(spectator.component.registrationForm.controls['confirmPassword'].valid).toBe(true);
    });

    it('should display error message when passwords do not match', () => {
      spectator.component.registrationForm.controls['password'].setValue('password123');
      spectator.component.registrationForm.controls['confirmPassword'].setValue('different');
      spectator.component.registrationForm.controls['confirmPassword'].markAsTouched();
      spectator.detectChanges();

      const errorMessage = spectator.query('[data-testid="confirm-password-error"]');

      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('match');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      spectator.component.registrationForm.controls['email'].setValue('test@example.com');
      spectator.component.registrationForm.controls['password'].setValue('password123');
      spectator.component.registrationForm.controls['confirmPassword'].setValue('password123');
      spectator.component.registrationForm.controls['agreeToTerms'].setValue(true);
      spectator.detectChanges();
    });

    it('should call AuthService.signUp on form submit', async () => {
      await spectator.component.onSubmit();

      expect(authService.signUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should show loading state during sign up', async () => {
      const submitPromise = spectator.component.onSubmit();

      expect(spectator.component.isLoading()).toBe(true);

      await submitPromise;

      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should navigate on successful sign up', async () => {
      await spectator.component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should display error message on failed sign up', async () => {
      authService.signUp.mockResolvedValue({
        error: { message: 'User already registered' },
      });

      await spectator.component.onSubmit();
      spectator.detectChanges();

      expect(spectator.component.error()).toBeTruthy();

      const errorAlert = spectator.query('[data-testid="register-error"]');
      expect(errorAlert).toBeTruthy();
    });
  });
});
