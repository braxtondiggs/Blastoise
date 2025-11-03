import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api.client';
import { SharedVisit, CreateSharedVisitDto, ApiResponse } from '@blastoise/shared';

@Injectable({
  providedIn: 'root'
})
export class SharingApiService {
  constructor(private apiClient: ApiClient) {}

  createShare(visitId: string, dto: CreateSharedVisitDto): Observable<ApiResponse<SharedVisit>> {
    return this.apiClient.post<SharedVisit>(`/visits/${visitId}/share`, dto);
  }

  getShared(shareId: string): Observable<ApiResponse<SharedVisit>> {
    return this.apiClient.get<SharedVisit>(`/shared/${shareId}`);
  }
}
