import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { GeolocationProvider } from '@blastoise/shared';
import { CapacitorGeolocationProvider } from './providers/capacitor-geolocation.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Preload all lazy-loaded modules after initial load for faster navigation
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    { provide: GeolocationProvider, useClass: CapacitorGeolocationProvider },
  ],
};
