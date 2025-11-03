#!/usr/bin/env tsx
/**
 * Seed venue data into Postgres and Redis
 * Reads from breweries.json and wineries.json and inserts into database
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseClient, GeospatialService } from '@blastoise/data-backend';

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

async function seedBreweries() {
  console.log('Seeding breweries...');

  if (!fs.existsSync(BREWERIES_FILE)) {
    console.warn(`Breweries file not found: ${BREWERIES_FILE}`);
    return 0;
  }

  const breweries = JSON.parse(
    fs.readFileSync(BREWERIES_FILE, 'utf-8')
  ) as BreweryData[];
  const supabase = getSupabaseClient();
  const geoService = new GeospatialService();

  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < breweries.length; i += batchSize) {
    const batch = breweries.slice(i, i + batchSize);

    const venues = batch.map((b) => ({
      name: b.name,
      latitude: parseFloat(b.latitude),
      longitude: parseFloat(b.longitude),
      city: b.city,
      state_province: b.state,
      country: b.country,
      venue_type: 'brewery' as const,
      source: 'brewerydb' as const,
      external_id: b.id,
    }));

    try {
      const { data, error } = await supabase
        .from('venues')
        .upsert(venues, {
          onConflict: 'external_id,source',
          ignoreDuplicates: true,
        })
        .select();

      if (error) {
        console.error('Error inserting batch:', error);
        continue;
      }

      // Add to Redis geospatial index
      if (data) {
        for (const venue of data) {
          await geoService.addVenue(venue.id, venue.latitude, venue.longitude);
        }
        inserted += data.length;
      }

      console.log(`Inserted ${inserted}/${breweries.length} breweries`);
    } catch (error) {
      console.error('Batch insert error:', error);
    }
  }

  console.log(`✓ Seeded ${inserted} breweries`);
  return inserted;
}

async function seedWineries() {
  console.log('Seeding wineries...');

  if (!fs.existsSync(WINERIES_FILE)) {
    console.warn(`Wineries file not found: ${WINERIES_FILE}`);
    return 0;
  }

  const wineries = JSON.parse(
    fs.readFileSync(WINERIES_FILE, 'utf-8')
  ) as WineryData[];
  const supabase = getSupabaseClient();
  const geoService = new GeospatialService();

  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < wineries.length; i += batchSize) {
    const batch = wineries.slice(i, i + batchSize);

    const venues = batch.map((w) => ({
      name: w.name,
      latitude: w.latitude,
      longitude: w.longitude,
      city: w.city,
      state_province: w.state,
      country: w.country,
      venue_type: 'winery' as const,
      source: w.source as 'osm',
      external_id: w.id,
    }));

    try {
      const { data, error } = await supabase
        .from('venues')
        .upsert(venues, {
          onConflict: 'external_id,source',
          ignoreDuplicates: true,
        })
        .select();

      if (error) {
        console.error('Error inserting batch:', error);
        continue;
      }

      // Add to Redis geospatial index
      if (data) {
        for (const venue of data) {
          await geoService.addVenue(venue.id, venue.latitude, venue.longitude);
        }
        inserted += data.length;
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

  const breweriesCount = await seedBreweries();
  const wineriesCount = await seedWineries();

  const geoService = new GeospatialService();
  const totalInRedis = await geoService.count();

  console.log('\n=== Seeding Complete ===');
  console.log(`Breweries: ${breweriesCount}`);
  console.log(`Wineries: ${wineriesCount}`);
  console.log(`Total in Postgres: ${breweriesCount + wineriesCount}`);
  console.log(`Total in Redis geo index: ${totalInRedis}`);
}

main().catch(console.error);
