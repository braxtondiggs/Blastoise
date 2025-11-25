/**
 * ImportHistoryService
 * Handles API calls for import history
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImportHistoryResponse {
  imports: any[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class ImportHistoryService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl || 'http://localhost:3000/api/v1';

  /**
   * Get import history for authenticated user
   * GET /api/v1/import/history
   */
  async getImportHistory(limit = 50, offset = 0): Promise<ImportHistoryResponse> {
    const url = `${this.apiBaseUrl}/import/history?limit=${limit}&offset=${offset}`;

    try {
      return await firstValueFrom(this.http.get<ImportHistoryResponse>(url));
    } catch (error) {
      console.error('Failed to fetch import history:', error);
      throw new Error('Failed to fetch import history');
    }
  }
}
