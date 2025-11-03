// Supabase
export * from './supabase/supabase.client'; // Exports: initSupabaseClient, getSupabaseClient, SupabaseConfig
export * from './supabase/visits.repository';
export * from './supabase/venues.repository';
export * from './supabase/users.repository';

// API (Angular)
export * from './api/api.client';
export * from './api/venues.api';
export * from './api/visits.api';
export * from './api/sharing.api';

// Local storage
export * from './local/indexeddb.service';
export * from './local/visits-local.repository';

// NOTE: Redis exports moved to @blastoise/data-backend (backend-only)
// Do NOT export Redis here as it will break browser builds

