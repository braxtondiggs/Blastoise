import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true,
  ngZoneRunCoalescing: true,
  preserveWhitespaces: false
});

// Enhanced error handling with more detailed logging
const handleBootstrapError = (error: any): void => {
  console.error('Application bootstrap failed:', error);

  // In development, provide more detailed error information
  if (!environment.production) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      environment: environment
    });
  }

  // Optional: Send error to monitoring service in production
  if (environment.production) {
    // TODO: Integrate with error monitoring service (e.g., Sentry, LogRocket)
    // errorService.logError(error);
  }
};

bootstrap().catch(handleBootstrapError);
