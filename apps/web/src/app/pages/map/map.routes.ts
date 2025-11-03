/**
 * T164: Map Routes
 */

import { Routes } from '@angular/router';

export const mapRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./map.page').then((m) => m.MapPage),
  },
];
