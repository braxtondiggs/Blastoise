/**
 * Handles share link generation and sharing via standard channels.
 * Ensures privacy by only including venue name and approximate date.
 * NO GPS coordinates or user identity exposed.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ShareLinkRequest {
  visitId: string;
  expiresInDays?: number | null; // null = never expires
}

export interface ShareLinkResponse {
  shareId: string;
  shareUrl: string;
  expiresAt: string | null;
}

export interface SharedVisitData {
  shareId: string;
  venueName: string;
  venueCity: string;
  venueState: string;
  visitDate: string; // Approximate date only (YYYY-MM-DD)
  createdAt: string;
  expiresAt: string | null;
  viewCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1'; // Will be replaced with environment config

  /**
   * Generate a shareable link for a visit
   * Privacy: Only venue name and approximate date are shared
   */
  generateShareLink(
    visitId: string,
    expiresInDays: number | null = null
  ): Observable<ShareLinkResponse> {
    const request: ShareLinkRequest = {
      visitId,
      expiresInDays,
    };

    return this.http
      .post<{ success: boolean; data: ShareLinkResponse }>(
        `${this.apiUrl}/visits/${visitId}/share`,
        request
      )
      .pipe(map((response) => response.data));
  }

  /**
   * Get shared visit data (public endpoint, no auth required)
   */
  getSharedVisit(shareId: string): Observable<SharedVisitData> {
    return this.http
      .get<{ success: boolean; data: SharedVisitData }>(
        `${this.apiUrl}/shared/${shareId}`
      )
      .pipe(map((response) => response.data));
  }

  /**
   * Falls back to clipboard copy if Web Share API not available
   */
  async shareViaChannel(shareUrl: string, venueName: string): Promise<boolean> {
    const shareData = {
      title: `Visit to ${venueName}`,
      text: `Check out my visit to ${venueName}!`,
      url: shareUrl,
    };

    // Try Web Share API first (mobile-friendly)
    if (navigator.share && this.canUseWebShare()) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        // User cancelled or error occurred
        console.warn('Web Share failed:', error);
        return false;
      }
    }

    // Fallback to clipboard
    return this.copyToClipboard(shareUrl);
  }

  /**
   * Copy share URL to clipboard
   */
  async copyToClipboard(shareUrl: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Check if Web Share API is available and can be used
   * Web Share requires HTTPS and user interaction
   */
  private canUseWebShare(): boolean {
    return (
      'share' in navigator &&
      // Check if we're in a secure context
      (window.isSecureContext || window.location.hostname === 'localhost')
    );
  }

  /**
   * Validate that shared data contains NO sensitive information
   * This is a client-side check, but the real privacy protection happens on backend
   */
  validateSharedData(data: SharedVisitData): boolean {
    // Ensure no user_id or precise coordinates
    const dataString = JSON.stringify(data);

    // Check for patterns that might indicate leaked user data
    const sensitivePatterns = [
      /user_id/i,
      /user\.id/i,
      /latitude/i,
      /longitude/i,
      /coordinates/i,
      /location\.lat/i,
      /location\.lng/i,
      /@[\w.]+/i, // Email patterns
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(dataString)) {
        console.error('Shared data contains sensitive information!', pattern);
        return false;
      }
    }

    // Verify required anonymized fields are present
    const hasRequiredFields = !!(
      data.venueName &&
      data.venueCity &&
      data.visitDate &&
      data.shareId
    );

    return hasRequiredFields;
  }

  /**
   * Build full share URL from base URL and share ID
   */
  buildShareUrl(shareId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${shareId}`;
  }
}
