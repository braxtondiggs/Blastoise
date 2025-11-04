import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Initialize Supabase client with configuration.
 * Must be called before using getSupabaseClient().
 *
 * @example
 * // In Angular app initialization (main.ts or app.config.ts)
 * initSupabaseClient({
 *   url: 'http://localhost:8000',
 *   anonKey: 'your-anon-key'
 * });
 */
export function initSupabaseClient(config: SupabaseConfig): void {
  if (!config.url || !config.anonKey) {
    throw new Error('Missing Supabase configuration: url and anonKey are required');
  }

  // Create Supabase client with auth configuration
  supabaseClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'blastoise-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
      // Provide a no-op lock function to bypass Navigator Lock API
      // This prevents lock timeout errors when multiple tabs are open
      // Safe because Angular handles state management and localStorage is already thread-safe
      lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
        // Skip lock acquisition, just execute the function directly
        return await fn();
      },
    },
  });
}

/**
 * Get the initialized Supabase client.
 * Throws error if not initialized - call initSupabaseClient() first.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      'Supabase client not initialized. Call initSupabaseClient() with your config first.'
    );
  }
  return supabaseClient;
}
