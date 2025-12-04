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

const DEFAULT_GEOFENCE_RADIUS_METERS = 50; // 50 meters - tighter radius to avoid overlapping venues
const DWELL_TIME_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes minimum dwell time
const LOCATION_UPDATE_INTERVAL_MS = 30 * 1000; // 30 seconds
const HIGH_ACCURACY = true;
const TIMEOUT_MS = 10000; // 10 seconds
const GEOFENCE_STATE_KEY = 'blastoise_geofence_state';

interface ActiveGeofence extends GeofenceConfig {
  enteredAt?: number; // Timestamp when geofence was entered
  lastCheck?: number; // Last time we checked if still inside
}

interface PersistedGeofenceState {
  venueId: string;
  enteredAt: number;
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
   * Pause tracking (for background mode) - keeps geofence state
   * Use this when app goes to background to avoid losing visit state
   */
  async pauseTracking(): Promise<void> {
    if (this.watchId) {
      await this.geolocationProvider.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.locationCheckInterval) {
      clearInterval(this.locationCheckInterval);
      this.locationCheckInterval = null;
    }

    // Persist state before pausing (in case app gets killed)
    this.persistState();

    this.isTrackingSignal.set(false);
    // NOTE: We intentionally DO NOT clear activeGeofencesSignal here
    // This preserves the geofence entry state across background transitions
  }

  /**
   * Resume tracking (after pause) - reuses existing geofence state
   * Use this when app returns from background to continue existing visits
   */
  async resumeTracking(): Promise<void> {
    // Check permissions first
    const permission = await this.checkPermissions();
    if (permission !== LocationPermission.GRANTED) {
      throw new Error('Location permission not granted');
    }

    // Start watching position (geofences are already registered)
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

      // Restart interval-based check
      this.locationCheckInterval = setInterval(() => {
        this.performLocationCheck();
      }, LOCATION_UPDATE_INTERVAL_MS);
    } catch (error) {
      console.error('Error resuming location tracking:', error);
      throw error;
    }
  }

  /**
   * Check if there are active geofences (user currently inside venues)
   */
  hasActiveGeofences(): boolean {
    const activeGeofences = this.activeGeofencesSignal();
    for (const geofence of activeGeofences.values()) {
      if (geofence.enteredAt !== undefined) {
        return true;
      }
    }
    return false;
  }

  /**
   * Register geofences for venues
   */
  private registerGeofences(venues: Venue[]): void {
    const activeGeofences = new Map<string, ActiveGeofence>();

    // Load persisted state from previous session
    const persistedState = this.loadPersistedState();
    const persistedMap = new Map(persistedState.map(s => [s.venueId, s.enteredAt]));

    for (const venue of venues) {
      const geofence: ActiveGeofence = {
        venue_id: venue.id,
        center: {
          latitude: venue.latitude,
          longitude: venue.longitude,
        },
        radius_meters: DEFAULT_GEOFENCE_RADIUS_METERS,
      };

      // Restore enteredAt from persisted state if available
      const persistedEnteredAt = persistedMap.get(venue.id);
      if (persistedEnteredAt) {
        geofence.enteredAt = persistedEnteredAt;
        geofence.lastCheck = Date.now();
      }

      activeGeofences.set(venue.id, geofence);
    }

    this.activeGeofencesSignal.set(activeGeofences);
  }

  /**
   * Load persisted geofence state from localStorage
   * Filters out entries older than 24 hours to prevent stale state
   */
  private loadPersistedState(): PersistedGeofenceState[] {
    try {
      const stored = localStorage.getItem(GEOFENCE_STATE_KEY);
      if (!stored) {
        return [];
      }
      const state = JSON.parse(stored) as PersistedGeofenceState[];

      // Filter out entries older than 24 hours
      const maxAge = 24 * 60 * 60 * 1000;
      const now = Date.now();
      return state.filter(s => (now - s.enteredAt) < maxAge);
    } catch {
      return [];
    }
  }

  /**
   * Save current geofence state to localStorage
   */
  private persistState(): void {
    try {
      const activeGeofences = this.activeGeofencesSignal();
      const state: PersistedGeofenceState[] = [];

      activeGeofences.forEach((geofence, venueId) => {
        if (geofence.enteredAt !== undefined) {
          state.push({
            venueId,
            enteredAt: geofence.enteredAt,
          });
        }
      });

      localStorage.setItem(GEOFENCE_STATE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clear persisted geofence state
   */
  clearPersistedState(): void {
    try {
      localStorage.removeItem(GEOFENCE_STATE_KEY);
    } catch {
      // Ignore storage errors
    }
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

    // Log position check periodically (every 10 checks to avoid spam)
    if (Math.random() < 0.1) {
      console.log(`[GeofenceService] Checking position (${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}) against ${activeGeofences.size} geofences`);
    }

    let nearestVenue: { name: string; distance: number } | null = null;

    activeGeofences.forEach((geofence, venueId) => {
      const isInside = GeolocationHelper.isWithinGeofence(position, geofence);
      const wasInside = geofence.enteredAt !== undefined;

      // Track nearest venue for debugging
      const distance = GeolocationHelper.calculateDistance(position, geofence.center);
      if (!nearestVenue || distance < nearestVenue.distance) {
        nearestVenue = { name: venueId, distance };
      }

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

    // Log nearest venue periodically
    if (nearestVenue && Math.random() < 0.1) {
      console.log(`[GeofenceService] Nearest venue: ${(nearestVenue as any).name} at ${(nearestVenue as any).distance.toFixed(0)}m (geofence radius: ${DEFAULT_GEOFENCE_RADIUS_METERS}m)`);
    }
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

    // Persist state to survive app restarts
    this.persistState();

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
    // Keep state so user remains "inside" for pending indicator
    // Only truly exit when dwell threshold is met
    if (dwellTime < DWELL_TIME_THRESHOLD_MS) {
      console.log(
        `Geofence exit for venue ${venueId} ignored (dwell time ${Math.round(
          dwellTime / 1000 / 60
        )}m < 10m threshold) - keeping pending state`
      );
      // DON'T reset state - keep enteredAt so pending indicator stays visible
      // The user is likely still in the area, just GPS fluctuation
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

    // Persist state to survive app restarts
    this.persistState();
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
   * Get pending geofences with entry timestamps
   * Returns venues where user is currently inside, with time they entered
   */
  getPendingGeofences(): Array<{ venueId: string; enteredAt: number }> {
    const activeGeofences = this.activeGeofencesSignal();
    const pending: Array<{ venueId: string; enteredAt: number }> = [];

    activeGeofences.forEach((geofence, venueId) => {
      if (geofence.enteredAt !== undefined) {
        pending.push({
          venueId,
          enteredAt: geofence.enteredAt,
        });
      }
    });

    return pending;
  }

  /**
   * Get the dwell time threshold in milliseconds
   */
  getDwellThresholdMs(): number {
    return DWELL_TIME_THRESHOLD_MS;
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
