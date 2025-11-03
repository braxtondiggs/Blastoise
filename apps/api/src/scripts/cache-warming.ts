/**
 * T241: Redis Cache Warming Script
 *
 * Pre-loads Redis geospatial index with venue data for popular regions:
 * - Loads venues from Supabase
 * - Populates Redis GEOADD index
 * - Warms cache for frequently queried regions
 * - Can be run on deploy or via cron
 *
 * Usage:
 *   ts-node src/scripts/cache-warming.ts
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 *   REDIS_HOST - Redis host (default: localhost)
 *   REDIS_PORT - Redis port (default: 6379)
 *
 * Phase 8: Performance Optimization
 */

import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';

interface Venue {
  id: string;
  name: string;
  venue_type: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
}

/**
 * Popular regions to pre-cache (major metro areas)
 */
const POPULAR_REGIONS = [
  { name: 'Portland, OR', lat: 45.5231, lng: -122.6765, radius: 25 },
  { name: 'Seattle, WA', lat: 47.6062, lng: -122.3321, radius: 30 },
  { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194, radius: 35 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, radius: 40 },
  { name: 'Denver, CO', lat: 39.7392, lng: -104.9903, radius: 25 },
  { name: 'Asheville, NC', lat: 35.5951, lng: -82.5515, radius: 20 },
  { name: 'Napa Valley, CA', lat: 38.2975, lng: -122.2869, radius: 20 },
  { name: 'Austin, TX', lat: 30.2672, lng: -97.7431, radius: 25 },
  { name: 'San Diego, CA', lat: 32.7157, lng: -117.1611, radius: 30 },
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298, radius: 30 },
];

/**
 * Calculate distance between two points using Haversine formula (km)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Load all venues from Supabase
 */
async function loadVenuesFromDatabase(supabase: any): Promise<Venue[]> {
  console.log('📥 Loading venues from Supabase...');

  const { data, error } = await supabase
    .from('venues')
    .select('id, name, venue_type, latitude, longitude, city, state')
    .order('name');

  if (error) {
    throw new Error(`Failed to load venues: ${error.message}`);
  }

  console.log(`✅ Loaded ${data.length} venues`);
  return data as Venue[];
}

/**
 * Populate Redis geospatial index with all venues
 */
async function populateGeospatialIndex(redis: any, venues: Venue[]): Promise<void> {
  console.log('🗺️  Populating Redis geospatial index...');

  const GEOADD_KEY = 'venues:geo';

  // Clear existing index
  await redis.del(GEOADD_KEY);

  // Add venues in batches (Redis GEOADD supports multiple points)
  const batchSize = 100;
  let added = 0;

  for (let i = 0; i < venues.length; i += batchSize) {
    const batch = venues.slice(i, i + batchSize);

    // Build GEOADD arguments: [lon1, lat1, id1, lon2, lat2, id2, ...]
    const geoaddArgs = batch.flatMap((venue) => [
      venue.longitude,
      venue.latitude,
      venue.id,
    ]);

    if (geoaddArgs.length > 0) {
      await redis.geoAdd(GEOADD_KEY, geoaddArgs as any);
      added += batch.length;
    }
  }

  console.log(`✅ Added ${added} venues to geospatial index`);
}

/**
 * Pre-cache venue lists for popular regions
 */
async function warmPopularRegions(
  redis: any,
  venues: Venue[]
): Promise<void> {
  console.log('🔥 Warming cache for popular regions...');

  for (const region of POPULAR_REGIONS) {
    // Find venues within radius
    const nearbyVenues = venues.filter((venue) => {
      const distance = calculateDistance(
        region.lat,
        region.lng,
        venue.latitude,
        venue.longitude
      );
      return distance <= region.radius;
    });

    if (nearbyVenues.length === 0) {
      console.log(`⏭️  ${region.name}: No venues found`);
      continue;
    }

    // Cache the venue list
    const cacheKey = `venues:region:${region.lat.toFixed(2)},${region.lng.toFixed(2)}:${region.radius}`;
    const cacheValue = JSON.stringify({
      venues: nearbyVenues,
      cachedAt: new Date().toISOString(),
      count: nearbyVenues.length,
    });

    await redis.set(cacheKey, cacheValue, {
      EX: 3600, // 1 hour TTL
    });

    console.log(`✅ ${region.name}: Cached ${nearbyVenues.length} venues`);
  }
}

/**
 * Cache frequently accessed venue details
 */
async function warmVenueDetails(redis: any, venues: Venue[]): Promise<void> {
  console.log('🏢 Warming cache for top venue details...');

  // For now, cache top 100 venues by name (in production, use analytics data)
  const topVenues = venues.slice(0, 100);

  let cached = 0;
  for (const venue of topVenues) {
    const cacheKey = `venue:${venue.id}`;
    const cacheValue = JSON.stringify({
      ...venue,
      cachedAt: new Date().toISOString(),
    });

    await redis.set(cacheKey, cacheValue, {
      EX: 1800, // 30 minutes TTL
    });

    cached++;
  }

  console.log(`✅ Cached ${cached} venue details`);
}

/**
 * Main cache warming execution
 */
async function main() {
  console.log('🚀 Starting Redis cache warming...\n');

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Initialize clients
  const supabase = createClient(supabaseUrl, supabaseKey);
  const redis = createRedisClient({
    socket: {
      host: redisHost,
      port: redisPort,
    },
  });

  try {
    // Connect to Redis
    await redis.connect();
    console.log(`✅ Connected to Redis at ${redisHost}:${redisPort}\n`);

    // Load venues from database
    const venues = await loadVenuesFromDatabase(supabase);

    if (venues.length === 0) {
      console.log('⚠️  No venues found in database. Exiting.');
      return;
    }

    // Populate geospatial index
    await populateGeospatialIndex(redis, venues);

    // Warm popular regions
    await warmPopularRegions(redis, venues);

    // Warm top venue details
    await warmVenueDetails(redis, venues);

    console.log('\n✅ Cache warming complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total venues: ${venues.length}`);
    console.log(`   - Geospatial index: populated`);
    console.log(`   - Cached regions: ${POPULAR_REGIONS.length}`);
    console.log(`   - Cached venue details: 100`);

  } catch (error: any) {
    console.error('❌ Cache warming failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await redis.quit();
    console.log('\n👋 Disconnected from Redis');
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
