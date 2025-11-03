/**
 * T177, T181-T182: Share Modal Component
 *
 * Modal for generating and sharing visit links with:
 * - Share link generation
 * - Optional expiration time selection
 * - Share via standard channels (Web Share API, clipboard)
 * - Copy link functionality
 */

import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Visit, Venue } from '@blastoise/shared';
import { ShareService, type ShareLinkResponse } from '../services/share.service';

@Component({
  selector: 'app-share-modal',
  imports: [CommonModule, FormsModule],
  template: `
    <dialog class="modal" [class.modal-open]="isOpen">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Share Visit</h3>

        <!-- Venue Info -->
        @if (venue) {
          <div class="mb-6">
            <p class="text-sm text-gray-600">Sharing your visit to:</p>
            <p class="font-semibold text-lg">{{ venue.name }}</p>
            @if (venue.city || venue.state) {
              <p class="text-sm text-gray-500">{{ venue.city }}@if (venue.city && venue.state) {, }{{ venue.state }}</p>
            }
          </div>
        }

        <!-- Privacy Notice -->
        <div class="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm">Only venue name, city, and date will be shared. No GPS coordinates or personal information.</span>
        </div>

        @if (!shareLink()) {
          <!-- T182: Expiration Time Selection -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Link expiration</span>
            </label>
            <select class="select select-bordered" [(ngModel)]="expirationHours">
              <option [ngValue]="null">Never expires</option>
              <option [ngValue]="24">24 hours</option>
              <option [ngValue]="48">48 hours</option>
              <option [ngValue]="72">72 hours</option>
              <option [ngValue]="168">1 week</option>
            </select>
          </div>

          <!-- Generate Link Button -->
          <button
            class="btn btn-primary w-full mb-4"
            (click)="generateLink()"
            [disabled]="isGenerating()"
          >
            @if (isGenerating()) {
              <span class="loading loading-spinner"></span>
              Generating...
            } @else {
              Generate Share Link
            }
          </button>
        }

        @if (shareLink()) {
          <!-- Share Link Display -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Share link</span>
            </label>
            <div class="join w-full">
              <input
                type="text"
                [value]="shareLink()!.share_url"
                readonly
                class="input input-bordered join-item flex-1"
              />
              <button class="btn btn-outline join-item" (click)="copyToClipboard()">
                @if (isCopied()) {
                  ✓ Copied
                } @else {
                  Copy
                }
              </button>
            </div>
            @if (shareLink()!.expires_at) {
              <label class="label">
                <span class="label-text-alt text-gray-500">
                  Expires: {{ formatExpiration(shareLink()!.expires_at!) }}
                </span>
              </label>
            }
          </div>

          <!-- T181: Share via Standard Channels -->
          <button
            class="btn btn-secondary w-full mb-4"
            (click)="shareViaChannels()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share via...
          </button>
        }

        @if (errorMessage()) {
          <div class="alert alert-error mb-4">
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Close Button -->
        <div class="modal-action">
          <button class="btn" (click)="close()">Close</button>
        </div>
      </div>

      <!-- Modal backdrop -->
      <form method="dialog" class="modal-backdrop">
        <button (click)="close()">close</button>
      </form>
    </dialog>
  `,
  standalone: true,
})
export class ShareModal {
  private readonly shareService = inject(ShareService);

  @Input() isOpen = false;
  @Input() visit: Visit | null = null;
  @Input() venue: Venue | null = null;

  @Output() closed = new EventEmitter<void>();

  readonly shareLink = signal<ShareLinkResponse | null>(null);
  readonly isGenerating = signal(false);
  readonly isCopied = signal(false);
  readonly errorMessage = signal<string | null>(null);

  expirationHours: number | null = 72; // Default: 3 days

  /**
   * T180: Generate share link
   */
  generateLink(): void {
    if (!this.visit) {
      this.errorMessage.set('No visit selected');
      return;
    }

    this.isGenerating.set(true);
    this.errorMessage.set(null);

    this.shareService
      .createShareLink({
        visit_id: this.visit.id,
        expiration_hours: this.expirationHours ?? undefined,
      })
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.shareLink.set(response.data);
          } else {
            this.errorMessage.set('Failed to generate share link');
          }
          this.isGenerating.set(false);
        },
        error: (error) => {
          console.error('Failed to generate share link:', error);
          this.errorMessage.set('Failed to generate share link. Please try again.');
          this.isGenerating.set(false);
        },
      });
  }

  /**
   * Copy share link to clipboard
   */
  async copyToClipboard(): Promise<void> {
    const link = this.shareLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link.share_url);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.errorMessage.set('Failed to copy link');
    }
  }

  /**
   * T181: Share via standard channels (Web Share API)
   */
  async shareViaChannels(): Promise<void> {
    const link = this.shareLink();
    const venue = this.venue;

    if (!link || !venue) return;

    const success = await this.shareService.shareViaStandardChannels(
      link.share_url,
      venue.name
    );

    if (success) {
      // Share or copy was successful
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    } else {
      this.errorMessage.set('Failed to share link');
    }
  }

  /**
   * Format expiration date
   */
  formatExpiration(expiresAt: string): string {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Less than 1 hour';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Close modal and reset state
   */
  close(): void {
    this.isOpen = false;
    this.shareLink.set(null);
    this.errorMessage.set(null);
    this.isCopied.set(false);
    this.expirationHours = 72; // Reset to default
    this.closed.emit();
  }
}
