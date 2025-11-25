/**
 * Displays progress for async import jobs
 */

import { Component, signal, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheckCircle, heroXCircle, heroExclamationTriangle } from '@ng-icons/heroicons/outline';
import { ImportService, JobStatus, ImportSummary } from './import.service';
import { interval, Subscription, switchMap, takeWhile } from 'rxjs';

@Component({
  selector: 'app-import-progress',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ heroCheckCircle, heroXCircle, heroExclamationTriangle })],
  template: `
    <div class="flex flex-col items-center justify-center py-8">
      @if (jobStatus()?.status === 'waiting' || jobStatus()?.status === 'delayed') {
        <span class="loading loading-spinner loading-lg text-primary mb-4"></span>
        <p class="text-lg font-semibold">Queued for processing...</p>
        <p class="text-sm text-base-content/70 mt-2">
          Your import will start shortly
        </p>
      }

      @if (jobStatus()?.status === 'active') {
        <span class="loading loading-spinner loading-lg text-primary mb-4"></span>
        <p class="text-lg font-semibold">{{ jobStatus()?.progress?.message || 'Processing import...' }}</p>

        <!-- Progress Bar (T078) -->
        @if (jobStatus()?.progress) {
          <div class="w-full max-w-md mt-4">
            <div class="flex justify-between text-sm mb-2">
              <span>{{ jobStatus()!.progress!.processed }} / {{ jobStatus()!.progress!.total }} places</span>
              <span>{{ jobStatus()!.progress!.percentage }}%</span>
            </div>
            <progress
              class="progress progress-primary w-full"
              [value]="jobStatus()!.progress!.percentage"
              max="100"
            ></progress>
          </div>
        }

        <p class="text-sm text-base-content/70 mt-2">
          This may take a few minutes for large files
        </p>
      }

      @if (jobStatus()?.status === 'completed') {
        <ng-icon name="heroCheckCircle" class="w-16 h-16 text-success mb-4" />
        <p class="text-lg font-semibold text-success">Import Complete!</p>
        <p class="text-sm text-base-content/70 mt-2">
          Redirecting to results...
        </p>
      }

      @if (jobStatus()?.status === 'failed') {
        <ng-icon name="heroXCircle" class="w-16 h-16 text-error mb-4" />
        <p class="text-lg font-semibold text-error">Import Failed</p>
        <div class="alert alert-error mt-4 max-w-md">
          <ng-icon name="heroExclamationTriangle" class="w-5 h-5" />
          <span>{{ jobStatus()?.error || 'Unknown error occurred' }}</span>
        </div>
      }
    </div>
  `,
})
export class ImportProgressComponent implements OnInit, OnDestroy {
  // Inputs
  jobId = input.required<string>();

  // Outputs
  completed = output<ImportSummary>();
  failed = output<string>();

  // State
  jobStatus = signal<JobStatus | null>(null);

  // Dependencies
  private readonly importService = new ImportService();

  // Polling subscription
  private pollSubscription?: Subscription;

  ngOnInit() {
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    // Poll every 2 seconds until job is complete or failed
    this.pollSubscription = interval(2000)
      .pipe(
        switchMap(() => this.importService.getJobStatus(this.jobId())),
        takeWhile((status) => {
          // Continue polling while job is in progress
          return status.status === 'waiting' || status.status === 'active' || status.status === 'delayed';
        }, true) // Include final emission
      )
      .subscribe({
        next: (status) => {
          this.jobStatus.set(status);

          // Emit completion or failure events
          if (status.status === 'completed' && status.result) {
            this.completed.emit(status.result);
          } else if (status.status === 'failed') {
            this.failed.emit(status.error || 'Import failed');
          }
        },
        error: (error) => {
          console.error('Failed to poll job status:', error);
          this.failed.emit('Failed to check import status');
        },
      });
  }

  private stopPolling() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }
}
