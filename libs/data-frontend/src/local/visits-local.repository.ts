import { Injectable, inject } from '@angular/core';
import { IndexedDBService } from './indexeddb.service';
import { Visit } from '@blastoise/shared';

@Injectable({
  providedIn: 'root',
})
export class VisitsLocalRepository {
  private storeName = 'visits';
  private readonly db = inject(IndexedDBService);

  async save(visit: Visit): Promise<void> {
    await this.db.put(this.storeName, visit);
  }

  async findById(id: string): Promise<Visit | null> {
    return this.db.get<Visit>(this.storeName, id);
  }

  async findAll(): Promise<Visit[]> {
    return this.db.getAll<Visit>(this.storeName);
  }

  async findByUserId(userId: string): Promise<Visit[]> {
    return this.db.getByIndex<Visit>(this.storeName, 'userId', userId);
  }

  async findUnsynced(): Promise<Visit[]> {
    const unsynced = await this.db.getByIndex<Visit>(this.storeName, 'synced', false);
    return unsynced;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(this.storeName, id);
  }

  async batchSave(visits: Visit[]): Promise<void> {
    for (const visit of visits) {
      await this.save(visit);
    }
  }

  /**
   * Clear all visits from local storage
   */
  async clearAll(): Promise<void> {
    await this.db.clear(this.storeName);
  }

  /**
   * Get visits with pagination and sorting
   */
  async getVisits(options: {
    limit?: number;
    offset?: number;
    orderBy?: 'arrival_time' | 'created_at';
    order?: 'asc' | 'desc';
  } = {}): Promise<Visit[]> {
    const allVisits = await this.findAll();

    // Sort visits
    const sortedVisits = allVisits.sort((a, b) => {
      const field = options.orderBy || 'arrival_time';
      const aValue = new Date(a[field]).getTime();
      const bValue = new Date(b[field]).getTime();

      if (options.order === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue; // desc is default
    });

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || sortedVisits.length;

    return sortedVisits.slice(offset, offset + limit);
  }
}
