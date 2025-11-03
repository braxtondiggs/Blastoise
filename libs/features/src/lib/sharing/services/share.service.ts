/**
 * T179-T183: Share Service
 *
 * Handles generation and management of anonymized share links:
 * - Generate share links for visits
 * - Ensure no GPS coordinates or user info in shared data
 * - Support optional expiration times
 * - Integration with native share APIs
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ApiResponse } from '@blastoise/shared';

/**
 * Anonymized visit data for sharing (T183)
 * PRIVACY: Contains only venue name, city, and approximate date
 * NO GPS coordinates, NO user_id, NO precise timestamps
 */
export interface AnonymizedVisit {
  venue_name: string;
  venue_city: string;
  venue_state: string;
  venue_type: 'brewery' | 'winery';
  visit_date: string; // Date only (YYYY-MM-DD), no time
  duration_hours: number; // Rounded to nearest hour
  share_id: string;
  created_at: string;
  expires_at?: string;
  view_count: number;
}

/**
 * Share link creation request
 */
export interface CreateShareRequest {
  visit_id: string;
  expiration_hours?: number; // Optional: 24, 48, 72, or null (never expires)
}

/**
 * Share link response
 */
export interface ShareLinkResponse {
  share_id: string;
  share_url: string;
  expires_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = '/api/v1'; // TODO: Get from environment

  /**
   * T180: Generate share link for a visit
   */
  createShareLink(request: CreateShareRequest): Observable<ApiResponse<ShareLinkResponse>> {
    return this.http.post<ApiResponse<ShareLinkResponse>>(
      `${this.apiBaseUrl}/visits/${request.visit_id}/share`,
      { expiration_hours: request.expiration_hours }
    );
  }

  /**
   * Get anonymized visit data by share ID (public, no auth)
   */
  getSharedVisit(shareId: string): Observable<ApiResponse<AnonymizedVisit>> {
    return this.http.get<ApiResponse<AnonymizedVisit>>(
      `${this.apiBaseUrl}/shared/${shareId}`
    );
  }

  /**
   * T181: Share via standard channels (Web Share API)
   * Falls back to clipboard if Web Share API not available
   */
  async shareViaStandardChannels(shareUrl: string, venueName: string): Promise<boolean> {
    const shareData = {
      title: `Visit to ${venueName}`,
      text: `Check out my visit to ${venueName}!`,
      url: shareUrl,
    };

    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
        return false;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * T183: Verify no user-identifying information in shared data
   * Returns validation errors if any sensitive data is present
   */
  validateAnonymizedData(data: any): string[] {
    const errors: string[] = [];

    // Check for GPS coordinates
    if (data.latitude || data.longitude || data.location) {
      errors.push('GPS coordinates must not be included in shared data');
    }

    // Check for user ID
    if (data.user_id || data.userId) {
      errors.push('User ID must not be included in shared data');
    }

    // Check for precise timestamps (must be date only)
    if (data.arrival_time || data.departure_time) {
      const hasTime = /T\d{2}:\d{2}/.test(data.arrival_time || data.departure_time || '');
      if (hasTime) {
        errors.push('Precise timestamps must not be included (use date only)');
      }
    }

    // Check for email or phone
    if (data.email || data.phone) {
      errors.push('Contact information must not be included');
    }

    return errors;
  }

  /**
   * T180: Generate full share URL
   */
  generateShareUrl(shareId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${shareId}`;
  }

  /**
   * Delete a share link (revoke access)
   */
  deleteShareLink(shareId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiBaseUrl}/shared/${shareId}`
    );
  }

  /**
   * Get all share links for current user
   */
  getUserShares(): Observable<ApiResponse<ShareLinkResponse[]>> {
    return this.http.get<ApiResponse<ShareLinkResponse[]>>(
      `${this.apiBaseUrl}/user/shares`
    );
  }
}
