/**
 * Production environment configuration
 *
 * ⚠️  SECURITY: Replace these placeholder values with your production credentials!
 *
 * For Railway deployment:
 *   1. Set SUPABASE_URL to your Railway Kong service URL
 *   2. Generate new SUPABASE_ANON_KEY with your production JWT_SECRET
 *   3. Set API_BASE_URL to your Railway API service URL
 *
 * See docker/README.md for instructions on generating production keys.
 */

export const environment = {
  // ⚠️  TODO: Replace with your Railway Kong service URL
  // Example: https://blastoise-kong-production.up.railway.app
  supabaseUrl: 'REPLACE_WITH_PRODUCTION_SUPABASE_URL',

  // ⚠️  TODO: Generate new key with production JWT_SECRET
  // DO NOT use the demo key in production!
  supabaseAnonKey: 'REPLACE_WITH_PRODUCTION_ANON_KEY',

  // ⚠️  TODO: Replace with your Railway API service URL
  // Example: https://blastoise-api-production.up.railway.app/api/v1
  apiBaseUrl: 'REPLACE_WITH_PRODUCTION_API_URL',

  production: true,
};
