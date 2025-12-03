/**
 * Displays list of past imports with timestamps, visit counts, and processing times
 */

import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowLeft,
  heroCalendar,
  heroClock,
  heroDocumentText,
  heroCheckCircle,
  heroXCircle,
  heroChevronRight,
} from '@ng-icons/heroicons/outline';
import { ImportHistoryService } from './import-history.service';

interface ImportHistoryItem {
  id: string;
  source: string;
  imported_at: string;
  file_name?: string;
  total_places: number;
  visits_created: number;
  visits_skipped: number;
  new_venues_created: number;
  existing_venues_matched?: number;
  processing_time_ms?: number;
  metadata?: {
    errors?: Array<{
      place_name: string;
      address?: string;
      timestamp: string;
      error: string;
    }>;
    tier_statistics?: {
      tier1_matches: number;
      tier2_matches: number;
      tier3_matches: number;
      unverified: number;
    };
  };
}

@Component({
  selector: 'app-import-history',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [
    provideIcons({
      heroArrowLeft,
      heroCalendar,
      heroClock,
      heroDocumentText,
      heroCheckCircle,
      heroXCircle,
      heroChevronRight,
    }),
  ],
  template: `
    <div class="min-h-screen bg-base-100">
      <div class="container mx-auto px-4 max-w-4xl py-6">
        <!-- Header -->
        <div class="mb-8">
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-base-content/60 hover:text-primary transition-colors mb-4"
            (click)="goBack()"
          >
            <ng-icon name="heroArrowLeft" size="16" />
            Back to Settings
          </button>
          <h1 class="text-2xl font-bold text-base-content">Import History</h1>
          <p class="text-base-content/50 mt-1">View your past Google Timeline imports</p>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && imports().length === 0) {
          <div class="rounded-2xl bg-base-200/50 border border-base-300/50 p-8 text-center">
            <div class="flex items-center justify-center w-16 h-16 mx-auto rounded-xl bg-base-300/50 mb-4">
              <ng-icon name="heroDocumentText" size="32" class="text-base-content/40" />
            </div>
            <h3 class="text-lg font-semibold mb-2">No Import History</h3>
            <p class="text-sm text-base-content/60 mb-6">
              You haven't imported any Timeline data yet.
            </p>
            <button class="btn btn-primary" (click)="startNewImport()">
              Import Timeline Data
            </button>
          </div>
        }

        <!-- Import List -->
        @if (!isLoading() && imports().length > 0) {
          <div class="space-y-4">
            @for (import of imports(); track import.id) {
              <button
                type="button"
                class="w-full text-left rounded-xl bg-base-100/80 border border-base-300/50 p-5 hover:border-primary/30 hover:bg-base-100 transition-all cursor-pointer"
                (click)="viewDetails(import)"
              >
                <div class="flex items-start justify-between">
                  <!-- Left: Import Info -->
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <ng-icon name="heroDocumentText" size="18" class="text-primary" />
                      </div>
                      <h3 class="font-semibold">
                        {{ import.file_name || 'Google Timeline Import' }}
                      </h3>
                      <!-- Success/Error Badge -->
                      @if (hasErrors(import)) {
                        <div class="badge badge-warning badge-sm gap-1">
                          <ng-icon name="heroXCircle" size="12" />
                          {{ import.metadata!.errors!.length }} errors
                        </div>
                      } @else {
                        <div class="badge badge-success badge-sm gap-1">
                          <ng-icon name="heroCheckCircle" size="12" />
                          Success
                        </div>
                      }
                    </div>

                    <!-- Date and Time -->
                    <div class="flex items-center gap-4 text-xs text-base-content/60 mb-4 ml-10">
                      <div class="flex items-center gap-1">
                        <ng-icon name="heroCalendar" size="14" />
                        <span>{{ formatDate(import.imported_at) }}</span>
                      </div>
                      @if (import.processing_time_ms) {
                        <div class="flex items-center gap-1">
                          <ng-icon name="heroClock" size="14" />
                          <span>{{ formatProcessingTime(import.processing_time_ms) }}</span>
                        </div>
                      }
                    </div>

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-4 gap-3 ml-10">
                      <div class="rounded-lg bg-base-200/50 p-3">
                        <div class="text-xs text-base-content/50 mb-1">Places</div>
                        <div class="text-xl font-bold">{{ import.total_places }}</div>
                      </div>
                      <div class="rounded-lg bg-base-200/50 p-3">
                        <div class="text-xs text-base-content/50 mb-1">Created</div>
                        <div class="text-xl font-bold text-success">{{ import.visits_created }}</div>
                      </div>
                      <div class="rounded-lg bg-base-200/50 p-3">
                        <div class="text-xs text-base-content/50 mb-1">Skipped</div>
                        <div class="text-xl font-bold text-warning">{{ import.visits_skipped }}</div>
                      </div>
                      <div class="rounded-lg bg-base-200/50 p-3">
                        <div class="text-xs text-base-content/50 mb-1">New</div>
                        <div class="text-xl font-bold">{{ import.new_venues_created }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Right: View Details Arrow -->
                  <div class="ml-4 flex items-center h-full">
                    <ng-icon name="heroChevronRight" size="20" class="text-base-content/30" />
                  </div>
                </div>
              </button>
            }

            <!-- Pagination -->
            @if (totalCount() > pageSize) {
              <div class="flex items-center justify-center gap-3 mt-8">
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  [disabled]="currentPage() === 0"
                  (click)="previousPage()"
                >
                  Previous
                </button>
                <span class="text-sm text-base-content/60">
                  Page {{ currentPage() + 1 }} of {{ totalPages() }}
                </span>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  [disabled]="currentPage() >= totalPages() - 1"
                  (click)="nextPage()"
                >
                  Next
                </button>
              </div>
            }
          </div>
        }

        <!-- Detail Modal -->
        @if (selectedImport()) {
          <div class="modal modal-open">
            <div class="modal-box max-w-2xl rounded-2xl">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold">Import Details</h3>
                <button type="button" class="btn btn-sm btn-ghost btn-circle" (click)="closeDetails()">✕</button>
              </div>

              <!-- Basic Info -->
              <div class="rounded-xl bg-base-200/50 p-4 mb-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs text-base-content/50 mb-1">File</div>
                    <div class="font-medium text-sm">{{ selectedImport()!.file_name || 'Google Timeline Import' }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-base-content/50 mb-1">Imported</div>
                    <div class="font-medium text-sm">{{ formatDate(selectedImport()!.imported_at) }}</div>
                  </div>
                  @if (selectedImport()!.processing_time_ms !== undefined) {
                    <div>
                      <div class="text-xs text-base-content/50 mb-1">Processing Time</div>
                      <div class="font-medium text-sm">{{ formatProcessingTime(selectedImport()!.processing_time_ms!) }}</div>
                    </div>
                  }
                </div>
              </div>

              <!-- Statistics -->
              <div class="mb-4">
                <h4 class="text-sm font-semibold text-base-content/70 mb-3">Statistics</h4>
                <div class="grid grid-cols-3 gap-3">
                  <div class="rounded-xl bg-primary/10 p-4 text-center">
                    <div class="text-2xl font-bold text-primary">{{ selectedImport()!.total_places }}</div>
                    <div class="text-xs text-base-content/60">Total Places</div>
                  </div>
                  <div class="rounded-xl bg-success/10 p-4 text-center">
                    <div class="text-2xl font-bold text-success">{{ selectedImport()!.visits_created }}</div>
                    <div class="text-xs text-base-content/60">Created</div>
                  </div>
                  <div class="rounded-xl bg-warning/10 p-4 text-center">
                    <div class="text-2xl font-bold text-warning">{{ selectedImport()!.visits_skipped }}</div>
                    <div class="text-xs text-base-content/60">Skipped</div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="rounded-xl bg-base-200/50 p-4 text-center">
                  <div class="text-xl font-bold">{{ selectedImport()!.new_venues_created }}</div>
                  <div class="text-xs text-base-content/60">New Venues</div>
                </div>
                @if (selectedImport()!.existing_venues_matched !== undefined) {
                  <div class="rounded-xl bg-base-200/50 p-4 text-center">
                    <div class="text-xl font-bold">{{ selectedImport()!.existing_venues_matched }}</div>
                    <div class="text-xs text-base-content/60">Matched Venues</div>
                  </div>
                }
              </div>

              <!-- Tier Statistics -->
              @if (selectedImport()!.metadata?.tier_statistics) {
                <div class="mb-4">
                  <h4 class="text-sm font-semibold text-base-content/70 mb-3">Verification Breakdown</h4>
                  <div class="flex gap-2 flex-wrap">
                    <div class="badge badge-primary">
                      Tier 1: {{ selectedImport()!.metadata!.tier_statistics!.tier1_matches }}
                    </div>
                    <div class="badge badge-secondary">
                      Tier 2: {{ selectedImport()!.metadata!.tier_statistics!.tier2_matches }}
                    </div>
                    <div class="badge badge-accent">
                      Tier 3: {{ selectedImport()!.metadata!.tier_statistics!.tier3_matches }}
                    </div>
                    <div class="badge badge-ghost">
                      Unverified: {{ selectedImport()!.metadata!.tier_statistics!.unverified }}
                    </div>
                  </div>
                </div>
              }

              <!-- Errors -->
              @if (selectedImport()!.metadata?.errors && selectedImport()!.metadata!.errors!.length > 0) {
                <div>
                  <h4 class="text-sm font-semibold text-base-content/70 mb-3">Errors</h4>
                  <div class="rounded-xl bg-warning/10 border border-warning/20 p-3 mb-3">
                    <div class="flex items-center gap-2 text-sm text-warning">
                      <ng-icon name="heroXCircle" size="18" />
                      <span>{{ selectedImport()!.metadata!.errors!.length }} places failed to import</span>
                    </div>
                  </div>
                  <div class="max-h-48 overflow-y-auto space-y-2">
                    @for (error of selectedImport()!.metadata!.errors!.slice(0, 10); track error.timestamp) {
                      <div class="rounded-lg bg-base-200/50 p-3">
                        <div class="font-medium text-sm">{{ error.place_name }}</div>
                        @if (error.address) {
                          <div class="text-xs text-base-content/60">{{ error.address }}</div>
                        }
                        <div class="text-xs text-error mt-1">{{ error.error }}</div>
                      </div>
                    }
                    @if (selectedImport()!.metadata!.errors!.length > 10) {
                      <div class="text-xs text-base-content/50 text-center py-2">
                        ...and {{ selectedImport()!.metadata!.errors!.length - 10 }} more
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Modal Actions -->
              <div class="modal-action mt-6">
                <button type="button" class="btn btn-primary" (click)="closeDetails()">Close</button>
              </div>
            </div>
            <div class="modal-backdrop" (click)="closeDetails()"></div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ImportHistoryComponent implements OnInit {
  private readonly importHistoryService = inject(ImportHistoryService);
  private readonly router = inject(Router);

  // State
  imports = signal<ImportHistoryItem[]>([]);
  selectedImport = signal<ImportHistoryItem | null>(null);
  isLoading = signal(true);
  totalCount = signal(0);
  currentPage = signal(0);
  pageSize = 10;

  ngOnInit() {
    this.loadImports();
  }

  async loadImports() {
    this.isLoading.set(true);
    const offset = this.currentPage() * this.pageSize;

    try {
      const result = await this.importHistoryService.getImportHistory(this.pageSize, offset);
      this.imports.set(result.imports);
      this.totalCount.set(result.total);
    } catch (error) {
      console.error('Failed to load import history:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  viewDetails(importItem: ImportHistoryItem) {
    this.selectedImport.set(importItem);
  }

  closeDetails() {
    this.selectedImport.set(null);
  }

  // Pagination
  totalPages() {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.loadImports();
    }
  }

  previousPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.loadImports();
    }
  }

  // Navigation
  goBack() {
    this.router.navigate(['/settings']);
  }

  startNewImport() {
    this.router.navigate(['/settings/import']);
  }

  // Formatters
  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatProcessingTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }

  // Helper: Check if import has errors
  hasErrors(importItem: ImportHistoryItem): boolean {
    return !!(importItem.metadata?.errors && importItem.metadata.errors.length > 0);
  }
}
