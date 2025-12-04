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

        // Create visits object store
        if (!db.objectStoreNames.contains('visits')) {
          const visitStore = db.createObjectStore('visits', { keyPath: 'id' });
          visitStore.createIndex('userId', 'user_id', { unique: false });
          visitStore.createIndex('arrivalTime', 'arrival_time', { unique: false });
          visitStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create venues cache
        if (!db.objectStoreNames.contains('venues')) {
          db.createObjectStore('venues', { keyPath: 'id' });
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
