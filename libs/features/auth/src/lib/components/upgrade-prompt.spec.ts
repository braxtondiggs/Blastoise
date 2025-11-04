import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UpgradePrompt } from './upgrade-prompt';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

describe('UpgradePrompt', () => {
  let component: UpgradePrompt;
  let fixture: ComponentFixture<UpgradePrompt>;
  let authServiceMock: jest.Mocked<Partial<AuthService>>;
  let authStateMock: jest.Mocked<Partial<AuthStateService>>;
  let routerMock: jest.Mocked<Partial<Router>>;

  beforeEach(async () => {
    // Create mock objects
    authServiceMock = {
      upgradeToAuthenticated: jest.fn(),
    };

    authStateMock = {
      isAnonymous: jest.fn().mockReturnValue(true),
      isAuthenticated: jest.fn().mockReturnValue(false),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UpgradePrompt],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthStateService, useValue: authStateMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpgradePrompt);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Upgrade Prompt Visibility (T080)', () => {
    it('should show upgrade prompt when user is anonymous', () => {
      // Arrange - User is anonymous
      authStateMock.isAnonymous = jest.fn().mockReturnValue(true);
      authStateMock.isAuthenticated = jest.fn().mockReturnValue(false);

      // Act
      fixture.detectChanges();

      // Assert - Prompt should be visible
      const promptCard = fixture.nativeElement.querySelector('[data-testid="upgrade-prompt-card"]');
      expect(promptCard).toBeTruthy();
    });

    it('should not show upgrade prompt when user is authenticated', () => {
      // Arrange - User is authenticated
      authStateMock.isAnonymous = jest.fn().mockReturnValue(false);
      authStateMock.isAuthenticated = jest.fn().mockReturnValue(true);

      // Act
      fixture.detectChanges();

      // Assert - Prompt should not be visible
      const promptCard = fixture.nativeElement.querySelector('[data-testid="upgrade-prompt-card"]');
      expect(promptCard).toBeNull();
    });

    it('should have visible property that reflects anonymous state', () => {
      // Arrange
      authStateMock.isAnonymous = jest.fn().mockReturnValue(true);

      // Act
      component.ngOnInit();
      fixture.detectChanges();

      // Assert
      expect(component.visible()).toBe(true);
    });
  });

  describe('Local Visit Count (T081)', () => {
    it('should have localVisitCount signal', () => {
      // Assert
      expect(component.localVisitCount).toBeDefined();
    });

    it('should query IndexedDB for local visit count on init', async () => {
      // Arrange - Mock IndexedDB query
      const mockVisitCount = 5;
      jest.spyOn(component as any, 'loadLocalVisitCount').mockResolvedValue(mockVisitCount);

      // Act
      await component.ngOnInit();
      fixture.detectChanges();

      // Assert
      expect(component.localVisitCount()).toBe(mockVisitCount);
    });

    it('should display local visit count in template', async () => {
      // Arrange
      component.localVisitCount.set(3);
      fixture.detectChanges();

      // Act
      const visitCountElement = fixture.nativeElement.querySelector(
        '[data-testid="local-visit-count"]'
      );

      // Assert
      expect(visitCountElement).toBeTruthy();
      expect(visitCountElement.textContent).toContain('3');
    });

    it('should handle zero local visits gracefully', async () => {
      // Arrange
      component.localVisitCount.set(0);
      fixture.detectChanges();

      // Act
      const visitCountElement = fixture.nativeElement.querySelector(
        '[data-testid="local-visit-count"]'
      );

      // Assert
      expect(visitCountElement).toBeTruthy();
      expect(visitCountElement.textContent).toContain('0');
    });
  });

  describe('Upgrade Form Validation', () => {
    it('should create reactive form with email, password, confirmPassword controls', () => {
      // Assert
      expect(component.upgradeForm).toBeTruthy();
      expect(component.upgradeForm.controls['email']).toBeTruthy();
      expect(component.upgradeForm.controls['password']).toBeTruthy();
      expect(component.upgradeForm.controls['confirmPassword']).toBeTruthy();
    });

    it('should validate email format', () => {
      // Arrange
      const emailControl = component.upgradeForm.controls['email'];

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

    it('should validate password strength', () => {
      // Arrange
      const passwordControl = component.upgradeForm.controls['password'];

      // Act - Weak password
      passwordControl.setValue('weak');
      passwordControl.markAsTouched();

      // Assert
      expect(passwordControl.invalid).toBe(true);

      // Act - Strong password
      passwordControl.setValue('password123');

      // Assert
      expect(passwordControl.valid).toBe(true);
    });

    it('should validate password and confirmPassword match', () => {
      // Arrange
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('different');
      component.upgradeForm.controls['confirmPassword'].markAsTouched();
      fixture.detectChanges();

      // Assert - Should be invalid when passwords don't match
      expect(component.upgradeForm.controls['confirmPassword'].invalid).toBe(true);

      // Act - Make passwords match
      component.upgradeForm.controls['confirmPassword'].setValue('password123');
      fixture.detectChanges();

      // Assert - Should be valid when passwords match
      expect(component.upgradeForm.controls['confirmPassword'].valid).toBe(true);
    });
  });

  describe('Migration Status Tracking', () => {
    it('should have migrationStatus signal', () => {
      // Assert
      expect(component.migrationStatus).toBeDefined();
    });

    it('should initialize migrationStatus to pending', () => {
      // Assert
      expect(component.migrationStatus()).toBe('pending');
    });

    it('should update migrationStatus to in-progress during upgrade', async () => {
      // Arrange
      component.upgradeForm.controls['email'].setValue('test@example.com');
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('password123');

      authServiceMock.upgradeToAuthenticated = jest
        .fn()
        .mockReturnValue(new Promise((resolve) => setTimeout(() => resolve({}), 100)));

      // Act
      const upgradePromise = component.onSubmit();

      // Assert - Status should be in-progress immediately
      expect(component.migrationStatus()).toBe('in-progress');

      await upgradePromise;
    });

    it('should update migrationStatus to complete on success', async () => {
      // Arrange
      component.upgradeForm.controls['email'].setValue('test@example.com');
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('password123');
      authServiceMock.upgradeToAuthenticated = jest.fn().mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(component.migrationStatus()).toBe('complete');
    });

    it('should update migrationStatus to failed on error', async () => {
      // Arrange
      component.upgradeForm.controls['email'].setValue('test@example.com');
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('password123');
      authServiceMock.upgradeToAuthenticated = jest.fn().mockResolvedValue({
        error: new Error('Migration failed'),
      });

      // Act
      await component.onSubmit();

      // Assert
      expect(component.migrationStatus()).toBe('failed');
    });
  });

  describe('Form Submission and Upgrade Flow', () => {
    it('should call AuthService.upgradeToAuthenticated on form submit', async () => {
      // Arrange
      component.upgradeForm.controls['email'].setValue('test@example.com');
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('password123');
      authServiceMock.upgradeToAuthenticated = jest.fn().mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(authServiceMock.upgradeToAuthenticated).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should show loading state during upgrade', async () => {
      // Arrange
      component.upgradeForm.controls['email'].setValue('test@example.com');
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('password123');

      authServiceMock.upgradeToAuthenticated = jest
        .fn()
        .mockReturnValue(new Promise((resolve) => setTimeout(() => resolve({}), 100)));

      // Act
      const upgradePromise = component.onSubmit();

      // Assert - Loading should be true immediately
      expect(component.isLoading()).toBe(true);

      await upgradePromise;

      // Assert - Loading should be false after completion
      expect(component.isLoading()).toBe(false);
    });

    it('should disable form inputs during loading', () => {
      // Arrange - Set loading state and disable form
      component.isLoading.set(true);
      component.upgradeForm.disable();
      fixture.detectChanges();

      // Act
      const emailInput = fixture.nativeElement.querySelector('[data-testid="upgrade-email-input"]');
      const passwordInput = fixture.nativeElement.querySelector(
        '[data-testid="upgrade-password-input"]'
      );
      const submitButton = fixture.nativeElement.querySelector('[data-testid="upgrade-submit"]');

      // Assert - Form controls should be disabled
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
    });

    it('should redirect to main app on successful upgrade', async () => {
      // Arrange
      component.upgradeForm.controls['email'].setValue('test@example.com');
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('password123');
      authServiceMock.upgradeToAuthenticated = jest.fn().mockResolvedValue({});

      // Act
      await component.onSubmit();

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should display error message on failed upgrade', async () => {
      // Arrange
      component.upgradeForm.controls['email'].setValue('existing@example.com');
      component.upgradeForm.controls['password'].setValue('password123');
      component.upgradeForm.controls['confirmPassword'].setValue('password123');
      authServiceMock.upgradeToAuthenticated = jest.fn().mockResolvedValue({
        error: new Error('Email already registered'),
      });

      // Act
      await component.onSubmit();
      fixture.detectChanges();

      // Assert
      expect(component.error()).toBeTruthy();
      expect(component.error()).toContain('already registered');

      const errorAlert = fixture.nativeElement.querySelector('[data-testid="upgrade-error"]');
      expect(errorAlert).toBeTruthy();
    });
  });

  describe('Migration Progress Indicator', () => {
    it('should show "Creating account..." when migration status is in-progress', () => {
      // Arrange
      component.migrationStatus.set('in-progress');
      fixture.detectChanges();

      // Act
      const progressMessage = fixture.nativeElement.querySelector(
        '[data-testid="migration-progress"]'
      );

      // Assert
      expect(progressMessage).toBeTruthy();
      expect(progressMessage.textContent).toContain('Creating account');
    });

    it('should show "Complete!" when migration status is complete', () => {
      // Arrange
      component.migrationStatus.set('complete');
      fixture.detectChanges();

      // Act
      const progressMessage = fixture.nativeElement.querySelector(
        '[data-testid="migration-complete"]'
      );

      // Assert
      expect(progressMessage).toBeTruthy();
      expect(progressMessage.textContent).toContain('Complete');
    });

    it('should show retry button when migration status is failed', () => {
      // Arrange
      component.migrationStatus.set('failed');
      fixture.detectChanges();

      // Act
      const retryButton = fixture.nativeElement.querySelector('[data-testid="migration-retry"]');

      // Assert
      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent).toContain('Retry');
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA attributes on form elements', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const emailInput = fixture.nativeElement.querySelector('[data-testid="upgrade-email-input"]');
      const passwordInput = fixture.nativeElement.querySelector(
        '[data-testid="upgrade-password-input"]'
      );

      expect(emailInput.getAttribute('aria-required')).toBe('true');
      expect(passwordInput.getAttribute('aria-required')).toBe('true');
    });

    it('should mark invalid fields with aria-invalid', () => {
      // Arrange
      const emailControl = component.upgradeForm.controls['email'];
      emailControl.setValue('invalid');
      emailControl.markAsTouched();
      fixture.detectChanges();

      // Assert
      const emailInput = fixture.nativeElement.querySelector('[data-testid="upgrade-email-input"]');
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
