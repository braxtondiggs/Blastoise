import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';
import { GeofenceService } from '../services/geofence';
import { VisitTrackerService } from '../services/visit-tracker';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMapPinSolid, heroCheckCircleSolid, heroInformationCircleSolid } from '@ng-icons/heroicons/solid';

interface PendingVenue {
  venueId: string;
  venueName: string;
  enteredAt: number;
  isLogged: boolean; // true if 10+ minutes have passed
  showInfo: boolean; // toggle for info tooltip
}

/**
 * Pending Visit Indicator Component
 *
 * Shows a banner when user is inside a venue's geofence:
 * - Before 10 min: "You're at [Venue]" with info button
 * - After 10 min: "Visit to [Venue] logged!"
 */
@Component({
  selector: 'app-pending-visit-indicator',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ heroMapPinSolid, heroCheckCircleSolid, heroInformationCircleSolid })],
  template: `
    @if (pendingVenues().length > 0) {
      <div class="flex flex-col gap-2 mb-4">
        @for (venue of pendingVenues(); track venue.venueId) {
          <div
            class="rounded-2xl shadow-xl border"
            [class]="venue.isLogged
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-400/30 text-white'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400/30 text-white'"
          >
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20">
                <ng-icon
                  [name]="venue.isLogged ? 'heroCheckCircleSolid' : 'heroMapPinSolid'"
                  class="text-2xl text-white"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  @if (!venue.isLogged) {
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  }
                  <h3 class="font-bold text-base truncate">{{ venue.venueName }}</h3>
                </div>
                <p class="text-sm opacity-90 mt-0.5">
                  @if (venue.isLogged) {
                    Visit logged successfully!
                  } @else {
                    You're here
                  }
                </p>
              </div>
              @if (!venue.isLogged) {
                <button
                  (click)="toggleInfo(venue.venueId)"
                  class="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="More info"
                >
                  <ng-icon name="heroInformationCircleSolid" class="text-lg text-white" />
                </button>
              }
            </div>
            @if (infoVisible()[venue.venueId]) {
              <div class="px-4 pb-4 -mt-1">
                <div class="bg-white/20 rounded-xl p-3 text-sm">
                  Visits are automatically logged after you've been here for 10 minutes.
                  This helps filter out brief stops.
                </div>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class PendingVisitIndicatorComponent implements OnInit, OnDestroy {
  private readonly geofenceService = inject(GeofenceService);
  private readonly visitTrackerService = inject(VisitTrackerService);
  private readonly destroy$ = new Subject<void>();

  // Raw pending data from geofence service
  private readonly rawPending = signal<Array<{ venueId: string; enteredAt: number }>>([]);

  // Track which venues have info expanded
  readonly infoVisible = signal<Record<string, boolean>>({});

  // Processed pending venues with names and logged status
  readonly pendingVenues = computed<PendingVenue[]>(() => {
    const pending = this.rawPending();
    const now = Date.now();
    const threshold = this.geofenceService.getDwellThresholdMs();
    const infoState = this.infoVisible();

    return pending.map((p) => {
      const venue = this.visitTrackerService.getVenue(p.venueId);
      const elapsed = now - p.enteredAt;

      return {
        venueId: p.venueId,
        venueName: venue?.name || 'Unknown Venue',
        enteredAt: p.enteredAt,
        isLogged: elapsed >= threshold,
        showInfo: infoState[p.venueId] || false,
      };
    });
  });

  ngOnInit(): void {
    // Initial check
    this.updatePendingVenues();

    // Subscribe to geofence transitions to update immediately
    this.geofenceService.getGeofenceTransitions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updatePendingVenues());

    // Check every 10 seconds for state changes (for isLogged status updates)
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updatePendingVenues();
      });
  }

  toggleInfo(venueId: string): void {
    this.infoVisible.update((current) => ({
      ...current,
      [venueId]: !current[venueId],
    }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updatePendingVenues(): void {
    this.rawPending.set(this.geofenceService.getPendingGeofences());
  }
}
