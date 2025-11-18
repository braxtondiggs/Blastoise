import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env['SUPABASE_URL'] || '';
    // Use SERVICE_KEY for backend to bypass RLS policies
    const supabaseKey = process.env['SUPABASE_SERVICE_KEY'] || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}
