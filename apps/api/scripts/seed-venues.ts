#!/usr/bin/env tsx
/**
 * Seed venue data into PostgreSQL and Redis
 * Reads from breweries.json and wineries.json and inserts into database
 *
 * Usage:
 *   DATABASE_URL=postgres://... tsx apps/api/scripts/seed-venues.ts
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 *   REDIS_HOST - Redis host (default: localhost)
 *   REDIS_PORT - Redis port (default: 6379)
 */

import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { GeospatialService } from '@blastoise/data-backend';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

const DATA_DIR = path.join(__dirname, '../data');
const BREWERIES_FILE = path.join(DATA_DIR, 'breweries.json');
const WINERIES_FILE = path.join(DATA_DIR, 'wineries.json');

interface BreweryData {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  latitude: string;
  longitude: string;
}

interface WineryData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  source: string;
}

interface VenueInsert {
  name: string;
  latitude: number;
  longitude: number;
  city: string | null | undefined;
  state_province: string | null | undefined;
  country: string | undefined;
  venue_type: 'brewery' | 'winery';
  source: string;
  external_id: string;
}

async function seedBreweries(dataSource: DataSource, geoService: GeospatialService): Promise<number> {
  console.log('Seeding breweries...');

  if (!fs.existsSync(BREWERIES_FILE)) {
    console.warn(`Breweries file not found: ${BREWERIES_FILE}`);
    return 0;
  }

  const breweries = JSON.parse(
    fs.readFileSync(BREWERIES_FILE, 'utf-8')
  ) as BreweryData[];

  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < breweries.length; i += batchSize) {
    const batch = breweries.slice(i, i + batchSize);

    const venues: VenueInsert[] = batch.map((b) => ({
      name: b.name,
      latitude: parseFloat(b.latitude),
      longitude: parseFloat(b.longitude),
      city: b.city,
      state_province: b.state,
      country: b.country,
      venue_type: 'brewery' as const,
      source: 'brewerydb',
      external_id: b.id,
    }));

    try {
      // Use ON CONFLICT to handle duplicates
      const result = await dataSource.query(
        `INSERT INTO venues (name, latitude, longitude, city, state_province, country, venue_type, source, external_id)
         SELECT * FROM UNNEST($1::text[], $2::decimal[], $3::decimal[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[])
         ON CONFLICT (external_id, source) DO NOTHING
         RETURNING id, latitude, longitude`,
        [
          venues.map((v) => v.name),
          venues.map((v) => v.latitude),
          venues.map((v) => v.longitude),
          venues.map((v) => v.city),
          venues.map((v) => v.state_province),
          venues.map((v) => v.country),
          venues.map((v) => v.venue_type),
          venues.map((v) => v.source),
          venues.map((v) => v.external_id),
        ]
      );

      // Add to Redis geospatial index
      if (result && result.length > 0) {
        for (const venue of result) {
          await geoService.addVenue(venue.id, venue.latitude, venue.longitude);
        }
        inserted += result.length;
      }

      console.log(`Inserted ${inserted}/${breweries.length} breweries`);
    } catch (error) {
      console.error('Batch insert error:', error);
    }
  }

  console.log(`✓ Seeded ${inserted} breweries`);
  return inserted;
}

async function seedWineries(dataSource: DataSource, geoService: GeospatialService): Promise<number> {
  console.log('Seeding wineries...');

  if (!fs.existsSync(WINERIES_FILE)) {
    console.warn(`Wineries file not found: ${WINERIES_FILE}`);
    return 0;
  }

  const wineries = JSON.parse(
    fs.readFileSync(WINERIES_FILE, 'utf-8')
  ) as WineryData[];

  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < wineries.length; i += batchSize) {
    const batch = wineries.slice(i, i + batchSize);

    const venues: VenueInsert[] = batch.map((w) => ({
      name: w.name,
      latitude: w.latitude,
      longitude: w.longitude,
      city: w.city,
      state_province: w.state,
      country: w.country,
      venue_type: 'winery' as const,
      source: w.source,
      external_id: w.id,
    }));

    try {
      // Use ON CONFLICT to handle duplicates
      const result = await dataSource.query(
        `INSERT INTO venues (name, latitude, longitude, city, state_province, country, venue_type, source, external_id)
         SELECT * FROM UNNEST($1::text[], $2::decimal[], $3::decimal[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[])
         ON CONFLICT (external_id, source) DO NOTHING
         RETURNING id, latitude, longitude`,
        [
          venues.map((v) => v.name),
          venues.map((v) => v.latitude),
          venues.map((v) => v.longitude),
          venues.map((v) => v.city),
          venues.map((v) => v.state_province),
          venues.map((v) => v.country),
          venues.map((v) => v.venue_type),
          venues.map((v) => v.source),
          venues.map((v) => v.external_id),
        ]
      );

      // Add to Redis geospatial index
      if (result && result.length > 0) {
        for (const venue of result) {
          await geoService.addVenue(venue.id, venue.latitude, venue.longitude);
        }
        inserted += result.length;
      }

      console.log(`Inserted ${inserted}/${wineries.length} wineries`);
    } catch (error) {
      console.error('Batch insert error:', error);
    }
  }

  console.log(`✓ Seeded ${inserted} wineries`);
  return inserted;
}

async function main() {
  console.log('Starting venue seeding...\n');

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
    console.log('Connected to PostgreSQL\n');

    const breweriesCount = await seedBreweries(dataSource, geoService);
    const wineriesCount = await seedWineries(dataSource, geoService);

    const totalInRedis = await geoService.count();

    console.log('\n=== Seeding Complete ===');
    console.log(`Breweries: ${breweriesCount}`);
    console.log(`Wineries: ${wineriesCount}`);
    console.log(`Total in PostgreSQL: ${breweriesCount + wineriesCount}`);
    console.log(`Total in Redis geo index: ${totalInRedis}`);
  } finally {
    // Clean up connections
    await dataSource.destroy();
    console.log('\nDisconnected from PostgreSQL');
  }
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
