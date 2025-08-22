import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { environment } from './environments/environment';

import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';

// Firebase modular imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';

if (environment.production) {
  enableProdMode();
}

const bootstrap = () => bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(BrowserAnimationsModule),
    importProvidersFrom(MatNativeDateModule),
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
  provideFirebaseApp(() => initializeApp(environment.firebase)),
  provideAuth(() => getAuth()),
  provideFirestore(() => getFirestore()),
  provideAnalytics(() => getAnalytics()),
  provideMessaging(() => getMessaging()),
    importProvidersFrom(ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    }))
  ]
});

const handleBootstrapError = (error: any): void => {
  console.error('Application bootstrap failed:', error);

  if (!environment.production) {
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      environment
    });
  }
};

bootstrap().catch(handleBootstrapError);
