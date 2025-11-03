/**
 * T202: Settings Routes
 */

import { Route } from '@angular/router';

export const settingsRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./settings.page').then((m) => m.SettingsPage),
  },
];
