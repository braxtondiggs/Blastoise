/**
 * Displays list of past imports with timestamps, visit counts, and processing times
 */

import { Component, signal, OnInit } from '@angular/core';
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
    <div class="min-h-screen bg-base-100 p-4">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-6 flex items-center gap-4">
          <button class="btn btn-ghost btn-circle" (click)="goBack()">
            <ng-icon name="heroArrowLeft" class="w-6 h-6" />
          </button>
          <div>
            <h1 class="text-3xl font-bold">Import History</h1>
            <p class="text-base-content/70">
              View your past Google Timeline imports
            </p>
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && imports().length === 0) {
          <div class="card bg-base-200 shadow-xl">
            <div class="card-body items-center text-center py-12">
              <ng-icon name="heroDocumentText" class="w-16 h-16 text-base-content/30 mb-4" />
              <h3 class="text-xl font-bold">No Import History</h3>
              <p class="text-base-content/70 mb-4">
                You haven't imported any Timeline data yet.
              </p>
              <button class="btn btn-primary" (click)="startNewImport()">
                Import Timeline Data
              </button>
            </div>
          </div>
        }

        <!-- Import List (T083) -->
        @if (!isLoading() && imports().length > 0) {
          <div class="space-y-4">
            @for (import of imports(); track import.id) {
              <div
                class="card bg-base-200 shadow hover:shadow-lg transition-shadow cursor-pointer"
                (click)="viewDetails(import)"
              >
                <div class="card-body">
                  <div class="flex items-start justify-between">
                    <!-- Left: Import Info -->
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <ng-icon name="heroDocumentText" class="w-5 h-5 text-primary" />
                        <h3 class="font-bold text-lg">
                          {{ import.file_name || 'Google Timeline Import' }}
                        </h3>
                      </div>

                      <!-- Date and Time -->
                      <div class="flex items-center gap-4 text-sm text-base-content/70 mb-3">
                        <div class="flex items-center gap-1">
                          <ng-icon name="heroCalendar" class="w-4 h-4" />
                          <span>{{ formatDate(import.imported_at) }}</span>
                        </div>
                        @if (import.processing_time_ms) {
                          <div class="flex items-center gap-1">
                            <ng-icon name="heroClock" class="w-4 h-4" />
                            <span>{{ formatProcessingTime(import.processing_time_ms) }}</span>
                          </div>
                        }
                      </div>

                      <!-- Stats Grid -->
                      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="stat bg-base-300 rounded-lg p-3">
                          <div class="stat-title text-xs">Places</div>
                          <div class="stat-value text-2xl">{{ import.total_places }}</div>
                        </div>
                        <div class="stat bg-base-300 rounded-lg p-3">
                          <div class="stat-title text-xs">Visits Created</div>
                          <div class="stat-value text-2xl text-success">{{ import.visits_created }}</div>
                        </div>
                        <div class="stat bg-base-300 rounded-lg p-3">
                          <div class="stat-title text-xs">Skipped</div>
                          <div class="stat-value text-2xl text-warning">{{ import.visits_skipped }}</div>
                        </div>
                        <div class="stat bg-base-300 rounded-lg p-3">
                          <div class="stat-title text-xs">New Venues</div>
                          <div class="stat-value text-2xl">{{ import.new_venues_created }}</div>
                        </div>
                      </div>

                      <!-- Success/Error Badge -->
                      @if (hasErrors(import)) {
                        <div class="badge badge-warning gap-1 mt-3">
                          <ng-icon name="heroXCircle" class="w-3 h-3" />
                          {{ import.metadata!.errors!.length }} errors
                        </div>
                      } @else {
                        <div class="badge badge-success gap-1 mt-3">
                          <ng-icon name="heroCheckCircle" class="w-3 h-3" />
                          Success
                        </div>
                      }
                    </div>

                    <!-- Right: View Details Arrow -->
                    <div class="ml-4">
                      <ng-icon name="heroChevronRight" class="w-6 h-6 text-base-content/50" />
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Pagination -->
            @if (totalCount() > pageSize) {
              <div class="flex justify-center gap-2 mt-6">
                <button
                  class="btn btn-outline"
                  [disabled]="currentPage() === 0"
                  (click)="previousPage()"
                >
                  Previous
                </button>
                <div class="btn btn-ghost">
                  Page {{ currentPage() + 1 }} of {{ totalPages() }}
                </div>
                <button
                  class="btn btn-outline"
                  [disabled]="currentPage() >= totalPages() - 1"
                  (click)="nextPage()"
                >
                  Next
                </button>
              </div>
            }
          </div>
        }

        <!-- Detail Modal (T084) -->
        @if (selectedImport()) {
          <div class="modal modal-open">
            <div class="modal-box max-w-3xl">
              <h3 class="font-bold text-xl mb-4">Import Details</h3>

              <!-- Basic Info -->
              <div class="mb-6">
                <div class="text-sm text-base-content/70 mb-1">File</div>
                <div class="font-semibold">{{ selectedImport()!.file_name || 'Google Timeline Import' }}</div>
              </div>

              <div class="mb-6">
                <div class="text-sm text-base-content/70 mb-1">Imported</div>
                <div class="font-semibold">{{ formatDate(selectedImport()!.imported_at) }}</div>
              </div>

              @if (selectedImport()!.processing_time_ms !== undefined) {
                <div class="mb-6">
                  <div class="text-sm text-base-content/70 mb-1">Processing Time</div>
                  <div class="font-semibold">{{ formatProcessingTime(selectedImport()!.processing_time_ms!) }}</div>
                </div>
              }

              <!-- Statistics -->
              <div class="divider">Statistics</div>
              <div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
                <div class="stat">
                  <div class="stat-title">Total Places</div>
                  <div class="stat-value text-primary">{{ selectedImport()!.total_places }}</div>
                </div>
                <div class="stat">
                  <div class="stat-title">Visits Created</div>
                  <div class="stat-value text-success">{{ selectedImport()!.visits_created }}</div>
                </div>
                <div class="stat">
                  <div class="stat-title">Skipped</div>
                  <div class="stat-value text-warning">{{ selectedImport()!.visits_skipped }}</div>
                </div>
              </div>

              <div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
                <div class="stat">
                  <div class="stat-title">New Venues</div>
                  <div class="stat-value">{{ selectedImport()!.new_venues_created }}</div>
                </div>
                @if (selectedImport()!.existing_venues_matched !== undefined) {
                  <div class="stat">
                    <div class="stat-title">Matched Venues</div>
                    <div class="stat-value">{{ selectedImport()!.existing_venues_matched }}</div>
                  </div>
                }
              </div>

              <!-- Tier Statistics -->
              @if (selectedImport()!.metadata?.tier_statistics) {
                <div class="divider">Verification Breakdown</div>
                <div class="flex gap-2 flex-wrap mb-6">
                  <div class="badge badge-primary badge-lg">
                    Tier 1: {{ selectedImport()!.metadata!.tier_statistics!.tier1_matches }}
                  </div>
                  <div class="badge badge-secondary badge-lg">
                    Tier 2: {{ selectedImport()!.metadata!.tier_statistics!.tier2_matches }}
                  </div>
                  <div class="badge badge-accent badge-lg">
                    Tier 3: {{ selectedImport()!.metadata!.tier_statistics!.tier3_matches }}
                  </div>
                  <div class="badge badge-ghost badge-lg">
                    Unverified: {{ selectedImport()!.metadata!.tier_statistics!.unverified }}
                  </div>
                </div>
              }

              <!-- Errors -->
              @if (selectedImport()!.metadata?.errors && selectedImport()!.metadata!.errors!.length > 0) {
                <div class="divider">Errors</div>
                <div class="alert alert-warning mb-6">
                  <ng-icon name="heroXCircle" class="w-5 h-5" />
                  <span>{{ selectedImport()!.metadata!.errors!.length }} places failed to import</span>
                </div>
                <div class="max-h-64 overflow-y-auto space-y-2">
                  @for (error of selectedImport()!.metadata!.errors!.slice(0, 10); track error.timestamp) {
                    <div class="bg-base-300 p-3 rounded-lg text-sm">
                      <div class="font-bold">{{ error.place_name }}</div>
                      @if (error.address) {
                        <div class="text-base-content/70 text-xs">{{ error.address }}</div>
                      }
                      <div class="text-error text-xs mt-1">{{ error.error }}</div>
                    </div>
                  }
                  @if (selectedImport()!.metadata!.errors!.length > 10) {
                    <div class="text-sm text-base-content/70 text-center">
                      ...and {{ selectedImport()!.metadata!.errors!.length - 10 }} more
                    </div>
                  }
                </div>
              }

              <!-- Modal Actions -->
              <div class="modal-action">
                <button class="btn" (click)="closeDetails()">Close</button>
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
  private readonly importHistoryService = new ImportHistoryService();
  private readonly router = new Router();

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
