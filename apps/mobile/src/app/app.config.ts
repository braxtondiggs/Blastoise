import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { GeolocationProvider } from '@blastoise/shared';
import { CapacitorGeolocationProvider } from './providers/capacitor-geolocation.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(), // Required for ApiClient
    // Provide Capacitor geolocation for mobile (T108)
    { provide: GeolocationProvider, useClass: CapacitorGeolocationProvider },
  ],
};
