/**
 * Modal dialog for generating and sharing visit links.
 * Allows users to:
 * - Generate shareable links
 * - Set optional expiration time (T182)
 * - Share via standard channels (messaging, social media) (T181)
 * - Copy link to clipboard
 *
 * Privacy: Only anonymized data is shared (venue name, approximate date)
 */

import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareService, ShareLinkResponse } from '../services/share.service';

export interface ShareModalConfig {
  visitId: string;
  venueName: string;
  visitDate: string; // For display purposes
}

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="modal"
      [class.modal-open]="isOpen()"
      role="dialog"
      aria-labelledby="share-modal-title"
      aria-modal="true"
    >
      <div class="modal-box bg-base-200 shadow-xl max-w-md">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 id="share-modal-title" class="text-lg font-bold text-base-content">
            Share Visit
          </h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            (click)="close()"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <!-- Visit Info -->
        @if (config) {
          <div class="mb-4 p-3 bg-base-300 rounded-lg">
            <p class="text-sm text-base-content/70 mb-1">Sharing visit to:</p>
            <p class="font-semibold text-base-content">{{ config.venueName }}</p>
            <p class="text-sm text-base-content/60">{{ config.visitDate }}</p>
          </div>
        }

        <!-- Privacy Notice -->
        <div class="alert alert-info mb-4 text-sm">
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
          <span>Only venue name and date are shared. No personal information or precise location.</span>
        </div>

        <!-- Loading State -->
        @if (isGenerating()) {
          <div class="flex flex-col items-center justify-center py-8">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="text-sm text-base-content/60 mt-4">Generating share link...</p>
          </div>
        }

        <!-- Share Link Generated -->
        @if (shareLink() && !isGenerating()) {
          <div class="space-y-4">
            <!-- Share URL Display -->
            <div>
              <label class="label">
                <span class="label-text font-medium">Share Link</span>
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [value]="shareLink()!.shareUrl"
                  readonly
                  class="input input-bordered flex-1 text-sm bg-base-100"
                  aria-label="Share URL"
                />
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="copyToClipboard()"
                  [disabled]="isCopying()"
                  aria-label="Copy link to clipboard"
                >
                  @if (isCopying()) {
                    <span class="loading loading-spinner loading-sm"></span>
                  } @else if (copySuccess()) {
                    <span>✓</span>
                  } @else {
                    <span>Copy</span>
                  }
                </button>
              </div>
              @if (copySuccess()) {
                <p class="text-sm text-success mt-1">Link copied to clipboard!</p>
              }
            </div>

            <!-- Expiration Info -->
            @if (shareLink()!.expiresAt) {
              <div class="alert alert-warning text-sm">
                <span>This link will expire on {{ formatExpiration(shareLink()!.expiresAt!) }}</span>
              </div>
            } @else {
              <div class="text-sm text-base-content/60">
                This link will never expire
              </div>
            }

            <!-- Share Actions -->
            <div class="flex gap-2">
              <button
                type="button"
                class="btn btn-secondary flex-1"
                (click)="shareViaWeb()"
                [disabled]="isSharing()"
              >
                @if (isSharing()) {
                  <span class="loading loading-spinner loading-sm"></span>
                } @else {
                  <span>Share</span>
                }
              </button>
              <button
                type="button"
                class="btn btn-ghost flex-1"
                (click)="close()"
              >
                Done
              </button>
            </div>
          </div>
        }

        <!-- Initial Form (T182: Expiration Time Selection) -->
        @if (!shareLink() && !isGenerating()) {
          <div class="space-y-4">
            <!-- Expiration Selection -->
            <div>
              <label class="label">
                <span class="label-text font-medium">Link Expiration</span>
              </label>
              <select
                [(ngModel)]="expirationDays"
                class="select select-bordered w-full"
                aria-label="Select link expiration time"
              >
                <option [ngValue]="null">Never expires</option>
                <option [ngValue]="1">1 day</option>
                <option [ngValue]="7">7 days</option>
                <option [ngValue]="30">30 days</option>
                <option [ngValue]="90">90 days</option>
              </select>
              <p class="text-sm text-base-content/60 mt-1">
                Choose how long the share link should remain active
              </p>
            </div>

            <!-- Generate Button -->
            <button
              type="button"
              class="btn btn-primary w-full"
              (click)="generateLink()"
              [disabled]="!config"
            >
              Generate Share Link
            </button>

            <!-- Cancel -->
            <button
              type="button"
              class="btn btn-ghost w-full"
              (click)="close()"
            >
              Cancel
            </button>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="alert alert-error mt-4">
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
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ error() }}</span>
          </div>
        }
      </div>

      <!-- Backdrop -->
      <div class="modal-backdrop" (click)="close()"></div>
    </div>
  `,
})
export class ShareModalComponent {
  private readonly shareService = inject(ShareService);

  @Input() config: ShareModalConfig | null = null;
  @Output() closed = new EventEmitter<void>();

  // State
  readonly isOpen = signal(false);
  readonly isGenerating = signal(false);
  readonly isCopying = signal(false);
  readonly isSharing = signal(false);
  readonly copySuccess = signal(false);
  readonly shareLink = signal<ShareLinkResponse | null>(null);
  readonly error = signal<string | null>(null);

  // Form state
  expirationDays: number | null = null;

  /**
   * Open the modal with visit configuration
   */
  open(config: ShareModalConfig): void {
    this.config = config;
    this.isOpen.set(true);
    this.reset();
  }

  /**
   * Close the modal and reset state
   */
  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
    // Delay reset to allow closing animation
    setTimeout(() => this.reset(), 300);
  }

  /**
   * Reset modal state
   */
  private reset(): void {
    this.isGenerating.set(false);
    this.isCopying.set(false);
    this.isSharing.set(false);
    this.copySuccess.set(false);
    this.shareLink.set(null);
    this.error.set(null);
    this.expirationDays = null;
  }

  /**
   * Generate share link
   */
  async generateLink(): Promise<void> {
    if (!this.config) return;

    this.isGenerating.set(true);
    this.error.set(null);

    try {
      const response = await this.shareService
        .generateShareLink(this.config.visitId, this.expirationDays)
        .toPromise();

      if (response) {
        this.shareLink.set(response);
      } else {
        throw new Error('Failed to generate share link');
      }
    } catch (err) {
      console.error('Error generating share link:', err);
      this.error.set('Failed to generate share link. Please try again.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Copy link to clipboard
   */
  async copyToClipboard(): Promise<void> {
    const link = this.shareLink();
    if (!link) return;

    this.isCopying.set(true);
    this.copySuccess.set(false);

    try {
      const success = await this.shareService.copyToClipboard(link.shareUrl);
      if (success) {
        this.copySuccess.set(true);
        // Reset success message after 3 seconds
        setTimeout(() => this.copySuccess.set(false), 3000);
      } else {
        throw new Error('Copy failed');
      }
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      this.error.set('Failed to copy link. Please try again.');
    } finally {
      this.isCopying.set(false);
    }
  }

  /**
   * Share via Web Share API or social channels
   */
  async shareViaWeb(): Promise<void> {
    const link = this.shareLink();
    if (!link || !this.config) return;

    this.isSharing.set(true);

    try {
      const success = await this.shareService.shareViaChannel(
        link.shareUrl,
        this.config.venueName
      );

      if (success) {
        // Close modal after successful share
        setTimeout(() => this.close(), 500);
      }
    } catch (err) {
      console.error('Error sharing:', err);
      this.error.set('Failed to share. Link has been copied to clipboard instead.');
      // Fallback to clipboard
      await this.copyToClipboard();
    } finally {
      this.isSharing.set(false);
    }
  }

  /**
   * Format expiration date for display
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
}
