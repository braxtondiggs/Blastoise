/**
 * Handles API calls for Google Timeline import
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getSupabaseClient } from '@blastoise/data';

export interface ImportSummary {
  success: boolean;
  total_places: number;
  visits_created: number;
  visits_skipped: number;
  new_venues_created: number;
  existing_venues_matched: number;
  processing_time_ms: number;
  job_id?: string;
  errors: ImportError[];
  tier_statistics?: {
    tier1_matches: number;
    tier2_matches: number;
    tier3_matches: number;
    unverified: number;
  };
}

export interface AsyncImportResponse {
  job_id: string;
}

export interface JobStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: {
    processed: number;
    total: number;
    percentage: number;
    message: string;
  };
  result?: ImportSummary;
  error?: string;
}

export interface ImportError {
  place_name: string;
  address?: string;
  timestamp: string;
  error: string;
  error_code?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImportService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl || 'http://localhost:3000/api/v1';

  /**
   * Upload Google Timeline JSON data
   * POST /api/v1/import/google-timeline
   *
   * Returns either:
   * - ImportSummary (small files processed synchronously)
   * - AsyncImportResponse (large files queued for async processing)
   */
  uploadTimeline(
    timelineData: string,
    fileName?: string
  ): Observable<ImportSummary | AsyncImportResponse> {
    const url = `${this.apiBaseUrl}/import/google-timeline`;

    const body = {
      timeline_data: timelineData,
      file_name: fileName,
    };

    // Get auth token and make request
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.post<ImportSummary | AsyncImportResponse>(url, body, { headers })
      ),
      map((response) => {
        // If it's an async response, return as-is
        if ('job_id' in response && !('success' in response)) {
          return response as AsyncImportResponse;
        }

        // If it's a sync response, ensure errors array exists
        const summary = response as ImportSummary;
        if (!summary.errors) {
          summary.errors = [];
        }
        return summary;
      }),
      catchError((error) => {
        console.error('Import upload failed:', error);
        return throwError(() => new Error(this.extractErrorMessage(error)));
      })
    );
  }

  /**
   * Poll job status for async imports
   * GET /api/v1/import/status/:jobId
   */
  getJobStatus(jobId: string): Observable<JobStatus> {
    const url = `${this.apiBaseUrl}/import/status/${jobId}`;

    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) => this.http.get<JobStatus>(url, { headers })),
      catchError((error) => {
        console.error('Failed to fetch job status:', error);
        return throwError(() => new Error(this.extractErrorMessage(error)));
      })
    );
  }

  /**
   * Get auth headers with Supabase session token
   */
  private async getAuthHeaders(): Promise<HttpHeaders> {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (session?.access_token) {
      return headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    return headers;
  }

  /**
   * Helper: Extract error message from HTTP error response
   */
  private extractErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred during import';
  }
}
