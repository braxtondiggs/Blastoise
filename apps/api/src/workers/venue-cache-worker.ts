/**
 * Venue Cache Worker
 *
 * Background worker for venue data management:
 * - Periodic cache warming for popular venues
 * - Stale cache cleanup
 * - Redis geospatial index updates
 * - Venue data validation
 *
 * Note: This worker is designed to be run standalone or as part of
 * a scheduled job. It uses direct database queries via TypeORM DataSource.
 */

import { DataSource } from 'typeorm';
import { GeospatialService, CacheService } from '@blastoise/data-backend';

interface VenueRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  venue_type: string;
  city: string | null;
  state_province: string | null;
}

export class VenueCacheWorker {
  private readonly geoService: GeospatialService;
  private readonly cacheService: CacheService;
  private readonly updateIntervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;
  private dataSource: DataSource | null = null;

  constructor(updateIntervalMs = 60 * 60 * 1000) {
    // Default: 1 hour
    this.geoService = new GeospatialService();
    this.cacheService = new CacheService();
    this.updateIntervalMs = updateIntervalMs;
  }

  /**
   * Initialize database connection
   */
  private async initDataSource(): Promise<DataSource> {
    if (this.dataSource && this.dataSource.isInitialized) {
      return this.dataSource;
    }

    this.dataSource = new DataSource({
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

    await this.dataSource.initialize();
    return this.dataSource;
  }

  /**
   * Fetch all venues from database
   */
  private async fetchAllVenues(): Promise<VenueRow[]> {
    const ds = await this.initDataSource();
    return ds.query<VenueRow[]>(
      `SELECT id, name, latitude, longitude, venue_type, city, state_province
       FROM venues
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
    );
  }

  /**
   * Start the venue cache worker
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Venue cache worker is already running');
      return;
    }

    console.log('Starting venue cache worker...');

    // Run immediately on start
    this.runUpdate().catch((error) => {
      console.error('Initial venue cache update failed:', error);
    });

    // Schedule periodic updates
    this.intervalId = setInterval(() => {
      this.runUpdate().catch((error) => {
        console.error('Venue cache update failed:', error);
      });
    }, this.updateIntervalMs);

    console.log(
      `Venue cache worker started (update interval: ${this.updateIntervalMs / 1000}s)`
    );
  }

  /**
   * Stop the venue cache worker
   */
  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Venue cache worker stopped');
    }

    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
  }

  /**
   * Run cache update cycle
   */
  private async runUpdate(): Promise<void> {
    const startTime = Date.now();
    console.log('[VenueCacheWorker] Starting cache update...');

    try {
      // 1. Update Redis geospatial index
      await this.updateGeospatialIndex();

      // 2. Warm cache for popular venues
      await this.warmPopularVenuesCache();

      // 3. Clean up stale cache entries
      await this.cleanupStaleCache();

      const duration = Date.now() - startTime;
      console.log(
        `[VenueCacheWorker] Cache update completed in ${duration}ms`
      );
    } catch (error) {
      console.error('[VenueCacheWorker] Cache update failed:', error);
      throw error;
    }
  }

  /**
   * Update Redis geospatial index with all venues
   */
  private async updateGeospatialIndex(): Promise<void> {
    console.log('[VenueCacheWorker] Updating geospatial index...');

    try {
      // Fetch all venues from database
      const venues = await this.fetchAllVenues();

      if (venues.length === 0) {
        console.warn('[VenueCacheWorker] No venues found in database');
        return;
      }

      // Add all venues to geospatial index
      let addedCount = 0;
      let errorCount = 0;

      for (const venue of venues) {
        try {
          await this.geoService.addVenue(
            venue.id,
            venue.latitude,
            venue.longitude
          );
          addedCount++;
        } catch (error) {
          console.error(
            `[VenueCacheWorker] Failed to add venue ${venue.id} to geo index:`,
            error
          );
          errorCount++;
        }
      }

      console.log(
        `[VenueCacheWorker] Geospatial index updated: ${addedCount} added, ${errorCount} errors`
      );
    } catch (error) {
      console.error(
        '[VenueCacheWorker] Failed to update geospatial index:',
        error
      );
      throw error;
    }
  }

  /**
   * Warm cache for popular venues (venues with most visits)
   */
  private async warmPopularVenuesCache(): Promise<void> {
    console.log('[VenueCacheWorker] Warming popular venues cache...');

    try {
      // Get all venues (in production, this would be top N by visit count)
      const venues = await this.fetchAllVenues();

      // Take top 100 venues for cache warming
      const popularVenues = venues.slice(0, 100);

      let cachedCount = 0;

      for (const venue of popularVenues) {
        try {
          const cacheKey = `venue:${venue.id}`;
          await this.cacheService.set(cacheKey, venue, { ttl: 3600 }); // 1 hour TTL
          cachedCount++;
        } catch (error) {
          console.error(
            `[VenueCacheWorker] Failed to cache venue ${venue.id}:`,
            error
          );
        }
      }

      console.log(
        `[VenueCacheWorker] Cached ${cachedCount} popular venues`
      );
    } catch (error) {
      console.error('[VenueCacheWorker] Failed to warm cache:', error);
    }
  }

  /**
   * Clean up stale cache entries
   */
  private async cleanupStaleCache(): Promise<void> {
    console.log('[VenueCacheWorker] Cleaning up stale cache...');

    try {
      // Get all venue IDs from database
      const venues = await this.fetchAllVenues();
      const validVenueIds = new Set(venues.map((v) => v.id));

      // In production, scan Redis for venue keys and remove any that don't exist in DB
      // For now, just log that cleanup would happen
      console.log(
        `[VenueCacheWorker] Would validate ${validVenueIds.size} venue cache entries`
      );

      // Note: Actual Redis key scanning and deletion would be implemented here
      // using Redis SCAN command to avoid blocking
    } catch (error) {
      console.error('[VenueCacheWorker] Failed to cleanup cache:', error);
    }
  }

  /**
   * Force immediate cache update
   */
  async forceUpdate(): Promise<void> {
    console.log('[VenueCacheWorker] Forcing immediate cache update...');
    await this.runUpdate();
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    updateIntervalMs: number;
  } {
    return {
      isRunning: this.intervalId !== null,
      updateIntervalMs: this.updateIntervalMs,
    };
  }
}

/**
 * Export singleton instance
 */
export const venueCacheWorker = new VenueCacheWorker();
