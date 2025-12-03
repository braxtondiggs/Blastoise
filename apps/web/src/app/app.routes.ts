import { Route } from '@angular/router';
import { authGuard, onboardingGuard } from '@blastoise/features-auth';

/**
 * App routing configuration with lazy-loaded modules
 *
 * Code splitting strategy:
 * - All routes use lazy loading (loadComponent/loadChildren)
 * - Auth guard is lazy loaded to reduce initial bundle
 * - Feature modules split into separate chunks
 * - Public routes (shared visits) loaded independently
 *
 * Note: Map page removed - map is now integrated into the visits/timeline page
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
        loadComponent: () => import('@blastoise/features-auth').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/auth/register-page').then((m) => m.default),
      },
      {
        path: 'callback',
        loadComponent: () => import('./pages/auth/callback-page').then((m) => m.default),
      },
      {
        path: 'onboarding',
        loadComponent: () => import('@blastoise/features-auth').then((m) => m.Onboarding),
      },
      {
        path: 'password-reset',
        loadComponent: () => import('@blastoise/features-auth').then((m) => m.PasswordReset),
      },
    ],
  },
  {
    path: 'visits',
    canActivate: [authGuard, onboardingGuard],
    loadChildren: () => import('./pages/visits/visits.routes').then((m) => m.visitsRoutes),
  },
  {
    path: 'shared/:shareId',
    loadComponent: () => import('./pages/shared/shared-visit.page').then((m) => m.SharedVisitPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard, onboardingGuard],
    loadChildren: () => import('./pages/settings/settings.routes').then((m) => m.settingsRoutes),
  },
  {
    path: '**',
    redirectTo: '/visits',
  },
];
