import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Registration } from './registration';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

describe('Registration', () => {
  let component: Registration;
  let fixture: ComponentFixture<Registration>;
  let authServiceMock: jest.Mocked<Partial<AuthService>>;
  let authStateMock: jest.Mocked<Partial<AuthStateService>>;
  let routerMock: jest.Mocked<Partial<Router>>;

  beforeEach(async () => {
    // Create mock objects for dependencies
    authServiceMock = {
      signUp: jest.fn(),
    };

    authStateMock = {
      isAuthenticated: jest.fn().mockReturnValue(false),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Registration],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthStateService, useValue: authStateMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Registration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Registration Form Validation (T056)', () => {
    it('should create reactive form with email, password, confirmPassword, and agreeToTerms controls', () => {
      // Assert - Form should exist on component
      expect(component.registrationForm).toBeTruthy();
      expect(component.registrationForm.controls['email']).toBeTruthy();
      expect(component.registrationForm.controls['password']).toBeTruthy();
      expect(component.registrationForm.controls['confirmPassword']).toBeTruthy();
      expect(component.registrationForm.controls['agreeToTerms']).toBeTruthy();
    });

    it('should validate email format', () => {
      // Arrange
      const emailControl = component.registrationForm.controls['email'];

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

    it('should require email to be filled', () => {
      // Arrange
      const emailControl = component.registrationForm.controls['email'];

      // Act - Empty email
      emailControl.setValue('');
      emailControl.markAsTouched();

      // Assert
      expect(emailControl.invalid).toBe(true);
      expect(emailControl.errors?.['required']).toBeTruthy();
    });

    it('should validate password minimum length (8 characters)', () => {
      // Arrange
      const passwordControl = component.registrationForm.controls['password'];

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

    it('should require password to be filled', () => {
      // Arrange
      const passwordControl = component.registrationForm.controls['password'];

      // Act - Empty password
      passwordControl.setValue('');
      passwordControl.markAsTouched();

      // Assert
      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.errors?.['required']).toBeTruthy();
    });

    it('should validate password strength (must have letter and number)', () => {
      // Arrange
      const passwordControl = component.registrationForm.controls['password'];

      // Act - Only letters
      passwordControl.setValue('onlyletters');
      passwordControl.markAsTouched();

      // Assert
      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.errors?.['passwordStrength']).toBeTruthy();

      // Act - Only numbers
      passwordControl.setValue('12345678');
      passwordControl.markAsTouched();

      // Assert
      expect(passwordControl.invalid).toBe(true);
      expect(passwordControl.errors?.['passwordStrength']).toBeTruthy();

      // Act - Valid password with letters and numbers
      passwordControl.setValue('password123');

      // Assert
      expect(passwordControl.valid).toBe(true);
    });

    it('should require confirmPassword to be filled', () => {
      // Arrange
      const confirmPasswordControl = component.registrationForm.controls['confirmPassword'];

      // Act - Empty confirmPassword
      confirmPasswordControl.setValue('');
      confirmPasswordControl.markAsTouched();

      // Assert
      expect(confirmPasswordControl.invalid).toBe(true);
      expect(confirmPasswordControl.errors?.['required']).toBeTruthy();
    });

    it('should require agreeToTerms to be checked', () => {
      // Arrange
      const agreeToTermsControl = component.registrationForm.controls['agreeToTerms'];

      // Act - Not checked
      agreeToTermsControl.setValue(false);
      agreeToTermsControl.markAsTouched();

      // Assert
      expect(agreeToTermsControl.invalid).toBe(true);
      expect(agreeToTermsControl.errors?.['required']).toBeTruthy();

      // Act - Checked
      agreeToTermsControl.setValue(true);

      // Assert
      expect(agreeToTermsControl.valid).toBe(true);
    });

    it('should disable submit button when form is invalid', () => {
      // Arrange - Invalid form (missing fields)
      component.registrationForm.controls['email'].setValue('');
      component.registrationForm.controls['password'].setValue('');
      component.registrationForm.controls['confirmPassword'].setValue('');
      component.registrationForm.controls['agreeToTerms'].setValue(false);
      fixture.detectChanges();

      // Act
      const submitButton = fixture.nativeElement.querySelector('[data-testid="register-submit"]');

      // Assert
      expect(submitButton.disabled).toBe(true);
    });

    it('should enable submit button when form is valid', () => {
      // Arrange - Valid form
      component.registrationForm.controls['email'].setValue('test@example.com');
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      component.registrationForm.controls['agreeToTerms'].setValue(true);
      fixture.detectChanges();

      // Act
      const submitButton = fixture.nativeElement.querySelector('[data-testid="register-submit"]');

      // Assert
      expect(submitButton.disabled).toBe(false);
    });

    it('should display inline error messages when field is invalid and touched', () => {
      // Arrange
      const emailControl = component.registrationForm.controls['email'];
      emailControl.setValue('invalid');
      emailControl.markAsTouched();
      fixture.detectChanges();

      // Act
      const errorMessage = fixture.nativeElement.querySelector('[data-testid="email-error"]');

      // Assert
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('valid email');
    });
  });

  describe('Password Strength Checklist (T057)', () => {
    it('should have hasMinLength signal', () => {
      // Assert
      expect(component.hasMinLength).toBeDefined();
    });

    it('should have hasLetter signal', () => {
      // Assert
      expect(component.hasLetter).toBeDefined();
    });

    it('should have hasNumber signal', () => {
      // Assert
      expect(component.hasNumber).toBeDefined();
    });

    it('should update hasMinLength signal based on password length', () => {
      // Arrange
      const passwordControl = component.registrationForm.controls['password'];

      // Act - Short password
      passwordControl.setValue('short');
      fixture.detectChanges();

      // Assert
      expect(component.hasMinLength()).toBe(false);

      // Act - Long enough password
      passwordControl.setValue('longenough');
      fixture.detectChanges();

      // Assert
      expect(component.hasMinLength()).toBe(true);
    });

    it('should update hasLetter signal based on password content', () => {
      // Arrange
      const passwordControl = component.registrationForm.controls['password'];

      // Act - Only numbers
      passwordControl.setValue('12345678');
      fixture.detectChanges();

      // Assert
      expect(component.hasLetter()).toBe(false);

      // Act - Contains letters
      passwordControl.setValue('password123');
      fixture.detectChanges();

      // Assert
      expect(component.hasLetter()).toBe(true);
    });

    it('should update hasNumber signal based on password content', () => {
      // Arrange
      const passwordControl = component.registrationForm.controls['password'];

      // Act - Only letters
      passwordControl.setValue('onlyletters');
      fixture.detectChanges();

      // Assert
      expect(component.hasNumber()).toBe(false);

      // Act - Contains numbers
      passwordControl.setValue('password123');
      fixture.detectChanges();

      // Assert
      expect(component.hasNumber()).toBe(true);
    });

    it('should display password strength checklist in template', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const minLengthItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-min-length"]'
      );
      const letterItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-has-letter"]'
      );
      const numberItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-has-number"]'
      );

      expect(minLengthItem).toBeTruthy();
      expect(letterItem).toBeTruthy();
      expect(numberItem).toBeTruthy();
    });

    it('should show checkmark (✓) for satisfied password requirements', () => {
      // Arrange - Strong password
      component.registrationForm.controls['password'].setValue('password123');
      fixture.detectChanges();

      // Assert
      const minLengthItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-min-length"]'
      );
      const letterItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-has-letter"]'
      );
      const numberItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-has-number"]'
      );

      expect(minLengthItem.textContent).toContain('✓');
      expect(letterItem.textContent).toContain('✓');
      expect(numberItem.textContent).toContain('✓');
    });

    it('should show circle (○) for unsatisfied password requirements', () => {
      // Arrange - Weak password (only letters, too short)
      component.registrationForm.controls['password'].setValue('weak');
      fixture.detectChanges();

      // Assert
      const minLengthItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-min-length"]'
      );
      const numberItem = fixture.nativeElement.querySelector(
        '[data-testid="checklist-has-number"]'
      );

      expect(minLengthItem.textContent).toContain('○');
      expect(numberItem.textContent).toContain('○');
    });
  });

  describe('Confirm Password Match (T058)', () => {
    it('should validate that password and confirmPassword match', () => {
      // Arrange
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('different');
      component.registrationForm.controls['confirmPassword'].markAsTouched();
      fixture.detectChanges();

      // Assert - Should be invalid when passwords don't match
      expect(component.registrationForm.controls['confirmPassword'].invalid).toBe(true);
      expect(
        component.registrationForm.controls['confirmPassword'].errors?.['passwordMatch']
      ).toBeTruthy();

      // Act - Make passwords match
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      fixture.detectChanges();

      // Assert - Should be valid when passwords match
      expect(component.registrationForm.controls['confirmPassword'].valid).toBe(true);
    });

    it('should display error message when passwords do not match', () => {
      // Arrange
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('different');
      component.registrationForm.controls['confirmPassword'].markAsTouched();
      fixture.detectChanges();

      // Act
      const errorMessage = fixture.nativeElement.querySelector(
        '[data-testid="confirm-password-error"]'
      );

      // Assert
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('match');
    });

    it('should not display error message when passwords match', () => {
      // Arrange
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].markAsTouched();
      fixture.detectChanges();

      // Act
      const errorMessage = fixture.nativeElement.querySelector(
        '[data-testid="confirm-password-error"]'
      );

      // Assert
      expect(errorMessage).toBeNull();
    });

    it('should revalidate confirmPassword when password changes', () => {
      // Arrange - Set initial matching passwords
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      fixture.detectChanges();

      // Assert - Should be valid
      expect(component.registrationForm.controls['confirmPassword'].valid).toBe(true);

      // Act - Change password to not match
      component.registrationForm.controls['password'].setValue('newpassword456');
      component.registrationForm.controls['confirmPassword'].markAsTouched();
      fixture.detectChanges();

      // Assert - Should now be invalid
      expect(component.registrationForm.controls['confirmPassword'].invalid).toBe(true);
      expect(
        component.registrationForm.controls['confirmPassword'].errors?.['passwordMatch']
      ).toBeTruthy();
    });
  });

  describe('Form Submission and Loading States', () => {
    it('should call AuthService.signUp on form submit', async () => {
      // Arrange
      component.registrationForm.controls['email'].setValue('test@example.com');
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      component.registrationForm.controls['agreeToTerms'].setValue(true);
      authServiceMock.signUp = jest.fn().mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(authServiceMock.signUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should show loading state during sign up', async () => {
      // Arrange
      component.registrationForm.controls['email'].setValue('test@example.com');
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      component.registrationForm.controls['agreeToTerms'].setValue(true);

      authServiceMock.signUp = jest
        .fn()
        .mockReturnValue(new Promise((resolve) => setTimeout(() => resolve({}), 100)));

      // Act
      const submitPromise = component.onSubmit();

      // Assert - Loading should be true immediately
      expect(component.isLoading()).toBe(true);

      await submitPromise;

      // Assert - Loading should be false after completion
      expect(component.isLoading()).toBe(false);
    });

    it('should disable form inputs during loading', () => {
      // Arrange - Set loading state and disable form
      component.isLoading.set(true);
      component.registrationForm.disable();
      fixture.detectChanges();

      // Act
      const emailInput = fixture.nativeElement.querySelector('[data-testid="email-input"]');
      const passwordInput = fixture.nativeElement.querySelector('[data-testid="password-input"]');
      const confirmPasswordInput = fixture.nativeElement.querySelector(
        '[data-testid="confirm-password-input"]'
      );
      const agreeToTermsCheckbox = fixture.nativeElement.querySelector(
        '[data-testid="agree-to-terms"]'
      );
      const submitButton = fixture.nativeElement.querySelector('[data-testid="register-submit"]');

      // Assert - Form controls should be disabled
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(confirmPasswordInput.disabled).toBe(true);
      expect(agreeToTermsCheckbox.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
    });

    it('should navigate to main app on successful sign up', async () => {
      // Arrange
      component.registrationForm.controls['email'].setValue('test@example.com');
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      component.registrationForm.controls['agreeToTerms'].setValue(true);
      authServiceMock.signUp = jest.fn().mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should display error message on failed sign up', async () => {
      // Arrange
      component.registrationForm.controls['email'].setValue('existing@example.com');
      component.registrationForm.controls['password'].setValue('password123');
      component.registrationForm.controls['confirmPassword'].setValue('password123');
      component.registrationForm.controls['agreeToTerms'].setValue(true);
      authServiceMock.signUp = jest.fn().mockResolvedValue({
        error: new Error('User already registered'),
      });

      // Act
      await component.onSubmit();
      fixture.detectChanges();

      // Assert
      expect(component.error()).toBeTruthy();
      expect(component.error()).toContain('already registered');

      const errorAlert = fixture.nativeElement.querySelector('[data-testid="register-error"]');
      expect(errorAlert).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA attributes on form elements', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const emailInput = fixture.nativeElement.querySelector('[data-testid="email-input"]');
      const passwordInput = fixture.nativeElement.querySelector('[data-testid="password-input"]');
      const confirmPasswordInput = fixture.nativeElement.querySelector(
        '[data-testid="confirm-password-input"]'
      );

      expect(emailInput.getAttribute('aria-required')).toBe('true');
      expect(passwordInput.getAttribute('aria-required')).toBe('true');
      expect(confirmPasswordInput.getAttribute('aria-required')).toBe('true');
    });

    it('should mark invalid fields with aria-invalid', () => {
      // Arrange
      const emailControl = component.registrationForm.controls['email'];
      emailControl.setValue('invalid');
      emailControl.markAsTouched();
      fixture.detectChanges();

      // Assert
      const emailInput = fixture.nativeElement.querySelector('[data-testid="email-input"]');
      expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should have aria-busy on form during submission', () => {
      // Arrange - Set loading state
      component.isLoading.set(true);
      fixture.detectChanges();

      // Assert
      const form = fixture.nativeElement.querySelector('form');
      expect(form.getAttribute('aria-busy')).toBe('true');
    });
  });
});
