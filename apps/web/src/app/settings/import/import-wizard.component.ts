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
      heroCheckCircle,
      heroXCircle,
      heroCloudArrowUp,
      heroDocumentText,
      heroExclamationTriangle,
    }),
  ],
  template: `
    <div class="min-h-screen bg-base-100">
      <div class="max-w-4xl mx-auto px-4 py-6">
        <!-- Header -->
        <div class="mb-8">
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-base-content/60 hover:text-primary transition-colors mb-4"
            (click)="cancel()"
          >
            <ng-icon name="heroArrowLeft" size="16" />
            Back to Settings
          </button>
          <h1 class="text-2xl font-bold text-base-content">Import Timeline</h1>
          <p class="text-base-content/50 mt-1">Bring your brewery visits from Google Maps</p>
        </div>

        <!-- Progress Steps -->
        <div class="mb-6">
          <div class="flex items-center justify-between relative">
            <!-- Progress Line -->
            <div class="absolute top-5 left-0 right-0 h-0.5 bg-base-300">
              <div
                class="h-full bg-primary transition-all duration-300"
                [style.width]="((currentStep() - 1) / 4 * 100) + '%'"
              ></div>
            </div>

            <!-- Step Indicators -->
            @for (step of [1, 2, 3, 4, 5]; track step) {
              <div class="relative z-10 flex flex-col items-center">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
                  [class]="currentStep() >= step
                    ? 'bg-primary text-primary-content shadow-md'
                    : 'bg-base-200 text-base-content/50 border-2 border-base-300'"
                >
                  @if (currentStep() > step) {
                    <ng-icon name="heroCheckCircle" size="20" />
                  } @else {
                    {{ step }}
                  }
                </div>
                <span class="text-xs mt-2 text-base-content/60 hidden sm:block">
                  {{ ['Source', 'Instructions', 'Upload', 'Processing', 'Results'][step - 1] }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Step Content Card -->
        <div class="bg-base-200/50 rounded-2xl border border-base-300/50 shadow-sm">
          <div class="p-5 sm:p-6">
            <!-- Step 1: Choose Import Source -->
            @if (currentStep() === 1) {
              <div class="text-center mb-6">
                <h2 class="text-xl font-bold mb-2">Choose Import Source</h2>
                <p class="text-base-content/60 text-sm">Select where to import your visit history from</p>
              </div>

              <div class="max-w-md mx-auto">
                <button
                  type="button"
                  class="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                  (click)="selectGoogleTimeline()"
                >
                  <div class="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div class="relative flex items-center gap-4">
                    <div class="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/15 group-hover:scale-110 transition-transform">
                      <svg class="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    </div>
                    <div class="flex-1 text-left">
                      <div class="font-semibold text-lg">Google Timeline</div>
                      <div class="text-sm text-base-content/60">Import from Google Maps location history</div>
                    </div>
                    <ng-icon name="heroArrowRight" size="20" class="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                <div class="mt-4 rounded-xl bg-info/10 border border-info/20 p-4">
                  <div class="flex gap-3">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-info/15 shrink-0">
                      <ng-icon name="heroExclamationTriangle" size="16" class="text-info" />
                    </div>
                    <p class="text-xs text-base-content/60">
                      Apple Maps Timeline import coming soon. Currently only Google Timeline is supported.
                    </p>
                  </div>
                </div>
              </div>
            }

            <!-- Step 2: Export Instructions -->
            @if (currentStep() === 2) {
              <div class="mb-6">
                <h2 class="text-xl font-bold mb-2">Export Your Timeline Data</h2>
                <p class="text-base-content/60 text-sm">Follow these instructions to export your data</p>
              </div>

              <!-- Platform Tabs -->
              <div class="bg-base-200/80 rounded-xl p-1 mb-6">
                <div class="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    class="py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                    [class]="selectedPlatform() === 'android'
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content/70 hover:bg-base-300/50'"
                    (click)="selectedPlatform.set('android')"
                  >
                    Android
                  </button>
                  <button
                    type="button"
                    class="py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                    [class]="selectedPlatform() === 'ios'
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content/70 hover:bg-base-300/50'"
                    (click)="selectedPlatform.set('ios')"
                  >
                    iOS
                  </button>
                  <button
                    type="button"
                    class="py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                    [class]="selectedPlatform() === 'takeout'
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content/70 hover:bg-base-300/50'"
                    (click)="selectedPlatform.set('takeout')"
                  >
                    Takeout
                  </button>
                </div>
              </div>

              <!-- Instructions List -->
              <div class="rounded-xl bg-base-100/80 border border-base-300/50 p-5">
                @if (selectedPlatform() === 'android') {
                  <ol class="space-y-3 text-sm">
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">1</span><span>Open Google Maps app on your Android device</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">2</span><span>Tap your profile picture in the top right</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">3</span><span>Select "Your Timeline"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">4</span><span>Tap the three dots (⋮) menu</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">5</span><span>Select "Settings and privacy"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">6</span><span>Scroll to "Location History" section</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">7</span><span>Tap "Download your Timeline data"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">8</span><span>Choose JSON format and download</span></li>
                  </ol>
                }

                @if (selectedPlatform() === 'ios') {
                  <ol class="space-y-3 text-sm">
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">1</span><span>Open Google Maps app on your iPhone</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">2</span><span>Tap your profile picture in the top right</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">3</span><span>Select "Your Timeline"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">4</span><span>Tap the settings gear icon</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">5</span><span>Select "Export Timeline data"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">6</span><span>Choose JSON format and share to Files app</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">7</span><span>Save the file and note its location</span></li>
                  </ol>
                }

                @if (selectedPlatform() === 'takeout') {
                  <ol class="space-y-3 text-sm">
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">1</span><span>Visit <a href="https://takeout.google.com" target="_blank" class="text-primary hover:underline">takeout.google.com</a></span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">2</span><span>Deselect all, then select only "Location History"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">3</span><span>Click "Next step"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">4</span><span>Choose delivery method (email or Drive)</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">5</span><span>Select file type: ZIP and size: 2GB</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">6</span><span>Click "Create export"</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">7</span><span>Wait for email (can take hours/days)</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">8</span><span>Download and extract the ZIP file</span></li>
                    <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">9</span><span>Find JSON in "Location History" folder</span></li>
                  </ol>
                }
              </div>
            }

            <!-- Step 3: File Upload -->
            @if (currentStep() === 3) {
              <div class="mb-6">
                <h2 class="text-xl font-bold mb-2">Upload Timeline File</h2>
                <p class="text-base-content/60 text-sm">Select your Google Timeline JSON file</p>
              </div>

              <!-- Info about intelligent matching -->
              <div class="rounded-xl bg-success/10 border border-success/20 p-4 mb-6">
                <div class="flex gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-success/15 shrink-0">
                    <ng-icon name="heroCheckCircle" size="20" class="text-success" />
                  </div>
                  <div>
                    <h4 class="font-semibold text-sm">Duplicate Detection Active</h4>
                    <p class="text-xs text-base-content/60 mt-1">We'll match venues by Place ID and proximity. You can safely re-upload the same file.</p>
                  </div>
                </div>
              </div>

              <!-- File Drop Zone -->
              <div class="rounded-xl border-2 border-dashed border-base-300 hover:border-primary/50 transition-colors p-8 text-center bg-base-100/50">
                <input
                  type="file"
                  accept=".json"
                  class="hidden"
                  id="file-input"
                  (change)="onFileSelected($event)"
                />
                <label for="file-input" class="cursor-pointer">
                  <div class="flex flex-col items-center">
                    <div class="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
                      <ng-icon name="heroCloudArrowUp" size="28" class="text-primary" />
                    </div>
                    <p class="font-medium text-sm mb-1">Click to upload or drag and drop</p>
                    <p class="text-xs text-base-content/50">JSON files only (max 100MB)</p>
                  </div>
                </label>
              </div>

              <!-- File Info -->
              @if (selectedFile()) {
                <div class="mt-4 rounded-xl p-4"
                     [class]="fileValidation().valid ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                         [class]="fileValidation().valid ? 'bg-success/15' : 'bg-error/15'">
                      <ng-icon [name]="fileValidation().valid ? 'heroCheckCircle' : 'heroXCircle'" size="20"
                               [class]="fileValidation().valid ? 'text-success' : 'text-error'" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">{{ selectedFile()?.name }}</div>
                      <div class="text-xs text-base-content/60">
                        @if (fileValidation().valid) {
                          {{ formatFileSize(fileValidation().fileSize!) }} • {{ fileValidation().placeCount }} places
                        } @else {
                          {{ fileValidation().error }}
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- Upload Button -->
              @if (selectedFile() && fileValidation().valid) {
                <button
                  type="button"
                  class="w-full mt-4 py-3 px-4 rounded-xl bg-primary text-primary-content font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  (click)="startUpload()"
                  [disabled]="isUploading()"
                >
                  <ng-icon name="heroCloudArrowUp" size="20" />
                  Start Import
                </button>
              }
            }

            <!-- Step 4: Processing -->
            @if (currentStep() === 4) {
              <div class="text-center mb-6">
                <h2 class="text-xl font-bold mb-2">Processing Import</h2>
                <p class="text-base-content/60 text-sm">Please wait while we process your data</p>
              </div>

              <!-- Async Import Progress -->
              @if (isAsyncImport() && asyncJobId()) {
                <app-import-progress
                  [jobId]="asyncJobId()!"
                  (completed)="onAsyncImportComplete($event)"
                  (failed)="onAsyncImportFailed($event)"
                />
              }

              <!-- Sync Import Loading -->
              @if (!isAsyncImport() && !uploadError()) {
                <div class="flex flex-col items-center justify-center py-12">
                  <div class="relative">
                    <div class="w-16 h-16 rounded-full border-4 border-primary/20"></div>
                    <div class="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                  <p class="font-semibold mt-6">Importing visits...</p>
                  <p class="text-sm text-base-content/60 mt-2">This may take a few minutes for large files</p>
                </div>
              }

              @if (uploadError()) {
                <div class="rounded-xl bg-error/10 border border-error/20 p-4 mt-4">
                  <div class="flex gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-error/15 shrink-0">
                      <ng-icon name="heroXCircle" size="20" class="text-error" />
                    </div>
                    <div>
                      <h4 class="font-semibold text-sm text-error">Import Failed</h4>
                      <p class="text-xs text-base-content/60 mt-1">{{ uploadError() }}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="w-full mt-4 py-2.5 px-4 rounded-xl bg-base-200 text-base-content font-medium hover:bg-base-300 transition-colors"
                  (click)="resetWizard()"
                >
                  Try Again
                </button>
              }
            }

            <!-- Step 5: Results -->
            @if (currentStep() === 5) {
              <div class="text-center mb-6">
                <div class="flex items-center justify-center w-16 h-16 rounded-full bg-success/15 mx-auto mb-4">
                  <ng-icon name="heroCheckCircle" size="32" class="text-success" />
                </div>
                <h2 class="text-xl font-bold mb-2">Import Complete!</h2>
                <p class="text-base-content/60 text-sm">Your visits have been imported successfully</p>
              </div>

              @if (importResult()) {
                <!-- Stats Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div class="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
                    <div class="text-2xl font-bold text-primary">{{ importResult()!.total_places }}</div>
                    <div class="text-xs text-base-content/60 mt-1">Total Places</div>
                  </div>
                  <div class="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
                    <div class="text-2xl font-bold text-success">{{ importResult()!.visits_created }}</div>
                    <div class="text-xs text-base-content/60 mt-1">Created</div>
                  </div>
                  <div class="rounded-xl bg-warning/10 border border-warning/20 p-4 text-center">
                    <div class="text-2xl font-bold text-warning">{{ importResult()!.visits_skipped }}</div>
                    <div class="text-xs text-base-content/60 mt-1">Skipped</div>
                  </div>
                  <div class="rounded-xl bg-secondary/10 border border-secondary/20 p-4 text-center">
                    <div class="text-2xl font-bold text-secondary">{{ importResult()!.new_venues_created }}</div>
                    <div class="text-xs text-base-content/60 mt-1">New Venues</div>
                  </div>
                </div>

                <!-- Processing Time -->
                <div class="rounded-xl bg-info/10 border border-info/20 p-3 mb-4">
                  <div class="flex items-center justify-center gap-2 text-sm">
                    <ng-icon name="heroCheckCircle" size="16" class="text-info" />
                    <span>Completed in {{ formatProcessingTime(importResult()!.processing_time_ms) }}</span>
                  </div>
                </div>

                <!-- Tier Statistics -->
                @if (importResult()!.tier_statistics) {
                  <div class="rounded-xl bg-base-100/80 border border-base-300/50 p-4 mb-4">
                    <h3 class="font-semibold text-sm mb-3">Verification Breakdown</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div class="p-2 rounded-lg bg-primary/10">
                        <div class="font-semibold text-primary">{{ importResult()!.tier_statistics!.tier1_matches }}</div>
                        <div class="text-xs text-base-content/50">Tier 1</div>
                      </div>
                      <div class="p-2 rounded-lg bg-secondary/10">
                        <div class="font-semibold text-secondary">{{ importResult()!.tier_statistics!.tier2_matches }}</div>
                        <div class="text-xs text-base-content/50">Tier 2</div>
                      </div>
                      <div class="p-2 rounded-lg bg-accent/10">
                        <div class="font-semibold text-accent">{{ importResult()!.tier_statistics!.tier3_matches }}</div>
                        <div class="text-xs text-base-content/50">Tier 3</div>
                      </div>
                      <div class="p-2 rounded-lg bg-base-200">
                        <div class="font-semibold">{{ importResult()!.tier_statistics!.unverified }}</div>
                        <div class="text-xs text-base-content/50">Unverified</div>
                      </div>
                    </div>
                  </div>
                }

                <!-- Errors -->
                @if (importResult()!.errors.length > 0) {
                  <details class="rounded-xl bg-base-100/80 border border-base-300/50 mb-4">
                    <summary class="p-4 cursor-pointer font-medium text-sm flex items-center gap-2">
                      <ng-icon name="heroExclamationTriangle" size="16" class="text-warning" />
                      View Errors ({{ importResult()!.errors.length }})
                    </summary>
                    <div class="px-4 pb-4">
                      <ul class="space-y-2">
                        @for (error of importResult()!.errors.slice(0, 10); track error.timestamp) {
                          <li class="text-sm p-2 rounded-lg bg-error/5">
                            <span class="font-medium">{{ error.place_name }}</span>
                            @if (error.address) {
                              <span class="text-base-content/60"> - {{ error.address }}</span>
                            }
                            <div class="text-xs text-error mt-1">{{ error.error }}</div>
                          </li>
                        }
                        @if (importResult()!.errors.length > 10) {
                          <li class="text-xs text-base-content/50 text-center">
                            ...and {{ importResult()!.errors.length - 10 }} more
                          </li>
                        }
                      </ul>
                    </div>
                  </details>
                }

                <!-- Action Buttons -->
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    class="py-3 px-4 rounded-xl bg-primary text-primary-content font-medium hover:bg-primary/90 transition-colors"
                    (click)="viewTimeline()"
                  >
                    View Timeline
                  </button>
                  <button
                    type="button"
                    class="py-3 px-4 rounded-xl bg-base-200 text-base-content font-medium hover:bg-base-300 transition-colors"
                    (click)="importAnother()"
                  >
                    Import Another
                  </button>
                </div>
              }
            }

            <!-- Navigation Buttons -->
            <div class="flex justify-between mt-8 pt-6 border-t border-base-300/50">
              @if (currentStep() > 1 && currentStep() < 4) {
                <button
                  type="button"
                  class="flex items-center gap-2 py-2.5 px-4 rounded-xl text-base-content/70 hover:bg-base-200 transition-colors"
                  (click)="previousStep()"
                >
                  <ng-icon name="heroArrowLeft" size="16" />
                  Back
                </button>
              }
              @if (currentStep() === 1) {
                <button
                  type="button"
                  class="py-2.5 px-4 rounded-xl text-base-content/70 hover:bg-base-200 transition-colors"
                  (click)="cancel()"
                >
                  Cancel
                </button>
                <div></div>
              }
              @if (currentStep() === 2) {
                <button
                  type="button"
                  class="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-content font-medium hover:bg-primary/90 transition-colors ml-auto"
                  (click)="nextStep()"
                >
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

        // Check for valid Timeline format
        const isLegacy = json.timelineObjects && Array.isArray(json.timelineObjects);
        const isNew = json.placeVisits && Array.isArray(json.placeVisits);

        if (!isLegacy && !isNew) {
          this.fileValidation.set({
            valid: false,
            error: 'Invalid Timeline format. Expected timelineObjects or placeVisits array.',
          });
          return;
        }

        // Count places
        let placeCount = 0;
        if (isLegacy) {
          placeCount = json.timelineObjects.filter((obj: { placeVisit?: unknown }) => obj.placeVisit).length;
        } else {
          placeCount = json.placeVisits.length;
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
        error: (error) => {
          this.uploadError.set(error.message || 'Upload failed');
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
