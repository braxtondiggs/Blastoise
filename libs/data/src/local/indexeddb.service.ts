import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  private dbName = 'app-db';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create visits object store with optimized indexes
        if (!db.objectStoreNames.contains('visits')) {
          const visitStore = db.createObjectStore('visits', { keyPath: 'id' });

          // Index for querying visits by user
          visitStore.createIndex('userId', 'user_id', { unique: false });

          // Index for sorting by arrival time (most recent first)
          visitStore.createIndex('arrivalTime', 'arrival_time', { unique: false });

          // Index for finding unsynced visits (offline sync)
          visitStore.createIndex('synced', 'synced', { unique: false });

          // Compound index for user + arrival time queries (optimized timeline)
          visitStore.createIndex('userArrival', ['user_id', 'arrival_time'], { unique: false });

          // Index for venue lookups (visit history per venue)
          visitStore.createIndex('venueId', 'venue_id', { unique: false });
        }

        // Create venues cache with optimized indexes
        if (!db.objectStoreNames.contains('venues')) {
          const venueStore = db.createObjectStore('venues', { keyPath: 'id' });

          // Index for venue type filtering (brewery vs winery)
          venueStore.createIndex('venueType', 'venue_type', { unique: false });

          // Index for location-based queries (city search)
          venueStore.createIndex('city', 'city', { unique: false });

          // Compound index for city + type queries
          venueStore.createIndex('cityType', ['city', 'venue_type'], { unique: false });
        }
      };
    });
  }

  async put(storeName: string, value: unknown): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T | null);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T[]);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey | boolean
  ): Promise<T[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      // Convert boolean to number for IndexedDB compatibility
      const indexValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      const request = index.getAll(indexValue as IDBValidKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T[]);
    });
  }

  /**
   * Query with range (for pagination and date ranges)
   */
  async getByIndexRange<T>(
    storeName: string,
    indexName: string,
    lowerBound?: IDBValidKey,
    upperBound?: IDBValidKey,
    limit?: number
  ): Promise<T[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);

      // Build range query
      let range: IDBKeyRange | undefined;
      if (lowerBound !== undefined && upperBound !== undefined) {
        range = IDBKeyRange.bound(lowerBound, upperBound);
      } else if (lowerBound !== undefined) {
        range = IDBKeyRange.lowerBound(lowerBound);
      } else if (upperBound !== undefined) {
        range = IDBKeyRange.upperBound(upperBound);
      }

      const request = index.openCursor(range, 'prev'); // prev = newest first
      const results: T[] = [];
      let count = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && (!limit || count < limit)) {
          results.push(cursor.value as T);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  /**
   * Count records matching index
   */
  async countByIndex(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.count(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Batch insert for better performance
   */
  async putBatch(storeName: string, values: unknown[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      values.forEach((value) => {
        store.put(value);
      });
    });
  }

  /**
   * Clear store (for cache invalidation)
   */
  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
