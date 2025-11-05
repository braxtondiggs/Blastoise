import { Injectable, signal, inject } from '@angular/core';
import { GeofenceService } from './geofence';
import { VisitSyncService } from './visit-sync';
import { AuthService } from '@blastoise/features-auth';
import { NotificationService } from '@blastoise/shared';
import {
  Visit,
  Venue,
  GeofenceEvent,
  GeofenceTransition,
} from '@blastoise/shared';
import { roundTimestampToISO } from '@blastoise/shared';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class VisitTrackerService {
  private readonly geofenceService = inject(GeofenceService);
  private readonly authService = inject(AuthService);
  private readonly visitSyncService = inject(VisitSyncService);
  private readonly notificationService = inject(NotificationService);

  // Active visits (in progress)
  private readonly activeVisitsSignal = signal<Map<string, Visit>>(new Map());
  readonly activeVisits = this.activeVisitsSignal.asReadonly();

  // Visit events stream
  private readonly visitEvents$ = new BehaviorSubject<{
    type: 'arrival' | 'departure';
    visit: Visit;
  } | null>(null);

  private geofenceSubscription: Subscription | null = null;
  private venuesMap = new Map<string, Venue>();

  // Visit detection success rate tracking
  private detectionMetrics = {
    totalGeofenceEvents: 0,
    successfulVisits: 0,
    failedDetections: 0,
    manualVisits: 0,
    lastReset: new Date(),
  };

  /**
   * Start tracking visits for given venues
   */
  async startTracking(venues: Venue[]): Promise<void> {
    // Build venues map for quick lookup
    this.venuesMap.clear();
    venues.forEach((venue) => this.venuesMap.set(venue.id, venue));

    // Start geofence tracking
    await this.geofenceService.startTracking(venues);

    // Subscribe to geofence transitions
    this.geofenceSubscription = this.geofenceService
      .getGeofenceTransitions()
      .subscribe((transition) => {
        this.handleGeofenceTransition(transition);
      });
  }

  /**
   * Stop tracking visits
   */
  async stopTracking(): Promise<void> {
    await this.geofenceService.stopTracking();

    if (this.geofenceSubscription) {
      this.geofenceSubscription.unsubscribe();
      this.geofenceSubscription = null;
    }

    // Clear active visits (but they should already be saved locally)
    this.activeVisitsSignal.set(new Map());
  }

  /**
   * Handle geofence transition events
   */
  private handleGeofenceTransition(transition: GeofenceTransition): void {
    // Track all geofence events
    this.detectionMetrics.totalGeofenceEvents++;

    const venue = this.venuesMap.get(transition.venue_id);

    if (!venue) {
      console.warn(
        `Geofence transition for unknown venue: ${transition.venue_id}`
      );
      this.detectionMetrics.failedDetections++;
      return;
    }

    if (transition.event === GeofenceEvent.ENTER) {
      this.handleArrival(venue, transition);
    } else if (transition.event === GeofenceEvent.EXIT) {
      this.handleDeparture(venue, transition);
    }
  }

  /**
   * Handle arrival at venue (T086: Implement arrival detection)
   */
  private handleArrival(venue: Venue, transition: GeofenceTransition): void {
    const userId = this.authService.getUserId();

    if (!userId) {
      console.warn('Cannot create visit: user not authenticated');
      return;
    }

    // Check if already have an active visit for this venue
    const activeVisits = this.activeVisitsSignal();
    if (activeVisits.has(venue.id)) {
      console.log(`Already have active visit for venue ${venue.id}`);
      return;
    }

    // Create new visit with rounded timestamp (T088: Timestamp rounding)
    const arrivalTime = roundTimestampToISO(transition.timestamp, 15);

    const visit: Visit = {
      id: crypto.randomUUID(),
      user_id: userId,
      venue_id: venue.id,
      arrival_time: arrivalTime,
      departure_time: undefined,
      duration_minutes: undefined,
      is_active: true,
      detection_method: 'auto',
      synced: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to active visits
    const updatedActiveVisits = new Map(activeVisits);
    updatedActiveVisits.set(venue.id, visit);
    this.activeVisitsSignal.set(updatedActiveVisits);

    // Queue for sync (saves to local storage and triggers sync)
    this.visitSyncService.queueVisitForSync(visit);

    // Emit arrival event
    this.visitEvents$.next({
      type: 'arrival',
      visit,
    });

    // Send visit detected notification
    this.notificationService.notifyVisitDetected(venue.name, venue.id);

    // Track successful visit detection
    this.detectionMetrics.successfulVisits++;

    console.log(
      `Visit started at ${venue.name} (arrival: ${visit.arrival_time})`
    );
  }

  /**
   * Handle departure from venue (T087: Implement departure detection)
   */
  private handleDeparture(
    venue: Venue,
    transition: GeofenceTransition
  ): void {
    const activeVisits = this.activeVisitsSignal();
    const activeVisit = activeVisits.get(venue.id);

    if (!activeVisit) {
      console.warn(`No active visit found for venue ${venue.id}`);
      return;
    }

    // Update visit with rounded departure time (T088: Timestamp rounding)
    const departureTime = roundTimestampToISO(transition.timestamp, 15);
    const arrivalMs = new Date(activeVisit.arrival_time).getTime();
    const departureMs = new Date(departureTime).getTime();
    const durationMinutes = Math.round((departureMs - arrivalMs) / (1000 * 60));

    const updatedVisit: Visit = {
      ...activeVisit,
      departure_time: departureTime,
      duration_minutes: durationMinutes,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    // Remove from active visits
    const updatedActiveVisits = new Map(activeVisits);
    updatedActiveVisits.delete(venue.id);
    this.activeVisitsSignal.set(updatedActiveVisits);

    // Queue updated visit for sync (saves to local storage and triggers sync)
    this.visitSyncService.queueVisitForSync(updatedVisit);

    // Emit departure event
    this.visitEvents$.next({
      type: 'departure',
      visit: updatedVisit,
    });

    // Send visit ended notification
    this.notificationService.notifyVisitEnded(venue.name, durationMinutes, updatedVisit.id);

    console.log(
      `Visit ended at ${venue.name} (departure: ${updatedVisit.departure_time}, duration: ${durationMinutes}m)`
    );
  }

  /**
   * Get observable stream of visit events (arrivals and departures)
   */
  getVisitEvents(): Observable<{ type: 'arrival' | 'departure'; visit: Visit }> {
    return this.visitEvents$.asObservable().pipe(
      filter((event): event is { type: 'arrival' | 'departure'; visit: Visit } =>
        event !== null
      )
    );
  }

  /**
   * Get current active visit for a venue
   */
  getActiveVisit(venueId: string): Visit | undefined {
    return this.activeVisitsSignal().get(venueId);
  }

  /**
   * Get all current active visits
   */
  getAllActiveVisits(): Visit[] {
    return Array.from(this.activeVisitsSignal().values());
  }

  /**
   * Check if there are any active visits
   */
  hasActiveVisits(): boolean {
    return this.activeVisitsSignal().size > 0;
  }

  /**
   * Manually end an active visit (for manual mode or edge cases)
   */
  async endVisit(venueId: string): Promise<Visit | null> {
    const activeVisits = this.activeVisitsSignal();
    const activeVisit = activeVisits.get(venueId);

    if (!activeVisit) {
      return null;
    }

    const departureTime = roundTimestampToISO(new Date(), 15);
    const arrivalMs = new Date(activeVisit.arrival_time).getTime();
    const departureMs = new Date(departureTime).getTime();
    const durationMinutes = Math.round((departureMs - arrivalMs) / (1000 * 60));

    const updatedVisit: Visit = {
      ...activeVisit,
      departure_time: departureTime,
      duration_minutes: durationMinutes,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    // Remove from active visits
    const updatedActiveVisits = new Map(activeVisits);
    updatedActiveVisits.delete(venueId);
    this.activeVisitsSignal.set(updatedActiveVisits);

    // Queue for sync
    this.visitSyncService.queueVisitForSync(updatedVisit);

    // Emit departure event
    this.visitEvents$.next({
      type: 'departure',
      visit: updatedVisit,
    });

    return updatedVisit;
  }

  /**
   * Manually create a visit (for manual detection mode)
   */
  createManualVisit(venueId: string): Visit | null {
    const venue = this.venuesMap.get(venueId);
    if (!venue) {
      console.warn(`Cannot create manual visit: venue ${venueId} not found`);
      return null;
    }

    const userId = this.authService.getUserId();
    if (!userId) {
      console.warn('Cannot create visit: user not authenticated');
      return null;
    }

    const arrivalTime = roundTimestampToISO(new Date(), 15);

    const visit: Visit = {
      id: crypto.randomUUID(),
      user_id: userId,
      venue_id: venueId,
      arrival_time: arrivalTime,
      departure_time: undefined,
      duration_minutes: undefined,
      is_active: true,
      detection_method: 'manual',
      synced: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to active visits
    const updatedActiveVisits = new Map(this.activeVisitsSignal());
    updatedActiveVisits.set(venueId, visit);
    this.activeVisitsSignal.set(updatedActiveVisits);

    // Queue for sync
    this.visitSyncService.queueVisitForSync(visit);

    // Emit arrival event
    this.visitEvents$.next({
      type: 'arrival',
      visit,
    });

    // Track manual visit creation
    this.detectionMetrics.manualVisits++;

    return visit;
  }

  /**
   * Get visit detection success rate metrics
   */
  getDetectionMetrics(): {
    totalGeofenceEvents: number;
    successfulVisits: number;
    failedDetections: number;
    manualVisits: number;
    successRate: number;
    lastReset: Date;
  } {
    const successRate =
      this.detectionMetrics.totalGeofenceEvents > 0
        ? (this.detectionMetrics.successfulVisits / this.detectionMetrics.totalGeofenceEvents) * 100
        : 0;

    return {
      ...this.detectionMetrics,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
    };
  }

  /**
   * Reset detection metrics
   */
  resetDetectionMetrics(): void {
    this.detectionMetrics = {
      totalGeofenceEvents: 0,
      successfulVisits: 0,
      failedDetections: 0,
      manualVisits: 0,
      lastReset: new Date(),
    };
  }
}
