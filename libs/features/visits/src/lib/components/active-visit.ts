import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Visit, Venue } from '@blastoise/shared';
import { interval, Subject, takeUntil } from 'rxjs';

/**
 * Active Visit Component (T126)
 *
 * Displays an active (in-progress) visit with:
 * - Live duration updates (updates every minute)
 * - Venue information
 * - Arrival time
 * - Visual indicator that visit is active
 *
 * User Story 2: Visual Timeline of Visits
 */

@Component({
  selector: 'app-active-visit',
  imports: [CommonModule],
  templateUrl: './active-visit.html',
  standalone: true,
})
export class ActiveVisitComponent implements OnInit, OnDestroy {
  @Input() visit!: Visit;
  @Input() venue?: Venue;

  private readonly destroy$ = new Subject<void>();

  // Current duration in minutes (updates live)
  readonly currentDuration = signal(0);

  // Formatted duration string
  readonly formattedDuration = computed(() => {
    return this.formatDuration(this.currentDuration());
  });

  // Formatted arrival time
  readonly formattedArrival = computed(() => {
    if (!this.visit) return '';
    const date = new Date(this.visit.arrival_time);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  });

  ngOnInit(): void {
    // Calculate initial duration
    this.updateDuration();

    // Update duration every second for responsive UI and tests
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDuration();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Calculate and update current duration
   */
  private updateDuration(): void {
    if (!this.visit?.arrival_time) return;

    const arrivalTime = new Date(this.visit.arrival_time).getTime();
    const currentTime = Date.now();
    const durationMs = currentTime - arrivalTime;
    const durationMinutes = durationMs / (1000 * 60);

    this.currentDuration.set(durationMinutes);
  }

  /**
   * Format duration as human-readable string
   * Examples: "5m", "1h 30m", "2h"
   */
  private formatDuration(minutes: number): string {
    const roundedMinutes = Math.floor(minutes);

    if (roundedMinutes < 60) {
      return `${roundedMinutes}m`;
    }

    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  }
}
