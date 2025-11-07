import { Route } from '@angular/router';

/**
 * App routing configuration with lazy-loaded modules (T105, T238)
 *
 * Code splitting strategy:
 * - All routes use lazy loading (loadComponent/loadChildren)
 * - Auth guard is lazy loaded to reduce initial bundle
 * - Feature modules split into separate chunks
 * - Public routes (shared visits) loaded independently
 */
export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('@blastoise/features-auth').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/register-page').then((m) => m.default),
      },
      {
        path: 'callback',
        loadComponent: () =>
          import('./pages/auth/callback-page').then((m) => m.default),
      },
      {
        path: 'onboarding',
        loadComponent: () =>
          import('@blastoise/features-auth').then((m) => m.Onboarding),
      },
      {
        path: 'password-reset',
        loadComponent: () =>
          import('@blastoise/features-auth').then((m) => m.PasswordReset),
      },
    ],
  },
  {
    path: 'visits',
    canActivate: [
      async () => (await import('@blastoise/features-auth')).authGuard,
      async () => (await import('@blastoise/features-auth')).onboardingGuard,
    ],
    loadChildren: () =>
      import('./pages/visits/visits.routes').then((m) => m.visitsRoutes),
  },
  {
    path: 'map',
    canActivate: [
      async () => (await import('@blastoise/features-auth')).authGuard,
      async () => (await import('@blastoise/features-auth')).onboardingGuard,
    ],
    loadChildren: () =>
      import('./pages/map/map.routes').then((m) => m.mapRoutes),
  },
  // T203: Public shared visit route (no authentication required)
  {
    path: 'shared/:shareId',
    loadComponent: () =>
      import('./pages/shared/shared-visit.page').then((m) => m.SharedVisitPage),
  },
  // T202: Settings route (User Story 4: T191-T196)
  {
    path: 'settings',
    canActivate: [
      async () => (await import('@blastoise/features-auth')).authGuard,
      async () => (await import('@blastoise/features-auth')).onboardingGuard,
    ],
    loadChildren: () =>
      import('./pages/settings/settings.routes').then((m) => m.settingsRoutes),
  },
  {
    path: '**',
    redirectTo: '/visits',
  },
];
