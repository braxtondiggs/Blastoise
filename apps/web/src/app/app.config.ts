import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withPreloading,
  withInMemoryScrolling,
  PreloadAllModules,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { GeolocationProvider, API_BASE_URL } from '@blastoise/shared';
import { FEATURE_FLAGS_API_URL } from '@blastoise/data-frontend';
import { CapacitorGeolocationProvider } from './providers/capacitor-geolocation.provider';
import { tokenInterceptor } from './auth/interceptors/token.interceptor';
import { refreshInterceptor } from './auth/interceptors/refresh.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Preload all lazy-loaded modules after initial load for faster navigation
    // Reset scroll position to top on navigation, restore on back/forward
    provideRouter(
      appRoutes,
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      })
    ),
    // HTTP client with token and refresh interceptors
    provideHttpClient(withInterceptors([tokenInterceptor, refreshInterceptor])),
    { provide: GeolocationProvider, useClass: CapacitorGeolocationProvider },
    // Provide API base URL for AuthService and FeatureFlagsService
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: FEATURE_FLAGS_API_URL, useValue: environment.apiBaseUrl },
  ],
};
