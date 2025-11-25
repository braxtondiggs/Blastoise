import { Route } from '@angular/router';

/**
 * Timeline routes configuration
 */
export const visitsRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./timeline.page').then((m) => m.TimelinePage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./visit-detail.page').then((m) => m.VisitDetailPage),
  },
];
