import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initSupabaseClient } from '@blastoise/data';
import { environment } from './environments/environment';

// Initialize Supabase client for mobile
initSupabaseClient({
  url: environment.supabaseUrl,
  anonKey: environment.supabaseAnonKey,
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
