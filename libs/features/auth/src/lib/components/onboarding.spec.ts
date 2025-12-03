import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Router, ActivatedRoute } from '@angular/router';
import { Onboarding } from './onboarding';
import { AuthService } from '../services/auth';
import { signal } from '@angular/core';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { FeatureFlagsService } from '@blastoise/data-frontend';

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

describe('Onboarding', () => {
  let spectator: Spectator<Onboarding>;
  let authService: AuthService;
  let router: Router;

  const createComponent = createComponentFactory({
    component: Onboarding,
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParams: {},
          },
        },
      },
      {
        provide: FeatureFlagsService,
        useValue: {
          guestModeEnabled: signal(true),
        },
      },
      {
        provide: AuthStateService,
        useValue: {
          isAuthenticated: jest.fn(() => false),
          isAnonymous: jest.fn(() => true),
        },
      },
    ],
    mocks: [Router, AuthService],
    detectChanges: false,
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    localStorageMock.clear();
    spectator = createComponent();
    authService = spectator.inject(AuthService);
    router = spectator.inject(Router);
    authService.completeOnboarding.mockResolvedValue(undefined);
    authService.getOnboardingStatus.mockResolvedValue({ completed: false });
    router.navigate.mockResolvedValue(true);
    router.navigateByUrl.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should create', () => {
    spectator.detectChanges();
    expect(spectator.component).toBeTruthy();
  });

  it('should have correct number of steps', () => {
    spectator.detectChanges();
    expect(spectator.component.totalSteps).toBe(4);
  });

  it('should start at step 0', () => {
    spectator.detectChanges();
    expect(spectator.component.currentStep()).toBe(0);
  });

  it('should navigate to next step', () => {
    spectator.detectChanges();
    spectator.component.nextStep();
    jest.runAllTimers();
    expect(spectator.component.currentStep()).toBe(1);
  });

  it('should navigate to previous step', () => {
    spectator.detectChanges();
    spectator.component.nextStep();
    jest.runAllTimers();
    spectator.component.previousStep();
    jest.runAllTimers();
    expect(spectator.component.currentStep()).toBe(0);
  });

  it('should not go below step 0', () => {
    spectator.detectChanges();
    spectator.component.previousStep();
    expect(spectator.component.currentStep()).toBe(0);
  });

  it('should enable anonymous mode on continue as guest', async () => {
    spectator.detectChanges();

    await spectator.component.onContinueAsGuest();

    expect(authService.enableAnonymousMode).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
