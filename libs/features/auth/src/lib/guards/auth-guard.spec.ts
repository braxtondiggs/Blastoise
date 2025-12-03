import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AuthStateService } from '@blastoise/shared/auth-state';

describe('authGuard', () => {
  let router: Router;
  let mockAuthState: {
    isAuthenticated: jest.Mock;
    isAnonymous: jest.Mock;
    isInitialized: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthState = {
      isAuthenticated: jest.fn(),
      isAnonymous: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthStateService,
          useValue: mockAuthState,
        },
        {
          provide: Router,
          useValue: {
            createUrlTree: jest.fn().mockImplementation((commands: string[], _extras?: object) => {
              return { toString: () => commands.join('/') } as unknown as UrlTree;
            }),
            navigate: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(authGuard).toBeTruthy();
  });

  it('should allow navigation when user is authenticated', async () => {
    mockAuthState.isAuthenticated.mockReturnValue(true);
    mockAuthState.isAnonymous.mockReturnValue(false);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/visits' } as RouterStateSnapshot;

    const result = await runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      authGuard(route, state)
    );

    expect(result).toBe(true);
  });

  it('should allow navigation when user is in anonymous mode', async () => {
    mockAuthState.isAuthenticated.mockReturnValue(false);
    mockAuthState.isAnonymous.mockReturnValue(true);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/visits' } as RouterStateSnapshot;

    const result = await runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      authGuard(route, state)
    );

    expect(result).toBe(true);
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockAuthState.isAuthenticated.mockReturnValue(false);
    mockAuthState.isAnonymous.mockReturnValue(false);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/visits' } as RouterStateSnapshot;

    const result = await runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      authGuard(route, state)
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/visits' },
    });
    // Result should be the UrlTree, not boolean
    expect(result).not.toBe(true);
  });
});
