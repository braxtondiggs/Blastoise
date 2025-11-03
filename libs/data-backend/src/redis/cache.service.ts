import { getRedisClient } from './redis.client';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 1 hour)
}

export class CacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour

  /**
   * Set a value in the cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const client = await getRedisClient();
    const ttl = options.ttl ?? this.DEFAULT_TTL;
    const serialized = JSON.stringify(value);

    await client.setEx(key, ttl, serialized);
  }

  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = await getRedisClient();
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error parsing cached value:', error);
      return null;
    }
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<void> {
    const client = await getRedisClient();
    await client.del(key);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    return client.del(keys);
  }

  /**
   * Check if a key exists in the cache
   */
  async exists(key: string): Promise<boolean> {
    const client = await getRedisClient();
    const result = await client.exists(key);
    return result > 0;
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    const client = await getRedisClient();
    await client.expire(key, ttl);
  }

  /**
   * Get remaining time to live for a key
   */
  async ttl(key: string): Promise<number> {
    const client = await getRedisClient();
    return client.ttl(key);
  }

  /**
   * Cache a function result with automatic retrieval
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, options);

    return result;
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount = 1): Promise<number> {
    const client = await getRedisClient();
    return client.incrBy(key, amount);
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, amount = 1): Promise<number> {
    const client = await getRedisClient();
    return client.decrBy(key, amount);
  }

  /**
   * Clear all keys in the cache (use with caution)
   */
  async flush(): Promise<void> {
    const client = await getRedisClient();
    await client.flushDb();
  }
}

/**
 * Common cache key generators
 */
export const CacheKeys = {
  venue: (id: string) => `venue:${id}`,
  venueSearch: (query: string, type?: string) =>
    `venue:search:${type || 'all'}:${query}`,
  venuesNearby: (lat: number, lon: number, radius: number) =>
    `venues:nearby:${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}`,
  userVisits: (userId: string, page: number, limit: number) =>
    `user:${userId}:visits:${page}:${limit}`,
  visitStats: (userId: string) => `user:${userId}:visit-stats`,
  sharedVisit: (shareId: string) => `shared:${shareId}`,
  rateLimit: (identifier: string, endpoint: string) =>
    `rate-limit:${identifier}:${endpoint}`,
};
