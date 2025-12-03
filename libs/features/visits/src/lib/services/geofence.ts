import { Injectable, signal, inject } from '@angular/core';
import {
  Coordinates,
  GeofenceConfig,
  GeofenceEvent,
  GeofenceTransition,
  LocationPermission,
  GeolocationHelper,
  GeolocationProvider,
} from '@blastoise/shared';
import { Venue } from '@blastoise/shared';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

const DEFAULT_GEOFENCE_RADIUS_METERS = 150; // 150 meters for typical venues
const DWELL_TIME_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes minimum dwell time
const LOCATION_UPDATE_INTERVAL_MS = 30 * 1000; // 30 seconds
const HIGH_ACCURACY = true;
const TIMEOUT_MS = 10000; // 10 seconds

interface ActiveGeofence extends GeofenceConfig {
  enteredAt?: number; // Timestamp when geofence was entered
  lastCheck?: number; // Last time we checked if still inside
}

@Injectable({
  providedIn: 'root',
})
export class GeofenceService {
  // Inject the geolocation provider (provided by app)
  private readonly geolocationProvider = inject(GeolocationProvider);

  // Reactive state
  private readonly currentPositionSignal = signal<Coordinates | null>(null);
  private readonly activeGeofencesSignal = signal<Map<string, ActiveGeofence>>(
    new Map()
  );
  private readonly permissionStatusSignal = signal<LocationPermission>(
    LocationPermission.NOT_DETERMINED
  );
  private readonly isTrackingSignal = signal<boolean>(false);

  // Computed signals
  readonly currentPosition = this.currentPositionSignal.asReadonly();
  readonly isTracking = this.isTrackingSignal.asReadonly();
  readonly permissionStatus = this.permissionStatusSignal.asReadonly();

  // Observable streams
  private readonly geofenceTransitions$ = new BehaviorSubject<GeofenceTransition | null>(
    null
  );
  private watchId: string | null = null;
  private locationCheckInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<LocationPermission> {
    try {
      const status = await this.geolocationProvider.requestPermissions();
      this.permissionStatusSignal.set(status);
      return status;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      this.permissionStatusSignal.set(LocationPermission.DENIED);
      return LocationPermission.DENIED;
    }
  }

  /**
   * Check current permission status
   */
  async checkPermissions(): Promise<LocationPermission> {
    try {
      const status = await this.geolocationProvider.checkPermissions();
      this.permissionStatusSignal.set(status);
      return status;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return LocationPermission.NOT_DETERMINED;
    }
  }

  /**
   * Get current position once
   */
  async getCurrentPosition(): Promise<Coordinates | null> {
    try {
      const position = await this.geolocationProvider.getCurrentPosition();

      if (!position) {
        return null;
      }

      this.currentPositionSignal.set(position.coords);
      return position.coords;
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  }

  /**
   * Start tracking user location and monitoring geofences
   */
  async startTracking(venues: Venue[]): Promise<void> {
    // Check permissions first
    const permission = await this.checkPermissions();
    if (permission !== LocationPermission.GRANTED) {
      throw new Error('Location permission not granted');
    }

    // Register geofences for all venues
    this.registerGeofences(venues);

    // Start watching position
    try {
      this.watchId = await this.geolocationProvider.watchPosition(
        (position, error) => {
          if (error) {
            console.error('Error watching position:', error);
            return;
          }

          if (position) {
            this.currentPositionSignal.set(position.coords);
            this.checkGeofences(position.coords, position.timestamp);
          }
        },
        {
          enableHighAccuracy: HIGH_ACCURACY,
          timeout: TIMEOUT_MS,
          maximumAge: 0,
        }
      );

      this.isTrackingSignal.set(true);

      // Also set up interval-based check (backup for platforms without continuous watch)
      this.locationCheckInterval = setInterval(() => {
        this.performLocationCheck();
      }, LOCATION_UPDATE_INTERVAL_MS);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking location
   */
  async stopTracking(): Promise<void> {
    if (this.watchId) {
      await this.geolocationProvider.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.locationCheckInterval) {
      clearInterval(this.locationCheckInterval);
      this.locationCheckInterval = null;
    }

    this.isTrackingSignal.set(false);
    this.activeGeofencesSignal.set(new Map());
  }

  /**
   * Register geofences for venues
   */
  private registerGeofences(venues: Venue[]): void {
    const activeGeofences = new Map<string, ActiveGeofence>();

    for (const venue of venues) {
      const geofence: ActiveGeofence = {
        venue_id: venue.id,
        center: {
          latitude: venue.latitude,
          longitude: venue.longitude,
        },
        radius_meters: DEFAULT_GEOFENCE_RADIUS_METERS,
      };
      activeGeofences.set(venue.id, geofence);
    }

    this.activeGeofencesSignal.set(activeGeofences);
  }

  /**
   * Add a single geofence for a venue
   */
  addGeofence(venue: Venue): void {
    const activeGeofences = new Map(this.activeGeofencesSignal());
    const geofence: ActiveGeofence = {
      venue_id: venue.id,
      center: {
        latitude: venue.latitude,
        longitude: venue.longitude,
      },
      radius_meters: DEFAULT_GEOFENCE_RADIUS_METERS,
    };
    activeGeofences.set(venue.id, geofence);
    this.activeGeofencesSignal.set(activeGeofences);
  }

  /**
   * Remove geofence for a venue
   */
  removeGeofence(venueId: string): void {
    const activeGeofences = new Map(this.activeGeofencesSignal());
    activeGeofences.delete(venueId);
    this.activeGeofencesSignal.set(activeGeofences);
  }

  /**
   * Perform location check (called periodically)
   */
  private async performLocationCheck(): Promise<void> {
    const position = await this.getCurrentPosition();
    if (position) {
      this.checkGeofences(position, Date.now());
    }
  }

  /**
   * Check all geofences against current position
   */
  private checkGeofences(position: Coordinates, timestamp: number): void {
    const activeGeofences = this.activeGeofencesSignal();

    activeGeofences.forEach((geofence, venueId) => {
      const isInside = GeolocationHelper.isWithinGeofence(position, geofence);
      const wasInside = geofence.enteredAt !== undefined;

      if (isInside && !wasInside) {
        // ENTER event
        this.handleGeofenceEnter(venueId, geofence, position, timestamp);
      } else if (!isInside && wasInside) {
        // EXIT event
        this.handleGeofenceExit(venueId, geofence, position, timestamp);
      } else if (isInside && wasInside) {
        // Update last check time
        geofence.lastCheck = timestamp;
      }
    });
  }

  /**
   * Handle geofence enter event
   */
  private handleGeofenceEnter(
    venueId: string,
    geofence: ActiveGeofence,
    position: Coordinates,
    timestamp: number
  ): void {
    // Update geofence state
    geofence.enteredAt = timestamp;
    geofence.lastCheck = timestamp;

    // Emit ENTER transition
    const transition: GeofenceTransition = {
      venue_id: venueId,
      event: GeofenceEvent.ENTER,
      timestamp: new Date(timestamp).toISOString(),
      location: position,
      accuracy: 10, // TODO: Get actual accuracy from position
    };

    this.geofenceTransitions$.next(transition);
  }

  /**
   * Handle geofence exit event (with dwell time filtering)
   */
  private handleGeofenceExit(
    venueId: string,
    geofence: ActiveGeofence,
    position: Coordinates,
    timestamp: number
  ): void {
    if (!geofence.enteredAt) {
      return; // Should never happen, but guard against it
    }

    const dwellTime = timestamp - geofence.enteredAt;

    // Filter out brief visits (< 10 minutes)
    if (dwellTime < DWELL_TIME_THRESHOLD_MS) {
      console.log(
        `Geofence exit for venue ${venueId} ignored (dwell time ${Math.round(
          dwellTime / 1000 / 60
        )}m < 10m threshold)`
      );
      // Reset state without emitting event
      delete geofence.enteredAt;
      delete geofence.lastCheck;
      return;
    }

    // Emit EXIT transition
    const transition: GeofenceTransition = {
      venue_id: venueId,
      event: GeofenceEvent.EXIT,
      timestamp: new Date(timestamp).toISOString(),
      location: position,
      accuracy: 10, // TODO: Get actual accuracy from position
    };

    this.geofenceTransitions$.next(transition);

    // Reset geofence state
    delete geofence.enteredAt;
    delete geofence.lastCheck;
  }

  /**
   * Get observable stream of geofence transitions
   */
  getGeofenceTransitions(): Observable<GeofenceTransition> {
    return this.geofenceTransitions$.asObservable().pipe(
      filter((transition): transition is GeofenceTransition => transition !== null)
    );
  }

  /**
   * Check if currently inside any geofence
   */
  isInsideAnyGeofence(): boolean {
    const activeGeofences = this.activeGeofencesSignal();
    for (const geofence of activeGeofences.values()) {
      if (geofence.enteredAt !== undefined) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get list of currently active geofences (user is inside)
   */
  getActiveGeofenceVenueIds(): string[] {
    const activeGeofences = this.activeGeofencesSignal();
    const activeVenueIds: string[] = [];

    activeGeofences.forEach((geofence, venueId) => {
      if (geofence.enteredAt !== undefined) {
        activeVenueIds.push(venueId);
      }
    });

    return activeVenueIds;
  }

  /**
   * Calculate distance to venue
   */
  calculateDistanceToVenue(venue: Venue): number | null {
    const currentPos = this.currentPositionSignal();
    if (!currentPos) {
      return null;
    }

    return GeolocationHelper.calculateDistance(currentPos, {
      latitude: venue.latitude,
      longitude: venue.longitude,
    });
  }

  /**
   * Update position from external source (e.g., background tracking)
   * This allows background location updates to trigger geofence checks
   */
  updatePosition(coords: { latitude: number; longitude: number }): void {
    const position: Coordinates = {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    this.currentPositionSignal.set(position);
    this.checkGeofences(position, Date.now());
  }
}
