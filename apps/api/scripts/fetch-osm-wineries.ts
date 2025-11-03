#!/usr/bin/env tsx
/**
 * Fetch winery data from OpenStreetMap via Overpass API
 * https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: {
    name?: string;
    'addr:city'?: string;
    'addr:state'?: string;
    'addr:country'?: string;
    craft?: string;
    [key: string]: string | undefined;
  };
}

interface OSMResponse {
  elements: OSMElement[];
}

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'wineries.json');

// Overpass QL query for wineries worldwide
const OVERPASS_QUERY = `
[out:json][timeout:300];
(
  node["craft"="winery"];
  way["craft"="winery"];
  relation["craft"="winery"];
);
out center;
`;

async function fetchWineries(): Promise<OSMElement[]> {
  console.log('Fetching winery data from OpenStreetMap...');

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = (await response.json()) as OSMResponse;
    console.log(`Fetched ${data.elements.length} winery elements`);

    return data.elements;
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    throw error;
  }
}

function normalizeWinery(element: OSMElement) {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  return {
    id: `osm-${element.type}-${element.id}`,
    name: element.tags.name || 'Unnamed Winery',
    latitude: lat,
    longitude: lon,
    city: element.tags['addr:city'],
    state: element.tags['addr:state'],
    country: element.tags['addr:country'],
    source: 'osm',
  };
}

async function main() {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const elements = await fetchWineries();

  // Filter and normalize
  const validWineries = elements
    .map(normalizeWinery)
    .filter((w) => w.latitude && w.longitude && w.name);

  console.log(
    `Filtered to ${validWineries.length} wineries with valid coordinates`
  );

  // Save to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validWineries, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);

  // Statistics
  const byCountry = validWineries.reduce((acc, w) => {
    const country = w.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
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
