/**
 * Venue Cache Worker
 *
 * Background worker for venue data management:
 * - Periodic cache warming for popular venues
 * - Stale cache cleanup
 * - Redis geospatial index updates
 * - Venue data validation
 */

import { GeospatialService, CacheService, VenuesRepository } from '@blastoise/data-backend';

export class VenueCacheWorker {
  private readonly geoService: GeospatialService;
  private readonly cacheService: CacheService;
  private readonly venuesRepo: VenuesRepository;
  private readonly updateIntervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(updateIntervalMs = 60 * 60 * 1000) {
    // Default: 1 hour
    this.geoService = new GeospatialService();
    this.cacheService = new CacheService();
    this.venuesRepo = new VenuesRepository();
    this.updateIntervalMs = updateIntervalMs;
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
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Venue cache worker stopped');
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
      const venues = await this.venuesRepo.findAll();

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
      const venues = await this.venuesRepo.findAll();

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
      const venues = await this.venuesRepo.findAll();
      const validVenueIds = new Set(venues.map((v: any) => v.id));

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
