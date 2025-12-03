import { Injectable, Inject, Optional } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, API_BASE_URL } from '@blastoise/shared';

@Injectable({
  providedIn: 'root'
})
export class ApiClient {
  private readonly baseUrl: string;

  constructor(
    private http: HttpClient,
    @Optional() @Inject(API_BASE_URL) apiBaseUrl?: string
  ) {
    this.baseUrl = apiBaseUrl || 'http://localhost:3000/api/v1';
  }

  get<T>(endpoint: string, options?: { headers?: HttpHeaders }): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, options);
  }

  post<T>(
    endpoint: string,
    body: unknown,
    options?: { headers?: HttpHeaders }
  ): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body, options);
  }

  patch<T>(
    endpoint: string,
    body: unknown,
    options?: { headers?: HttpHeaders }
  ): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body, options);
  }

  delete<T>(endpoint: string, options?: { headers?: HttpHeaders }): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, options);
  }
}
