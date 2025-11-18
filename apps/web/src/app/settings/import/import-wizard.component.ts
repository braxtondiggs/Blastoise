/**
 * Multi-step wizard for importing Google Timeline data
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowLeft,
  heroArrowRight,
  heroCheckCircle,
  heroShieldCheck,
  heroXCircle,
  heroCloudArrowUp,
  heroDocumentText,
  heroExclamationTriangle,
} from '@ng-icons/heroicons/outline';
import { ImportService, ImportSummary, AsyncImportResponse } from './import.service';
import { ImportProgressComponent } from './import-progress.component';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileSize?: number;
  placeCount?: number;
}

@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [CommonModule, NgIconComponent, ImportProgressComponent],
  viewProviders: [
    provideIcons({
      heroArrowLeft,
      heroArrowRight,
      heroShieldCheck,
      heroCheckCircle,
      heroXCircle,
      heroCloudArrowUp,
      heroDocumentText,
      heroExclamationTriangle,
    }),
  ],
  template: `
    <div class="min-h-screen bg-base-100 p-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold mb-2">Import Google Timeline</h1>
          <p class="text-base-content/70">
            Import your brewery and winery visits from Google Timeline
          </p>
        </div>

        <!-- Progress Steps -->
        <div class="mb-8">
          <ul class="steps steps-horizontal w-full">
            <li class="step" [class.step-primary]="currentStep() >= 1">Choose Source</li>
            <li class="step" [class.step-primary]="currentStep() >= 2">Instructions</li>
            <li class="step" [class.step-primary]="currentStep() >= 3">Upload File</li>
            <li class="step" [class.step-primary]="currentStep() >= 4">Processing</li>
            <li class="step" [class.step-primary]="currentStep() >= 5">Results</li>
          </ul>
        </div>

        <!-- Step Content Card -->
        <div class="card bg-base-200 shadow-xl">
          <div class="card-body">
            <!-- Step 1: Choose Import Source (T047) -->
            @if (currentStep() === 1) {
              <h2 class="card-title mb-4">Choose Import Source</h2>
              <p class="mb-6 text-base-content/70">
                Select where you want to import your visit history from:
              </p>

              <button
                class="btn btn-primary btn-lg w-full"
                (click)="selectGoogleTimeline()"
              >
                <ng-icon name="heroDocumentText" size="24" />
                Import visits from your Google Maps Timeline
              </button>
            }

            <!-- Step 2: Export Instructions (T048) -->
            @if (currentStep() === 2) {
              <h2 class="card-title mb-4">Export Your Timeline Data</h2>
              <p class="mb-4 text-base-content/70">
                Before importing, you need to export your Google Timeline data. Choose your platform:
              </p>

              <div class="tabs tabs-border bg-base-200/50 mb-4">
                <button
                  class="tab tab-sm"
                  [class.tab-active]="selectedPlatform() === 'takeout'"
                  (click)="selectedPlatform.set('takeout')"
                >
                  Web (Google Takeout)
                </button>
                <button
                  class="tab tab-sm"
                  [class.tab-active]="selectedPlatform() === 'android'"
                  (click)="selectedPlatform.set('android')"
                >
                  Android
                </button>
                <button
                  class="tab tab-sm"
                  [class.tab-active]="selectedPlatform() === 'ios'"
                  (click)="selectedPlatform.set('ios')"
                >
                  iOS
                </button>
              </div>

              <!-- Web Instructions (No longer available) -->
              @if (selectedPlatform() === 'takeout') {
                <div class="bg-base-200/50 rounded-lg p-4">
                  <div class="alert alert-warning mb-4">
                    <ng-icon name="heroExclamationTriangle" size="20" />
                    <div class="text-sm">
                      <strong>Timeline Not Available on Web</strong>
                      <p class="mt-1">Since the data shown on your Google Maps Timeline comes directly from your device, Timeline is not available for Maps on your computer. To use Google Maps Timeline, download the Google Maps app on your Android or iOS device.</p>
                    </div>
                  </div>
                  <p class="text-sm text-base-content/70">
                    Please use the Android or iOS tabs above to learn how to export your Timeline data from your mobile device.
                  </p>
                </div>
              }

              <!-- Android Instructions -->
              @if (selectedPlatform() === 'android') {
                <div class="bg-base-200/50 rounded-lg p-4">
                  <h4 class="font-bold text-sm mb-3">Export from Settings App</h4>
                  <ol class="list-decimal list-inside space-y-2 text-sm">
                    <li>On your Android phone or tablet, open the Settings app</li>
                    <li>Tap "Location"</li>
                    <li>Tap "Location services"</li>
                    <li>Tap "Timeline"</li>
                    <li>Under "Timeline," tap "Export Timeline data"</li>
                    <li>Tap "Continue"</li>
                    <li>Select your preferred storage location</li>
                    <li>Tap "Save"</li>
                    <li>Wait for the "Export complete" notification</li>
                  </ol>
                </div>
              }

              <!-- iOS Instructions -->
              @if (selectedPlatform() === 'ios') {
                <div class="bg-base-200/50 rounded-lg p-4">
                  <h4 class="font-bold text-sm mb-3">Export from Google Maps App</h4>
                  <ol class="list-decimal list-inside space-y-2 text-sm">
                    <li>On your iPhone or iPad, open the Google Maps app</li>
                    <li>Tap your profile picture or initial</li>
                    <li>Tap "Settings"</li>
                    <li>Under "Account Settings," tap "Personal content"</li>
                    <li>Under "Location settings," tap "Export Timeline data"</li>
                    <li>On the iOS share sheet, tap "Save to Files"</li>
                    <li>Select your preferred storage location</li>
                    <li>At the top right, tap "Save"</li>
                    <li>Your exported Timeline data is saved as "location-history.json"</li>
                  </ol>
                </div>
              }

              <!-- Privacy Notice -->
              <div class="bg-success/10 border border-success/20 rounded-lg p-3 mt-4">
                <div class="flex items-start gap-2">
                  <ng-icon name="heroShieldCheck" size="16" class="text-success mt-0.5" />
                  <div class="text-xs text-base-content/80">
                    <strong class="text-success">Privacy First:</strong> Your Timeline data is processed locally and on our servers.
                    We only store venue IDs and rounded timestamps—never your precise GPS coordinates.
                  </div>
                </div>
              </div>
            }

            <!-- Step 3: File Upload -->
            @if (currentStep() === 3) {
              <h2 class="card-title mb-4">Upload Timeline File</h2>
              <p class="mb-6 text-base-content/70">
                Select your Google Timeline JSON file to import:
              </p>

              <!-- Info about intelligent matching -->
              <div class="alert alert-info mb-4">
                <ng-icon name="heroCheckCircle" size="20" />
                <div>
                  <div class="font-bold">Smart Venue Matching</div>
                  <div class="text-sm">
                    We use a 3-tier verification system (OpenStreetMap → Brewery DB → Google Search) to accurately identify breweries and wineries.
                    Duplicate visits are automatically detected within a 15-minute window.
                  </div>
                </div>
              </div>

              <!-- File Input -->
              <div class="form-control w-full mb-4">
                <label class="label">
                  <span class="label-text">Choose JSON file</span>
                </label>
                <input
                  type="file"
                  accept=".json"
                  class="file-input file-input-secondary w-full"
                  (change)="onFileSelected($event)"
                />
              </div>

              <!-- File Info -->
              @if (selectedFile()) {
                <div class="alert" [class.alert-success]="fileValidation().valid" [class.alert-error]="!fileValidation().valid">
                  <ng-icon [name]="fileValidation().valid ? 'heroCheckCircle' : 'heroXCircle'" size="20" />
                  <div>
                    <div class="font-bold">{{ selectedFile()?.name }}</div>
                    <div class="text-sm">
                      @if (fileValidation().valid) {
                        Size: {{ formatFileSize(fileValidation().fileSize!) }} •
                        Places: {{ fileValidation().placeCount }}
                      } @else {
                        {{ fileValidation().error }}
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- Upload Button -->
              @if (selectedFile() && fileValidation().valid) {
                <button
                  class="btn btn-primary btn-block mt-4"
                  (click)="startUpload()"
                  [disabled]="isUploading()"
                >
                  <ng-icon name="heroCloudArrowUp" size="20" />
                  Start Import
                </button>
              }
            }

            <!-- Step 4: Processing (T051 +-T078) -->
            @if (currentStep() === 4) {
              <h2 class="card-title mb-4">Processing Import</h2>
              <p class="mb-6 text-base-content/70">
                Please wait while we process your Timeline data...
              </p>

              <!-- Async Import Progress (T076-T078) -->
              @if (isAsyncImport() && asyncJobId()) {
                <app-import-progress
                  [jobId]="asyncJobId()!"
                  (completed)="onAsyncImportComplete($event)"
                  (failed)="onAsyncImportFailed($event)"
                />
              }

              <!-- Sync Import Loading -->
              @if (!isAsyncImport()) {
                <div class="flex flex-col items-center justify-center py-8">
                  <span class="loading loading-spinner loading-lg text-primary mb-4"></span>
                  <p class="text-lg font-semibold">Importing visits...</p>
                  <p class="text-sm text-base-content/70 mt-2">
                    This may take a few minutes for large files
                  </p>
                </div>
              }

              @if (uploadError()) {
                <div class="alert alert-error mt-4">
                  <ng-icon name="heroXCircle" size="20" />
                  <div>
                    <div class="font-bold">Import Failed</div>
                    <div class="text-sm">{{ uploadError() }}</div>
                  </div>
                </div>
                <button class="btn btn-outline mt-4" (click)="resetWizard()">
                  Try Again
                </button>
              }
            }

            <!-- Step 5: Results (T052) -->
            @if (currentStep() === 5) {
              <h2 class="card-title mb-4">Import Complete!</h2>

              @if (importResult()) {
                <div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
                  <div class="stat">
                    <div class="stat-title">Total Places</div>
                    <div class="stat-value text-primary">{{ importResult()!.total_places }}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-title">Visits Created</div>
                    <div class="stat-value text-success">{{ importResult()!.visits_created }}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-title">Skipped</div>
                    <div class="stat-value text-warning">{{ importResult()!.visits_skipped }}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-title">New Venues</div>
                    <div class="stat-value">{{ importResult()!.new_venues_created }}</div>
                  </div>
                </div>

                <!-- Processing Time -->
                <div class="alert alert-info mb-4">
                  <ng-icon name="heroCheckCircle" size="20" />
                  <span>
                    Processing completed in {{ formatProcessingTime(importResult()!.processing_time_ms) }}
                  </span>
                </div>

                <!-- Tier Statistics -->
                @if (importResult()!.tier_statistics) {
                  <div class="mb-4">
                    <h3 class="font-bold mb-2">Verification Breakdown:</h3>
                    <div class="flex gap-2 flex-wrap">
                      <div class="badge badge-primary badge-lg">
                        Tier 1: {{ importResult()!.tier_statistics!.tier1_matches }}
                      </div>
                      <div class="badge badge-secondary badge-lg">
                        Tier 2: {{ importResult()!.tier_statistics!.tier2_matches }}
                      </div>
                      <div class="badge badge-accent badge-lg">
                        Tier 3: {{ importResult()!.tier_statistics!.tier3_matches }}
                      </div>
                      <div class="badge badge-ghost badge-lg">
                        Unverified: {{ importResult()!.tier_statistics!.unverified }}
                      </div>
                    </div>
                  </div>
                }

                <!-- Errors -->
                @if (importResult()!.errors.length > 0) {
                  <div class="collapse collapse-arrow bg-base-300 mb-4">
                    <input type="checkbox" />
                    <div class="collapse-title font-medium">
                      <ng-icon name="heroExclamationTriangle" size="20" class="inline" />
                      View Errors ({{ importResult()!.errors.length }})
                    </div>
                    <div class="collapse-content">
                      <ul class="space-y-2">
                        @for (error of importResult()!.errors.slice(0, 10); track error.timestamp) {
                          <li class="text-sm">
                            <span class="font-bold">{{ error.place_name }}</span>
                            @if (error.address) {
                              <span class="text-base-content/70"> - {{ error.address }}</span>
                            }
                            <br />
                            <span class="text-error">{{ error.error }}</span>
                          </li>
                        }
                        @if (importResult()!.errors.length > 10) {
                          <li class="text-sm text-base-content/70">
                            ...and {{ importResult()!.errors.length - 10 }} more
                          </li>
                        }
                      </ul>
                    </div>
                  </div>
                }

                <!-- Action Buttons -->
                <div class="flex gap-4">
                  <button class="btn btn-primary flex-1" (click)="viewTimeline()">
                    View Timeline
                  </button>
                  <button class="btn btn-outline flex-1" (click)="importAnother()">
                    Import Another
                  </button>
                </div>
              }
            }

            <!-- Navigation Buttons -->
            <div class="card-actions justify-between mt-8">
              @if (currentStep() > 1 && currentStep() < 4) {
                <button class="btn btn-ghost" (click)="previousStep()">
                  <ng-icon name="heroArrowLeft" size="16" />
                  Back
                </button>
              }
              @if (currentStep() === 1) {
                <button class="btn btn-ghost" (click)="cancel()">
                  Cancel
                </button>
              }
              @if (currentStep() === 2) {
                <button class="btn btn-primary" (click)="nextStep()">
                  Next
                  <ng-icon name="heroArrowRight" size="16" />
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ImportWizardComponent {
  private readonly importService = new ImportService();
  private readonly router = new Router();

  // Wizard state
  currentStep = signal<WizardStep>(1);
  selectedPlatform = signal<'android' | 'ios' | 'takeout'>('android');

  // File upload state
  selectedFile = signal<File | null>(null);
  fileValidation = signal<FileValidationResult>({ valid: false });
  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  importResult = signal<ImportSummary | null>(null);

  // Async import state (T076)
  isAsyncImport = signal(false);
  asyncJobId = signal<string | null>(null);

  selectGoogleTimeline() {
    this.nextStep();
  }

  // Navigation
  nextStep() {
    if (this.currentStep() < 5) {
      this.currentStep.set((this.currentStep() + 1) as WizardStep);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set((this.currentStep() - 1) as WizardStep);
    }
  }

  cancel() {
    this.router.navigate(['/settings']);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedFile.set(null);
      this.fileValidation.set({ valid: false });
      return;
    }

    const file = input.files[0];
    this.selectedFile.set(file);

    this.validateFile(file);
  }

  private validateFile(file: File) {
    const MAX_SIZE_MB = 100;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    // Check file size
    if (file.size > MAX_SIZE_BYTES) {
      this.fileValidation.set({
        valid: false,
        error: `File too large: ${this.formatFileSize(file.size)} (max ${MAX_SIZE_MB}MB)`,
      });
      return;
    }

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.fileValidation.set({
        valid: false,
        error: 'Invalid file type. Please select a JSON file.',
      });
      return;
    }

    // Read and validate JSON structure
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);

        // Check for valid Timeline format (iOS or Android)
        const isIOS = json.placeVisits && Array.isArray(json.placeVisits);
        const isAndroid = json.semanticSegments && Array.isArray(json.semanticSegments);

        if (!isIOS && !isAndroid) {
          this.fileValidation.set({
            valid: false,
            error: 'Invalid Timeline format. Expected placeVisits (iOS) or semanticSegments (Android) array.',
          });
          return;
        }

        // Count places
        let placeCount = 0;
        if (isIOS) {
          placeCount = json.placeVisits.length;
        } else if (isAndroid) {
          placeCount = json.semanticSegments.filter((seg: any) => seg.visit).length;
        }

        this.fileValidation.set({
          valid: true,
          fileSize: file.size,
          placeCount,
        });
      } catch {
        this.fileValidation.set({
          valid: false,
          error: 'Invalid JSON file. Please check the file format.',
        });
      }
    };
    reader.readAsText(file);
  }

  async startUpload() {
    const file = this.selectedFile();
    if (!file || !this.fileValidation().valid) {
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);
    this.currentStep.set(4); // Move to processing step

    try {
      // Read file content
      const fileContent = await this.readFileAsText(file);

      this.importService.uploadTimeline(fileContent, file.name).subscribe({
        next: (result) => {
          // Check if response is async (job_id) or sync (ImportSummary)
          if ('job_id' in result && !('success' in result)) {
            // Async import: start polling with ImportProgressComponent
            const asyncResponse = result as AsyncImportResponse;
            this.isAsyncImport.set(true);
            this.asyncJobId.set(asyncResponse.job_id);
            this.isUploading.set(false);
          } else {
            // Sync import: show results immediately
            const summary = result as ImportSummary;
            this.isAsyncImport.set(false);
            this.importResult.set(summary);
            this.isUploading.set(false);
            this.currentStep.set(5); // Move to results step
          }
        },
        error: (err) => {
          this.uploadError.set(err.message || 'Upload failed');
          this.isUploading.set(false);
        },
      });
    } catch {
      this.uploadError.set('Failed to read file');
      this.isUploading.set(false);
    }
  }

  /**
   * Handle async import completion
   */
  onAsyncImportComplete(result: ImportSummary) {
    this.importResult.set(result);
    this.currentStep.set(5); // Move to results step
    // TODO - Show push notification (if permission granted)
  }

  /**
   * Handle async import failure
   */
  onAsyncImportFailed(error: string) {
    this.uploadError.set(error);
  }

  // Helper: Read file as text
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  viewTimeline() {
    this.router.navigate(['/visits']);
  }

  importAnother() {
    this.resetWizard();
  }

  resetWizard() {
    this.currentStep.set(1);
    this.selectedFile.set(null);
    this.fileValidation.set({ valid: false });
    this.isUploading.set(false);
    this.uploadError.set(null);
    this.importResult.set(null);
    this.isAsyncImport.set(false);
    this.asyncJobId.set(null);
  }

  // Helper: Format file size
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Helper: Format processing time
  formatProcessingTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }
}
