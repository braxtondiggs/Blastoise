import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { GeolocationProvider } from '@blastoise/shared';
import { CapacitorGeolocationProvider } from './providers/capacitor-geolocation.provider';
import { tokenInterceptor } from './auth/interceptors/token.interceptor';
import { refreshInterceptor } from './auth/interceptors/refresh.interceptor';
import { API_BASE_URL } from '@blastoise/features-auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Preload all lazy-loaded modules after initial load for faster navigation
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    // HTTP client with token and refresh interceptors
    provideHttpClient(withInterceptors([tokenInterceptor, refreshInterceptor])),
    { provide: GeolocationProvider, useClass: CapacitorGeolocationProvider },
    // Provide API base URL for AuthService
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
  ],
};
