#!/usr/bin/env tsx
/**
 * Rebuild Redis geospatial index from Postgres venues
 * Useful for resetting or updating the geo index
 */

import { getSupabaseClient, GeospatialService } from '@blastoise/data-backend';

async function rebuildGeoIndex() {
  console.log('Rebuilding Redis geospatial index...');

  const supabase = getSupabaseClient();
  const geoService = new GeospatialService();

  // Clear existing index
  console.log('Clearing existing index...');
  await geoService.clearAll();

  // Fetch all venues from Postgres
  console.log('Fetching venues from Postgres...');
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, latitude, longitude');

  if (error) {
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  if (!venues || venues.length === 0) {
    console.log('No venues found in database');
    return;
  }

  console.log(`Found ${venues.length} venues`);

  // Add venues to Redis in batches
  const batchSize = 1000;
  for (let i = 0; i < venues.length; i += batchSize) {
    const batch = venues.slice(i, i + batchSize);
    await geoService.addVenues(batch);
    console.log(`Indexed ${Math.min(i + batchSize, venues.length)}/${venues.length} venues`);
  }

  const totalInRedis = await geoService.count();
  console.log(`✓ Rebuild complete. Total venues in geo index: ${totalInRedis}`);
}

rebuildGeoIndex().catch(console.error);
