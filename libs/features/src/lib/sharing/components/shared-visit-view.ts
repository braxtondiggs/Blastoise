/**
 * T178: Shared Visit View Component (Public)
 *
 * Public view for shared visits accessible without authentication.
 * Displays only anonymized data: venue name, city, date (no GPS, no user info)
 */

import { Component, OnInit, signal, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ShareService, type AnonymizedVisit } from '../services/share.service';

@Component({
  selector: 'app-shared-visit-view',
  imports: [CommonModule],
  template: `
    <div class="shared-visit-container min-h-screen bg-base-200 py-12">
      <div class="max-w-2xl mx-auto px-4">
        @if (isLoading()) {
          <!-- Loading State -->
          <div class="flex flex-col items-center justify-center py-16">
            <span class="loading loading-spinner loading-lg"></span>
            <p class="mt-4 text-gray-600">Loading shared visit...</p>
          </div>
        }

        @if (errorMessage()) {
          <!-- Error State -->
          <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 class="font-bold">{{ errorTitle() }}</h3>
              <div class="text-xs">{{ errorMessage() }}</div>
            </div>
          </div>
        }

        @if (visit()) {
          <!-- Visit Content -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <!-- Header -->
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h2 class="card-title text-2xl mb-2">{{ visit()!.venue_name }}</h2>
                  <p class="text-gray-600">
                    {{ visit()!.venue_city }}, {{ visit()!.venue_state }}
                  </p>
                </div>
                <div class="badge badge-primary">
                  {{ visit()!.venue_type }}
                </div>
              </div>

              <div class="divider"></div>

              <!-- Visit Details -->
              <div class="space-y-4">
                <!-- Visit Date -->
                <div class="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p class="text-sm text-gray-500">Visit Date</p>
                    <p class="font-semibold">{{ formatDate(visit()!.visit_date) }}</p>
                  </div>
                </div>

                <!-- Duration -->
                <div class="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p class="text-sm text-gray-500">Duration</p>
                    <p class="font-semibold">{{ formatDuration(visit()!.duration_hours) }}</p>
                  </div>
                </div>

                <!-- View Count (optional) -->
                @if (visit()!.view_count > 1) {
                  <div class="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <div>
                      <p class="text-sm text-gray-500">Views</p>
                      <p class="font-semibold">{{ visit()!.view_count }}</p>
                    </div>
                  </div>
                }
              </div>

              <div class="divider"></div>

              <!-- Privacy Notice -->
              <div class="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span class="text-sm">
                  This visit was shared anonymously. No personal information or precise location data is included.
                </span>
              </div>

              <!-- Call to Action -->
              <div class="card-actions justify-center mt-6">
                <a href="/" class="btn btn-primary">
                  Track Your Own Visits
                </a>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center mt-8 text-gray-500 text-sm">
            <p>Powered by Blastoise - Privacy-First Visit Tracking</p>
          </div>
        }
      </div>
    </div>
  `,
  standalone: true,
})
export class SharedVisitView implements OnInit {
  private readonly shareService = inject(ShareService);
  private readonly route = inject(ActivatedRoute);

  readonly shareId = input<string>();
  readonly visit = signal<AnonymizedVisit | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly errorTitle = signal<string>('Error');

  ngOnInit(): void {
    const shareId = this.shareId() || this.route.snapshot.paramMap.get('shareId');

    if (!shareId) {
      this.showError('Invalid Link', 'The share link is invalid or malformed.');
      return;
    }

    this.loadSharedVisit(shareId);
  }

  private loadSharedVisit(shareId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.shareService.getSharedVisit(shareId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.visit.set(response.data);
        } else {
          this.showError('Not Found', 'This shared visit could not be found.');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load shared visit:', error);

        if (error.status === 404) {
          this.showError('Not Found', 'This shared visit does not exist or has been deleted.');
        } else if (error.status === 410) {
          this.showError('Expired', 'This share link has expired.');
        } else {
          this.showError('Error', 'Failed to load shared visit. Please try again later.');
        }

        this.isLoading.set(false);
      },
    });
  }

  private showError(title: string, message: string): void {
    this.errorTitle.set(title);
    this.errorMessage.set(message);
    this.isLoading.set(false);
  }

  /**
   * Format date for display (e.g., "January 15, 2025")
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format duration (e.g., "2 hours", "30 minutes")
   */
  formatDuration(hours: number): string {
    if (hours >= 1) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);

      if (minutes === 0) {
        return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
      }

      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} min`;
    } else {
      const minutes = Math.round(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }
}
