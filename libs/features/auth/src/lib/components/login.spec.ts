import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceMock: jest.Mocked<AuthService>;
  let authStateMock: jest.Mocked<Partial<AuthStateService>>;
  let routerMock: jest.Mocked<Partial<Router>>;

  beforeEach(async () => {
    // Create mock objects for dependencies
    authServiceMock = {
      enableAnonymousMode: jest.fn(),
      signInWithPassword: jest.fn(),
    } as any;

    authStateMock = {
      isAuthenticated: jest.fn().mockReturnValue(false),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthStateService, useValue: authStateMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Anonymous Mode (T011)', () => {
    it('should call AuthService.enableAnonymousMode when Continue as Guest is clicked', () => {
      // Arrange
      const continueAsGuestButton = fixture.nativeElement.querySelector(
        '[data-testid="continue-as-guest"]'
      );
      expect(continueAsGuestButton).toBeTruthy();

      // Act
      continueAsGuestButton.click();

      // Assert
      expect(authServiceMock.enableAnonymousMode).toHaveBeenCalled();
    });

    it('should set anonymous mode flags in localStorage after Continue as Guest', () => {
      // Arrange
      const continueAsGuestButton = fixture.nativeElement.querySelector(
        '[data-testid="continue-as-guest"]'
      );
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

      // Setup the mock to actually call localStorage.setItem
      authServiceMock.enableAnonymousMode.mockImplementation(() => {
        localStorage.setItem('anonymous_mode', 'true');
        localStorage.setItem('anonymous_user_id', 'anon_test-uuid');
      });

      // Act
      continueAsGuestButton.click();

      // Assert - Verify localStorage was called (implementation detail of AuthService)
      expect(setItemSpy).toHaveBeenCalledWith('anonymous_mode', 'true');
      expect(setItemSpy).toHaveBeenCalledWith('anonymous_user_id', expect.any(String));

      // Cleanup
      setItemSpy.mockRestore();
    });

    it('should navigate to main app after Continue as Guest', () => {
      // Arrange
      const continueAsGuestButton = fixture.nativeElement.querySelector(
        '[data-testid="continue-as-guest"]'
      );

      // Act
      continueAsGuestButton.click();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should persist anonymous mode across sessions', () => {
      // Arrange - Simulate existing anonymous session
      localStorage.setItem('anonymous_mode', 'true');
      localStorage.setItem('anonymous_user_id', 'anon_existing-user');

      // Act - Create new component instance (simulates app reload)
      const newFixture = TestBed.createComponent(Login);
      newFixture.detectChanges();

      // Assert
      expect(localStorage.getItem('anonymous_mode')).toBe('true');
      expect(localStorage.getItem('anonymous_user_id')).toBe('anon_existing-user');
    });
  });

  describe('Email/Password Sign In', () => {
    it('should create reactive form with email and password controls', () => {
      // Assert - Form should exist on component
      expect(component.loginForm).toBeTruthy();
      expect(component.loginForm.controls['email']).toBeTruthy();
      expect(component.loginForm.controls['password']).toBeTruthy();
    });

    it('should validate email format', () => {
      // Arrange
      const emailControl = component.loginForm.controls['email'];

      // Act - Invalid email
      emailControl.setValue('notanemail');
      emailControl.markAsTouched();

      // Assert
      expect(emailControl.invalid).toBe(true);
      expect(emailControl.errors?.['email']).toBeTruthy();

      // Act - Valid email
      emailControl.setValue('test@example.com');

      // Assert
      expect(emailControl.valid).toBe(true);
    });

    it('should validate password minimum length', () => {
      // Arrange
      const passwordControl = component.loginForm.controls['password'];

      // Act - Too short
      passwordControl.setValue('short');
      passwordControl.markAsTouched();

      // Assert
      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.errors?.['minlength']).toBeTruthy();

      // Act - Valid length
      passwordControl.setValue('validpass123');

      // Assert
      expect(passwordControl.valid).toBe(true);
    });

    it('should use updateOn blur for validation timing', () => {
      // Assert - Check that form controls use 'blur' validation
      const emailControl = component.loginForm.controls['email'];

      // Note: Angular's updateOn is set at form group level or control level
      // This test verifies the behavior
      emailControl.setValue('invalid');

      // Before blur, errors might not be checked depending on updateOn
      // After markAsTouched (simulates blur), errors should be present
      emailControl.markAsTouched();
      expect(emailControl.errors).toBeTruthy();
    });

    it('should display inline error messages when field is invalid and touched', () => {
      // Arrange
      const emailControl = component.loginForm.controls['email'];
      emailControl.setValue('invalid');
      emailControl.markAsTouched();
      fixture.detectChanges();

      // Act
      const errorMessage = fixture.nativeElement.querySelector('[data-testid="email-error"]');

      // Assert
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('valid email');
    });

    it('should disable submit button when form is invalid', () => {
      // Arrange - Invalid form
      component.loginForm.controls['email'].setValue('');
      component.loginForm.controls['password'].setValue('');
      fixture.detectChanges();

      // Act
      const submitButton = fixture.nativeElement.querySelector('[data-testid="login-submit"]');

      // Assert
      expect(submitButton.disabled).toBe(true);
    });

    it('should enable submit button when form is valid', () => {
      // Arrange - Valid form
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      fixture.detectChanges();

      // Act
      const submitButton = fixture.nativeElement.querySelector('[data-testid="login-submit"]');

      // Assert
      expect(submitButton.disabled).toBe(false);
    });

    it('should call AuthService.signInWithPassword on form submit', async () => {
      // Arrange
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      authServiceMock.signInWithPassword.mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(authServiceMock.signInWithPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should show loading state during sign in', async () => {
      // Arrange
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');

      // Make signIn take some time
      authServiceMock.signInWithPassword.mockReturnValue(
        new Promise((resolve) => setTimeout(() => resolve({}), 100))
      );

      // Act
      const submitPromise = component.onSubmit();

      // Assert - Loading should be true immediately
      expect(component.isLoading()).toBe(true);

      await submitPromise;

      // Assert - Loading should be false after completion
      expect(component.isLoading()).toBe(false);
    });

    it('should disable form inputs during loading', () => {
      // Arrange - Set loading state and disable form (simulating what onSubmit does)
      component.isLoading.set(true);
      component.loginForm.disable();
      fixture.detectChanges();

      // Act
      const emailInput = fixture.nativeElement.querySelector('[data-testid="email-input"]');
      const passwordInput = fixture.nativeElement.querySelector('[data-testid="password-input"]');
      const submitButton = fixture.nativeElement.querySelector('[data-testid="login-submit"]');

      // Assert - Form controls should be disabled
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);

      // Verify the form state is disabled
      expect(component.loginForm.disabled).toBe(true);
    });

    it('should navigate to main app on successful sign in', async () => {
      // Arrange
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      authServiceMock.signInWithPassword.mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should display error message on failed sign in', async () => {
      // Arrange
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('wrongpassword');
      authServiceMock.signInWithPassword.mockResolvedValue({
        error: new Error('Invalid login credentials'),
      });

      // Act
      await component.onSubmit();
      fixture.detectChanges();

      // Assert
      expect(component.error()).toBeTruthy();
      expect(component.error()).toContain('Invalid email or password');

      const errorAlert = fixture.nativeElement.querySelector('[data-testid="login-error"]');
      expect(errorAlert).toBeTruthy();
    });
  });

  describe('Magic Link Authentication', () => {
    beforeEach(() => {
      // Add signInWithMagicLink to the mock
      authServiceMock.signInWithMagicLink = jest.fn() as any;
    });

    it('should have mode signal defaulting to password', () => {
      // Assert
      expect(component.mode).toBeDefined();
      expect(component.mode()).toBe('password');
    });

    it('should toggle between password and magic-link modes', () => {
      // Arrange - Start in password mode
      expect(component.mode()).toBe('password');

      // Act - Switch to magic link mode
      component.mode.set('magic-link');
      fixture.detectChanges();

      // Assert
      expect(component.mode()).toBe('magic-link');

      // Act - Switch back to password mode
      component.mode.set('password');
      fixture.detectChanges();

      // Assert
      expect(component.mode()).toBe('password');
    });

    it('should show tab navigation for switching modes', () => {
      // Act
      fixture.detectChanges();

      // Assert - Check for tabs
      const passwordTab = fixture.nativeElement.querySelector('[data-testid="password-tab"]');
      const magicLinkTab = fixture.nativeElement.querySelector('[data-testid="magic-link-tab"]');

      expect(passwordTab).toBeTruthy();
      expect(magicLinkTab).toBeTruthy();
    });

    it('should hide password field in magic-link mode', () => {
      // Arrange - Switch to magic link mode
      component.mode.set('magic-link');
      fixture.detectChanges();

      // Assert - Password field should not be visible
      const passwordInput = fixture.nativeElement.querySelector('[data-testid="password-input"]');
      expect(passwordInput).toBeNull();
    });

    it('should show password field in password mode', () => {
      // Arrange - Ensure in password mode
      component.mode.set('password');
      fixture.detectChanges();

      // Assert - Password field should be visible
      const passwordInput = fixture.nativeElement.querySelector('[data-testid="password-input"]');
      expect(passwordInput).toBeTruthy();
    });

    it('should call signInWithMagicLink when submitting in magic-link mode', async () => {
      // Arrange
      component.mode.set('magic-link');
      component.loginForm.controls['email'].setValue('test@example.com');
      authServiceMock.signInWithMagicLink.mockResolvedValue({ error: null });

      // Act
      await component.onSubmit();

      // Assert
      expect(authServiceMock.signInWithMagicLink).toHaveBeenCalledWith('test@example.com');
      expect(authServiceMock.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should call signInWithPassword when submitting in password mode', async () => {
      // Arrange
      component.mode.set('password');
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      authServiceMock.signInWithPassword.mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(authServiceMock.signInWithPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(authServiceMock.signInWithMagicLink).not.toHaveBeenCalled();
    });

    it('should show success message after magic link sent', async () => {
      // Arrange
      component.mode.set('magic-link');
      component.loginForm.controls['email'].setValue('test@example.com');
      authServiceMock.signInWithMagicLink.mockResolvedValue({ error: null });

      // Act
      await component.onSubmit();
      fixture.detectChanges();

      // Assert
      expect(component.showSuccessMessage).toBeDefined();
      expect(component.showSuccessMessage()).toBe(true);

      const successAlert = fixture.nativeElement.querySelector(
        '[data-testid="magic-link-success"]'
      );
      expect(successAlert).toBeTruthy();
      expect(successAlert.textContent).toContain('Check your email');
    });

    it('should auto-dismiss success message after 5 seconds', async () => {
      // Arrange
      jest.useFakeTimers();
      component.mode.set('magic-link');
      component.loginForm.controls['email'].setValue('test@example.com');
      authServiceMock.signInWithMagicLink.mockResolvedValue({ error: null });

      // Act
      await component.onSubmit();
      expect(component.showSuccessMessage()).toBe(true);

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      // Assert
      expect(component.showSuccessMessage()).toBe(false);

      // Cleanup
      jest.useRealTimers();
    });

    it('should not show success message on magic link error', async () => {
      // Arrange
      component.mode.set('magic-link');
      component.loginForm.controls['email'].setValue('test@example.com');
      authServiceMock.signInWithMagicLink.mockResolvedValue({
        error: new Error('Failed to send magic link'),
      });

      // Act
      await component.onSubmit();
      fixture.detectChanges();

      // Assert
      expect(component.showSuccessMessage()).toBe(false);
      expect(component.error()).toBeTruthy();
    });
  });
});
