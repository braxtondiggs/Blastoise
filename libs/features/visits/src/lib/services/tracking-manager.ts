/**
 * Tracking Manager Service
 *
 * Orchestrates location tracking based on user preferences:
 * - Starts/stops tracking when preferences change
 * - Manages foreground vs background tracking
 * - Handles app lifecycle (resume/pause)
 * - Coordinates with GeofenceService and VisitTrackerService
 */

import { Injectable, inject, OnDestroy } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { GeofenceService } from './geofence';
import { VisitTrackerService } from './visit-tracker';
import { PreferencesService } from '@blastoise/features-settings';
import { VenuesApiService } from '@blastoise/data-frontend';
import { Venue } from '@blastoise/shared';
import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation';

// Register the background geolocation plugin (native only)
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

@Injectable({
  providedIn: 'root',
})
export class TrackingManagerService implements OnDestroy {
  private readonly geofenceService = inject(GeofenceService);
  private readonly visitTrackerService = inject(VisitTrackerService);
  private readonly preferencesService = inject(PreferencesService);
  private readonly venueService = inject(VenuesApiService);

  private preferencesSubscription: Subscription | null = null;
  private backgroundWatcherId: string | null = null;
  private isInitialized = false;
  private isTrackingActive = false;
  private isPaused = false; // Track if we're paused (vs fully stopped)

  /**
   * Initialize tracking manager
   * Should be called once on app startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to preference changes
    this.preferencesSubscription = this.preferencesService
      .getPreferences()
      .pipe(
        map((prefs) => ({
          locationEnabled: prefs.locationTrackingEnabled,
          backgroundEnabled: prefs.backgroundTrackingEnabled,
        })),
        distinctUntilChanged(
          (prev, curr) =>
            prev.locationEnabled === curr.locationEnabled &&
            prev.backgroundEnabled === curr.backgroundEnabled
        )
      )
      .subscribe(async (settings) => {
        await this.handlePreferencesChange(settings);
      });

    // Listen for app state changes (foreground/background)
    if (Capacitor.isNativePlatform()) {
      this.setupAppStateListener();
    }

    this.isInitialized = true;
  }

  /**
   * Handle preference changes
   */
  private async handlePreferencesChange(settings: {
    locationEnabled: boolean;
    backgroundEnabled: boolean;
  }): Promise<void> {
    if (settings.locationEnabled) {
      await this.startTracking(settings.backgroundEnabled);
    } else {
      await this.stopTracking();
    }
  }

  /**
   * Start location tracking
   */
  async startTracking(enableBackground = false): Promise<void> {
    if (this.isTrackingActive) {
      return;
    }

    try {
      // Load nearby venues to track
      const venues = await this.loadNearbyVenues();

      if (venues.length === 0) {
        return;
      }

      // Start the visit tracker (which starts geofence service)
      await this.visitTrackerService.startTracking(venues);

      // If background tracking enabled on native platform, configure it
      if (enableBackground && Capacitor.isNativePlatform()) {
        await this.enableBackgroundTracking();
      }

      this.isTrackingActive = true;
    } catch (error) {
      console.error('[TrackingManager] Failed to start tracking:', error);
    }
  }

  /**
   * Stop location tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isTrackingActive && !this.isPaused) {
      return;
    }

    try {
      await this.visitTrackerService.stopTracking();

      if (Capacitor.isNativePlatform()) {
        await this.disableBackgroundTracking();
      }

      this.isTrackingActive = false;
      this.isPaused = false; // Reset paused state on explicit stop
    } catch (error) {
      console.error('[TrackingManager] Failed to stop tracking:', error);
    }
  }

  /**
   * Load nearby venues to track
   * For now, loads all venues - in production, filter by proximity
   */
  private async loadNearbyVenues(): Promise<Venue[]> {
    try {
      // Get current position to find nearby venues
      const position = await this.geofenceService.getCurrentPosition();

      if (!position) {
        console.warn('[TrackingManager] No position available');
        return [];
      }

      console.log(`[TrackingManager] Fetching venues near (${position.latitude}, ${position.longitude})`);

      // Load venues near current location (within 50km radius)
      const result = await this.venueService
        .nearby({
          latitude: position.latitude,
          longitude: position.longitude,
          radius_km: 50,
          limit: 100,
        })
        .toPromise();

      console.log(`[TrackingManager] API response received, data count: ${result?.data?.length ?? 'undefined'}`);

      // Map API response to Venue format for geofencing
      // API returns flat format: { id, latitude, longitude, distance, ... }
      const now = new Date().toISOString();
      const rawData = result?.data || [];

      const venues = rawData
        .filter((v: any) => {
          // Filter out invalid venues
          if (!v || !v.id || v.latitude == null || v.longitude == null) {
            console.warn('[TrackingManager] Skipping invalid venue:', v?.name || 'unknown');
            return false;
          }
          return true;
        })
        .map((v: any) => ({
          id: v.id,
          name: v.name,
          venue_type: v.venue_type,
          latitude: Number(v.latitude),
          longitude: Number(v.longitude),
          city: v.city,
          state: v.state,
          source: v.source || ('osm' as const),
          created_at: now,
          updated_at: now,
        }));

      console.log(`[TrackingManager] Loaded ${venues.length} venues for geofencing`);

      if (venues.length > 0) {
        console.log(`[TrackingManager] First venue: ${venues[0].name} at (${venues[0].latitude}, ${venues[0].longitude})`);
      }

      return venues;
    } catch (error) {
      console.error('[TrackingManager] Failed to load venues:', error);
      return [];
    }
  }

  /**
   * Enable background location tracking (native only)
   */
  private async enableBackgroundTracking(): Promise<void> {
    try {
      this.backgroundWatcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Blastoise is tracking brewery visits in the background',
          backgroundTitle: 'Location Tracking Active',
          requestPermissions: true,
          stale: false,
          distanceFilter: 50, // Update every 50 meters
        },
        (location: Location | undefined, error: CallbackError | undefined) => {
          if (error) {
            return;
          }

          if (location) {
            // Update geofence service with new position
            this.geofenceService.updatePosition({
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }
        }
      );
    } catch (error) {
      console.error('[TrackingManager] Failed to enable background tracking:', error);
    }
  }

  /**
   * Disable background location tracking
   */
  private async disableBackgroundTracking(): Promise<void> {
    try {
      if (!this.backgroundWatcherId) {
        return;
      }

      await BackgroundGeolocation.removeWatcher({ id: this.backgroundWatcherId });
      this.backgroundWatcherId = null;
    } catch (error) {
      console.error('[TrackingManager] Failed to disable background tracking:', error);
    }
  }

  /**
   * Setup app state listener for foreground/background transitions
   */
  private setupAppStateListener(): void {
    App.addListener('appStateChange', async ({ isActive }) => {
      const prefs = this.preferencesService.getCurrentPreferences();

      if (isActive) {
        // App came to foreground
        if (prefs.locationTrackingEnabled) {
          if (this.isPaused) {
            // Resume from paused state (preserves visit state)
            await this.resumeTracking();
          } else if (!this.isTrackingActive) {
            // Fresh start
            await this.startTracking(prefs.backgroundTrackingEnabled);
          }
        }
      } else {
        // App went to background
        if (!prefs.backgroundTrackingEnabled && this.isTrackingActive) {
          // PAUSE (not stop) tracking if background tracking is disabled
          // This preserves the active visit state
          await this.pauseTracking();
        }
      }
    });
  }

  /**
   * Pause tracking (for background mode) - preserves visit state
   */
  private async pauseTracking(): Promise<void> {
    if (!this.isTrackingActive || this.isPaused) {
      return;
    }

    try {
      await this.visitTrackerService.pauseTracking();

      if (Capacitor.isNativePlatform()) {
        await this.disableBackgroundTracking();
      }

      this.isPaused = true;
      this.isTrackingActive = false;
      console.log('[TrackingManager] Paused tracking (visit state preserved)');
    } catch (error) {
      console.error('[TrackingManager] Failed to pause tracking:', error);
    }
  }

  /**
   * Resume tracking from paused state
   */
  private async resumeTracking(): Promise<void> {
    if (!this.isPaused) {
      return;
    }

    try {
      await this.visitTrackerService.resumeTracking();

      this.isPaused = false;
      this.isTrackingActive = true;
      console.log('[TrackingManager] Resumed tracking (visit state restored)');
    } catch (error) {
      console.error('[TrackingManager] Failed to resume tracking:', error);
      // If resume fails, try a fresh start
      this.isPaused = false;
      const prefs = this.preferencesService.getCurrentPreferences();
      await this.startTracking(prefs.backgroundTrackingEnabled);
    }
  }

  /**
   * Check if tracking is currently active
   */
  isTracking(): boolean {
    return this.isTrackingActive;
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    if (this.preferencesSubscription) {
      this.preferencesSubscription.unsubscribe();
    }
  }
}
