/**
 * Caches Tier 2 (Open Brewery DB) and Tier 3 (Google Search) verification results in Redis
 * TTL: 30 days for Tier 2, 60 days for Tier 3
 */

import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface VerificationResult {
  tier: 2 | 3; // Tier 1 (keyword) is not cached as it's instant
  venue_type: 'brewery' | 'winery';
  verified: boolean;
  source?: string; // e.g., 'open_brewery_db', 'google_search'
  confidence: number; // 0.0 to 1.0
  cached_at: string; // ISO 8601 timestamp
}

@Injectable()
export class VerificationCacheService {
  private readonly logger = new Logger(VerificationCacheService.name);
  private readonly redis: Redis;

  // Cache TTL in seconds
  private readonly TIER2_TTL = 30 * 24 * 60 * 60; // 30 days
  private readonly TIER3_TTL = 60 * 24 * 60 * 60; // 60 days
  private readonly DISCOVERY_TTL = 24 * 60 * 60; // 24 hours

  // Redis key prefixes
  private readonly TIER2_PREFIX = 'venue:verify:tier2:';
  private readonly TIER3_PREFIX = 'venue:verify:tier3:';
  private readonly DISCOVERY_PREFIX = 'venue:discovery:';

  constructor() {
    // Connect to Redis
    const redisHost = process.env['REDIS_HOST'] || 'localhost';
    const redisPort = parseInt(process.env['REDIS_PORT'] || '6379');
    const redisPassword = process.env['REDIS_PASSWORD'];

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for verification cache');
    });
  }

  /**
   * Cache Tier 2 (Open Brewery DB) verification result
   * TTL: 30 days
   */
  async cacheTier2Result(
    placeName: string,
    latitude: number,
    longitude: number,
    result: Omit<VerificationResult, 'tier' | 'cached_at'>
  ): Promise<void> {
    try {
      const key = this.buildTier2Key(placeName, latitude, longitude);
      const value: VerificationResult = {
        ...result,
        tier: 2,
        cached_at: new Date().toISOString(),
      };

      await this.redis.setex(key, this.TIER2_TTL, JSON.stringify(value));

      this.logger.debug(
        `Cached Tier 2 verification for "${placeName}" (${latitude}, ${longitude})`
      );
    } catch (error) {
      this.logger.error(`Failed to cache Tier 2 result: ${error}`);
      // Don't throw - caching failure shouldn't fail the import
    }
  }

  /**
   * Cache Tier 3 (Google Search) verification result
   * TTL: 60 days
   */
  async cacheTier3Result(
    placeName: string,
    result: Omit<VerificationResult, 'tier' | 'cached_at'>
  ): Promise<void> {
    try {
      const key = this.buildTier3Key(placeName);
      const value: VerificationResult = {
        ...result,
        tier: 3,
        cached_at: new Date().toISOString(),
      };

      await this.redis.setex(key, this.TIER3_TTL, JSON.stringify(value));

      this.logger.debug(`Cached Tier 3 verification for "${placeName}"`);
    } catch (error) {
      this.logger.error(`Failed to cache Tier 3 result: ${error}`);
      // Don't throw - caching failure shouldn't fail the import
    }
  }

  /**
   * Retrieve cached Tier 2 verification result
   * Returns null if not found or expired
   */
  async getTier2Result(
    placeName: string,
    latitude: number,
    longitude: number
  ): Promise<VerificationResult | null> {
    try {
      const key = this.buildTier2Key(placeName, latitude, longitude);
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      const result: VerificationResult = JSON.parse(cached);

      this.logger.debug(
        `Cache HIT for Tier 2: "${placeName}" (${latitude}, ${longitude})`
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to retrieve Tier 2 cache: ${error}`);
      return null;
    }
  }

  /**
   * Retrieve cached Tier 3 verification result
   * Returns null if not found or expired
   */
  async getTier3Result(placeName: string): Promise<VerificationResult | null> {
    try {
      const key = this.buildTier3Key(placeName);
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      const result: VerificationResult = JSON.parse(cached);

      this.logger.debug(`Cache HIT for Tier 3: "${placeName}"`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to retrieve Tier 3 cache: ${error}`);
      return null;
    }
  }

  /**
   * Build Redis key for Tier 2 (location-specific)
   * Format: venue:verify:tier2:{normalized_name}:{lat_rounded}:{lng_rounded}
   */
  private buildTier2Key(
    placeName: string,
    latitude: number,
    longitude: number
  ): string {
    const normalizedName = this.normalizePlaceName(placeName);
    // Round to 4 decimal places (~11m precision)
    const latRounded = latitude.toFixed(4);
    const lngRounded = longitude.toFixed(4);

    return `${this.TIER2_PREFIX}${normalizedName}:${latRounded}:${lngRounded}`;
  }

  /**
   * Build Redis key for Tier 3 (name-based only)
   * Format: venue:verify:tier3:{normalized_name}
   */
  private buildTier3Key(placeName: string): string {
    const normalizedName = this.normalizePlaceName(placeName);
    return `${this.TIER3_PREFIX}${normalizedName}`;
  }

  /**
   * Normalize place name for consistent cache keys
   * - Lowercase
   * - Remove special characters
   * - Trim whitespace
   * - Replace spaces with underscores
   */
  private normalizePlaceName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  }

  /**
   * Cache that an area has been searched for venue discovery
   * Uses geo-grid with 0.1° precision (~11km grid cells)
   * TTL: 24 hours
   */
  async cacheDiscoverySearch(
    latitude: number,
    longitude: number,
    venuesFound: number
  ): Promise<void> {
    try {
      const key = this.buildDiscoveryKey(latitude, longitude);
      const value = {
        searched_at: new Date().toISOString(),
        venues_found: venuesFound,
      };

      await this.redis.setex(key, this.DISCOVERY_TTL, JSON.stringify(value));

      this.logger.debug(
        `Cached discovery search for grid (${this.roundToGrid(latitude)}, ${this.roundToGrid(longitude)}) - found ${venuesFound} venues`
      );
    } catch (error) {
      this.logger.error(`Failed to cache discovery search: ${error}`);
    }
  }

  /**
   * Check if an area has been searched recently for venue discovery
   * Returns null if not searched, or the search info if cached
   */
  async getDiscoverySearch(
    latitude: number,
    longitude: number
  ): Promise<{ searched_at: string; venues_found: number } | null> {
    try {
      const key = this.buildDiscoveryKey(latitude, longitude);
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      const result = JSON.parse(cached);

      this.logger.debug(
        `Discovery cache HIT for grid (${this.roundToGrid(latitude)}, ${this.roundToGrid(longitude)})`
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to retrieve discovery cache: ${error}`);
      return null;
    }
  }

  /**
   * Build Redis key for discovery cache (geo-grid based)
   * Format: venue:discovery:{lat_grid}:{lng_grid}
   * Grid precision: 0.1° (~11km)
   */
  private buildDiscoveryKey(latitude: number, longitude: number): string {
    const latGrid = this.roundToGrid(latitude);
    const lngGrid = this.roundToGrid(longitude);
    return `${this.DISCOVERY_PREFIX}${latGrid}:${lngGrid}`;
  }

  /**
   * Round coordinate to 0.1° grid (~11km precision)
   */
  private roundToGrid(coord: number): string {
    return (Math.round(coord * 10) / 10).toFixed(1);
  }

  /**
   * Clear all verification cache entries (for testing/maintenance)
   */
  async clearAllCache(): Promise<void> {
    try {
      const tier2Keys = await this.redis.keys(`${this.TIER2_PREFIX}*`);
      const tier3Keys = await this.redis.keys(`${this.TIER3_PREFIX}*`);
      const discoveryKeys = await this.redis.keys(`${this.DISCOVERY_PREFIX}*`);

      const allKeys = [...tier2Keys, ...tier3Keys, ...discoveryKeys];

      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
        this.logger.log(
          `Cleared ${allKeys.length} cache entries (tier2: ${tier2Keys.length}, tier3: ${tier3Keys.length}, discovery: ${discoveryKeys.length})`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to clear verification cache: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    tier2_count: number;
    tier3_count: number;
    discovery_count: number;
    total: number;
  }> {
    try {
      const tier2Keys = await this.redis.keys(`${this.TIER2_PREFIX}*`);
      const tier3Keys = await this.redis.keys(`${this.TIER3_PREFIX}*`);
      const discoveryKeys = await this.redis.keys(`${this.DISCOVERY_PREFIX}*`);

      return {
        tier2_count: tier2Keys.length,
        tier3_count: tier3Keys.length,
        discovery_count: discoveryKeys.length,
        total: tier2Keys.length + tier3Keys.length + discoveryKeys.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error}`);
      return { tier2_count: 0, tier3_count: 0, discovery_count: 0, total: 0 };
    }
  }

  /**
   * Generic cache get method for any key
   * Used by Overpass API, Google Places API, and Nominatim services
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache for ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Generic cache set method for any key with custom TTL
   * Used by Overpass API, Google Places API, and Nominatim services
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Failed to set cache for ${key}: ${error}`);
      // Don't throw - caching failure shouldn't fail the import
    }
  }

  /**
   * Cleanup - close Redis connection
   */
  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Closed Redis verification cache connection');
  }
}
