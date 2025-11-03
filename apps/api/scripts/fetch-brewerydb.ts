#!/usr/bin/env tsx
/**
 * Fetch brewery data from Open Brewery DB API
 * https://www.openbrewerydb.org/documentation
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

interface BreweryDBEntry {
  id: string;
  name: string;
  brewery_type: string;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  longitude: string | null;
  latitude: string | null;
  phone: string | null;
  website_url: string | null;
}

const API_BASE_URL = 'https://api.openbrewerydb.org/v1/breweries';
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'breweries.json');

async function fetchAllBreweries(): Promise<BreweryDBEntry[]> {
  const allBreweries: BreweryDBEntry[] = [];
  let page = 1;
  const perPage = 200;
  let hasMore = true;

  console.log('Fetching brewery data from Open Brewery DB...');

  while (hasMore) {
    const url = `${API_BASE_URL}?page=${page}&per_page=${perPage}`;
    console.log(`Fetching page ${page}...`);

    try {
      const response = await fetch(url);
      const data = (await response.json()) as BreweryDBEntry[];

      if (data.length === 0) {
        hasMore = false;
      } else {
        allBreweries.push(...data);
        page++;
      }

      // Rate limiting: 1 request per second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }

  console.log(`Fetched ${allBreweries.length} breweries`);
  return allBreweries;
}

async function main() {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const breweries = await fetchAllBreweries();

  // Filter out breweries without coordinates
  const validBreweries = breweries.filter(
    (b) => b.latitude && b.longitude && b.name
  );

  console.log(
    `Filtered to ${validBreweries.length} breweries with valid coordinates`
  );

  // Save to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validBreweries, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);

  // Statistics
  const byCountry = validBreweries.reduce((acc, b) => {
    acc[b.country] = (acc[b.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nBreakdown by country:');
  Object.entries(byCountry)
    .sort(([, a], [, b]) => b - a)
    .forEach(([country, count]) => {
      console.log(`  ${country}: ${count}`);
    });
}

main().catch(console.error);
