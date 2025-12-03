import { createComponentFactory, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { Router } from '@angular/router';
import { UpgradePrompt } from './upgrade-prompt';
import { AuthService } from '../services/auth';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { Subject } from 'rxjs';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: jest.fn(() => 'web'),
  },
}));

describe('UpgradePrompt', () => {
  let spectator: Spectator<UpgradePrompt>;
  let authService: SpyObject<AuthService>;
  let authState: AuthStateService;
  let router: SpyObject<Router>;
  let upgradeSubject: Subject<{ error?: Error }>;

  const createComponent = createComponentFactory({
    component: UpgradePrompt,
    providers: [AuthStateService],
    mocks: [AuthService, Router],
    detectChanges: false,
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    spectator = createComponent();
    authService = spectator.inject(AuthService);
    authState = spectator.inject(AuthStateService);
    router = spectator.inject(Router);
    upgradeSubject = new Subject<{ error?: Error }>();

    // Default mock setup - anonymous user (use real AuthStateService with setter methods)
    authState.setCurrentUser(null);
    authState.setAnonymousMode(true);
    authService.upgradeToAuthenticated.mockReturnValue(upgradeSubject.asObservable());
    router.navigate.mockResolvedValue(true);

    spectator.detectChanges();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('Upgrade Prompt Visibility', () => {
    it('should show upgrade prompt when user is anonymous', () => {
      expect(spectator.component.visible()).toBe(true);

      const promptCard = spectator.query('[data-testid="upgrade-prompt-card"]');
      expect(promptCard).toBeTruthy();
    });

    it('should not show upgrade prompt when user is authenticated', () => {
      // Set up authenticated user state
      authState.setAnonymousMode(false);
      authState.setCurrentUser({ id: 'user-123', email: 'test@example.com' } as any);
      spectator.component.ngOnInit();
      spectator.detectChanges();

      expect(spectator.component.visible()).toBe(false);
    });
  });

  describe('Local Visit Count', () => {
    it('should have localVisitCount signal', () => {
      expect(spectator.component.localVisitCount).toBeDefined();
    });

    it('should display local visit count in template', () => {
      spectator.component.localVisitCount.set(5);
      spectator.detectChanges();

      const visitCountElement = spectator.query('[data-testid="local-visit-count"]');
      expect(visitCountElement).toBeTruthy();
      expect(visitCountElement?.textContent).toContain('5');
    });

    it('should handle zero local visits gracefully', () => {
      spectator.component.localVisitCount.set(0);
      spectator.detectChanges();

      const visitCountElement = spectator.query('[data-testid="local-visit-count"]');
      expect(visitCountElement).toBeTruthy();
      expect(visitCountElement?.textContent).toContain('0');
    });
  });

  describe('Upgrade Form Validation', () => {
    it('should have form with email, password, confirmPassword controls', () => {
      expect(spectator.component.upgradeForm).toBeTruthy();
      expect(spectator.component.upgradeForm.controls['email']).toBeTruthy();
      expect(spectator.component.upgradeForm.controls['password']).toBeTruthy();
      expect(spectator.component.upgradeForm.controls['confirmPassword']).toBeTruthy();
    });

    it('should validate email format', () => {
      const emailControl = spectator.component.upgradeForm.controls['email'];

      emailControl.setValue('invalid');
      emailControl.markAsTouched();

      expect(emailControl.invalid).toBe(true);
      expect(emailControl.errors?.['email']).toBeTruthy();

      emailControl.setValue('valid@example.com');

      expect(emailControl.valid).toBe(true);
    });

    it('should validate password strength', () => {
      const passwordControl = spectator.component.upgradeForm.controls['password'];

      passwordControl.setValue('weak');
      passwordControl.markAsTouched();

      expect(passwordControl.invalid).toBe(true);

      passwordControl.setValue('password123');

      expect(passwordControl.valid).toBe(true);
    });

    it('should validate password and confirmPassword match', () => {
      spectator.component.upgradeForm.controls['password'].setValue('password123');
      spectator.component.upgradeForm.controls['confirmPassword'].setValue('different');
      spectator.component.upgradeForm.controls['confirmPassword'].markAsTouched();
      spectator.detectChanges();

      // The passwordsMatchValidator is a form-level validator, so the error is on the form
      expect(spectator.component.upgradeForm.hasError('passwordsMismatch')).toBe(true);

      spectator.component.upgradeForm.controls['confirmPassword'].setValue('password123');
      spectator.detectChanges();

      expect(spectator.component.upgradeForm.hasError('passwordsMismatch')).toBe(false);
    });
  });

  describe('Migration Status Tracking', () => {
    it('should initialize migrationStatus to pending', () => {
      expect(spectator.component.migrationStatus()).toBe('pending');
    });

    it('should update migrationStatus to complete on success', async () => {
      spectator.component.upgradeForm.controls['email'].setValue('test@example.com');
      spectator.component.upgradeForm.controls['password'].setValue('password123');
      spectator.component.upgradeForm.controls['confirmPassword'].setValue('password123');

      spectator.component.onSubmit();
      upgradeSubject.next({});
      upgradeSubject.complete();

      expect(spectator.component.migrationStatus()).toBe('complete');
    });

    it('should update migrationStatus to failed on error', async () => {
      spectator.component.upgradeForm.controls['email'].setValue('test@example.com');
      spectator.component.upgradeForm.controls['password'].setValue('password123');
      spectator.component.upgradeForm.controls['confirmPassword'].setValue('password123');

      spectator.component.onSubmit();
      upgradeSubject.next({ error: new Error('Migration failed') });
      upgradeSubject.complete();

      expect(spectator.component.migrationStatus()).toBe('failed');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      spectator.component.upgradeForm.controls['email'].setValue('test@example.com');
      spectator.component.upgradeForm.controls['password'].setValue('password123');
      spectator.component.upgradeForm.controls['confirmPassword'].setValue('password123');
      spectator.detectChanges();
    });

    it('should call AuthService.upgradeToAuthenticated on form submit', async () => {
      spectator.component.onSubmit();
      upgradeSubject.complete();

      expect(authService.upgradeToAuthenticated).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should show loading state during upgrade', async () => {
      spectator.component.onSubmit();

      expect(spectator.component.isLoading()).toBe(true);

      upgradeSubject.complete();

      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should redirect on successful upgrade', async () => {
      spectator.component.onSubmit();
      upgradeSubject.next({});
      upgradeSubject.complete();
      jest.runAllTimers();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should display error message on failed upgrade', async () => {
      spectator.component.onSubmit();
      upgradeSubject.next({ error: new Error('Email already registered') });
      upgradeSubject.complete();
      spectator.detectChanges();

      expect(spectator.component.error()).toBeTruthy();

      const errorAlert = spectator.query('[data-testid="upgrade-error"]');
      expect(errorAlert).toBeTruthy();
    });
  });
});
