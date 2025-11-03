/**
 * Development environment configuration
 *
 * Used for local development with docker-compose Supabase stack
 *
 * NOTE: For mobile emulators/simulators:
 *   - iOS Simulator: Use localhost
 *   - Android Emulator: Use 10.0.2.2 instead of localhost
 *   - Physical Device: Use your computer's local IP (e.g., 192.168.1.x)
 */

export interface Environment {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  production: boolean;
}

export const environment: Environment = {
  // Local Supabase via docker-compose (Kong gateway)
  // For Android emulator, change to: http://10.0.2.2:8000
  supabaseUrl: 'http://localhost:8000',

  // Demo anon key - safe for local development
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',

  // Local NestJS API
  // For Android emulator, change to: http://10.0.2.2:3000/api/v1
  apiBaseUrl: 'http://localhost:3000/api/v1',

  production: false,
};
