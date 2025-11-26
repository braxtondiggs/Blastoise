#!/usr/bin/env tsx
/**
 * Rebuild Redis geospatial index from Postgres venues
 * Useful for resetting or updating the geo index
 *
 * Usage:
 *   DATABASE_URL=postgres://... tsx apps/api/scripts/rebuild-geo-index.ts
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 *   REDIS_HOST - Redis host (default: localhost)
 *   REDIS_PORT - Redis port (default: 6379)
 */

import { DataSource } from 'typeorm';
import { GeospatialService } from '@blastoise/data-backend';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

interface VenueRow {
  id: string;
  latitude: number;
  longitude: number;
}

async function rebuildGeoIndex() {
  console.log('Rebuilding Redis geospatial index...');

  // Create TypeORM DataSource for direct database access
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env['DATABASE_URL'],
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5432', 10),
    username: process.env['DATABASE_USERNAME'] || 'postgres',
    password: process.env['DATABASE_PASSWORD'] || 'postgres',
    database: process.env['DATABASE_NAME'] || 'blastoise',
    synchronize: false,
    logging: false,
  });

  const geoService = new GeospatialService();

  try {
    // Initialize database connection
    await dataSource.initialize();
    console.log('Connected to PostgreSQL');

    // Clear existing index
    console.log('Clearing existing index...');
    await geoService.clearAll();

    // Fetch all venues from Postgres
    console.log('Fetching venues from PostgreSQL...');
    const venues = await dataSource.query<VenueRow[]>(
      'SELECT id, latitude, longitude FROM venues WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    );

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
  } finally {
    // Clean up connections
    await dataSource.destroy();
    console.log('Disconnected from PostgreSQL');
  }
}

rebuildGeoIndex().catch((error) => {
  console.error('Failed to rebuild geo index:', error);
  process.exit(1);
});
