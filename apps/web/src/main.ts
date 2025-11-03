import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initializeSyncWorker } from '@blastoise/workers';
import { initSupabaseClient } from '@blastoise/data';
import { environment } from './environments/environment';

// Initialize Supabase client for browser
initSupabaseClient({
  url: environment.supabaseUrl,
  anonKey: environment.supabaseAnonKey,
});

// Bootstrap Angular application
bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Register service worker for PWA support (T102)
// Only in production - dev doesn't have service-worker.js
if (environment.production && 'serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);

        // Initialize sync worker (T103-T104)
        initializeSyncWorker();
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
