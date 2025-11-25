/**
 * Public view for shared visits (no authentication required).
 * Displays only anonymized information:
 * - Venue name
 * - City/state
 * - Approximate date (date only, no precise time)
 * - View count
 *
 * Privacy: NO user identity, GPS coordinates, or precise timestamps.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService, SharedVisitData } from '../services/share.service';

@Component({
  selector: 'app-shared-visit-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div class="max-w-2xl w-full">
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="card bg-base-200 shadow-xl">
            <div class="card-body items-center">
              <span class="loading loading-spinner loading-lg text-primary"></span>
              <p class="text-base-content/60 mt-4">Loading shared visit...</p>
            </div>
          </div>
        }

        <!-- Visit Content -->
        @if (visit() && !isLoading()) {
          <div class="card bg-base-200 shadow-xl">
            <!-- Header -->
            <div class="card-body">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <div class="badge badge-primary mb-2">Shared Visit</div>
                  <h1 class="text-3xl font-bold text-base-content">
                    {{ visit()!.venueName }}
                  </h1>
                  <p class="text-lg text-base-content/70 mt-2">
                    {{ visit()!.venueCity }}, {{ visit()!.venueState }}
                  </p>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  (click)="goHome()"
                  aria-label="Go to homepage"
                >
                  ✕
                </button>
              </div>

              <!-- Visit Details -->
              <div class="divider"></div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Visit Date -->
                <div class="space-y-2">
                  <div class="text-sm text-base-content/60 font-medium">Visit Date</div>
                  <div class="text-xl font-semibold text-base-content">
                    {{ formatVisitDate(visit()!.visitDate) }}
                  </div>
                </div>

                <!-- View Count -->
                <div class="space-y-2">
                  <div class="text-sm text-base-content/60 font-medium">Views</div>
                  <div class="text-xl font-semibold text-base-content">
                    {{ visit()!.viewCount }}
                  </div>
                </div>
              </div>

              <!-- Privacy Notice -->
              <div class="alert alert-info mt-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  class="stroke-current shrink-0 w-5 h-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div class="text-sm">
                  <p class="font-semibold mb-1">Privacy Notice</p>
                  <p>This is an anonymized visit share. No personal information, precise location data, or exact timestamps are included.</p>
                </div>
              </div>

              <!-- Expiration Notice -->
              @if (visit()!.expiresAt) {
                <div class="alert alert-warning mt-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div class="text-sm">
                    <p>This share link will expire on {{ formatExpiration(visit()!.expiresAt!) }}</p>
                  </div>
                </div>
              }

              <!-- Actions -->
              <div class="card-actions justify-end mt-6">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="goHome()"
                >
                  Visit Blastoise
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Error State -->
        @if (error() && !isLoading()) {
          <div class="card bg-base-200 shadow-xl">
            <div class="card-body items-center text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-20 w-20 text-error mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 class="card-title text-error">{{ error() }}</h2>
              <p class="text-base-content/60 mt-2">
                {{ getErrorDescription() }}
              </p>
              <div class="card-actions justify-center mt-6">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="goHome()"
                >
                  Go to Homepage
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Footer -->
        <div class="text-center mt-6 text-sm text-base-content/60">
          <p>Powered by Blastoise - Privacy-First Visit Tracking</p>
        </div>
      </div>
    </div>
  `,
})
export class SharedVisitViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shareService = inject(ShareService);

  // State
  readonly isLoading = signal(true);
  readonly visit = signal<SharedVisitData | null>(null);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Get share ID from route params
    const shareId = this.route.snapshot.paramMap.get('shareId');

    if (!shareId) {
      this.error.set('Invalid Share Link');
      this.isLoading.set(false);
      return;
    }

    await this.loadSharedVisit(shareId);
  }

  /**
   * Load shared visit data from API
   */
  private async loadSharedVisit(shareId: string): Promise<void> {
    try {
      const data = await this.shareService.getSharedVisit(shareId).toPromise();

      if (!data) {
        throw new Error('Visit not found');
      }

      // Validate that shared data contains NO sensitive information
      const isValid = this.shareService.validateSharedData(data);
      if (!isValid) {
        console.error('Shared data validation failed - sensitive info detected!');
        throw new Error('Invalid shared data');
      }

      this.visit.set(data);
    } catch (err: any) {
      console.error('Error loading shared visit:', err);

      // Handle specific error cases
      if (err.status === 404) {
        this.error.set('Visit Not Found');
      } else if (err.status === 410) {
        this.error.set('Share Link Expired');
      } else {
        this.error.set('Failed to Load Visit');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Format visit date for display
   */
  formatVisitDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Format expiration date
   */
  formatExpiration(expiresAt: string): string {
    try {
      const date = new Date(expiresAt);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return expiresAt;
    }
  }

  /**
   * Get user-friendly error description
   */
  getErrorDescription(): string {
    const errorType = this.error();

    switch (errorType) {
      case 'Visit Not Found':
        return 'This visit does not exist or the link is invalid.';
      case 'Share Link Expired':
        return 'This share link has expired and is no longer available.';
      case 'Invalid Share Link':
        return 'The share link format is invalid.';
      default:
        return 'Please check the link and try again.';
    }
  }

  /**
   * Navigate to homepage
   */
  goHome(): void {
    this.router.navigate(['/']);
  }
}
