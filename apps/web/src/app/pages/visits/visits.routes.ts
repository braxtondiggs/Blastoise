import { Route } from '@angular/router';

/**
 * T133: Timeline routes configuration
 *
 * User Story 2: Visual Timeline of Visits
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
