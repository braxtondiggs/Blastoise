import { Route } from '@angular/router';

export const settingsRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'import',
    loadComponent: () =>
      import('../../settings/import/import-wizard.component').then((m) => m.ImportWizardComponent),
  },
  {
    path: 'import-history',
    loadComponent: () =>
      import('../../settings/import/import-history.component').then((m) => m.ImportHistoryComponent),
  },
];
