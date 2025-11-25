import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth';
import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';

describe('authGuard', () => {
  let router: Router;
  let mockAuthService: {
    isAuthenticated: jest.Mock;
    isAnonymous: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: jest.fn(),
      isAnonymous: jest.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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

  it('should allow navigation when user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.isAnonymous.mockReturnValue(false);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/visits' } as RouterStateSnapshot;

    const result = runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      authGuard(route, state)
    );

    expect(result).toBe(true);
  });

  it('should allow navigation when user is in anonymous mode', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.isAnonymous.mockReturnValue(true);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/visits' } as RouterStateSnapshot;

    const result = runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      authGuard(route, state)
    );

    expect(result).toBe(true);
  });

  it('should redirect to login when user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.isAnonymous.mockReturnValue(false);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/visits' } as RouterStateSnapshot;

    const result = runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      authGuard(route, state)
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/visits' },
    });
    // Result should be the UrlTree, not boolean
    expect(result).not.toBe(true);
  });
});
