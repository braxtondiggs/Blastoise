import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api.client';
import { Visit, CreateVisitDto, UpdateVisitDto, BatchVisitSyncDto, ApiResponse } from '@blastoise/shared';

@Injectable({
  providedIn: 'root'
})
export class VisitsApiService {
  constructor(private apiClient: ApiClient) {}

  create(visit: CreateVisitDto): Observable<ApiResponse<Visit>> {
    return this.apiClient.post<Visit>('/visits', visit);
  }

  getAll(page = 1, limit = 50): Observable<ApiResponse<Visit[]>> {
    return this.apiClient.get<Visit[]>(`/visits?page=${page}&limit=${limit}`);
  }

  getById(visitId: string): Observable<ApiResponse<Visit>> {
    return this.apiClient.get<Visit>(`/visits/${visitId}`);
  }

  getByVenueId(venueId: string): Observable<ApiResponse<Visit[]>> {
    return this.apiClient.get<Visit[]>(`/visits?venue_id=${venueId}`);
  }

  update(visitId: string, updates: Partial<UpdateVisitDto>): Observable<ApiResponse<Visit>> {
    return this.apiClient.patch<Visit>(`/visits/${visitId}`, updates);
  }

  delete(visitId: string): Observable<ApiResponse<void>> {
    return this.apiClient.delete<void>(`/visits/${visitId}`);
  }

  batchSync(batch: BatchVisitSyncDto): Observable<ApiResponse<Visit[]>> {
    return this.apiClient.post<Visit[]>('/visits/batch', batch);
  }
}
