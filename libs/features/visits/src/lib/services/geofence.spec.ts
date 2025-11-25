import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { GeofenceService } from './geofence';
import {
  GeolocationProvider,
  LocationPermission,
  GeofenceEvent,
  Venue,
  Coordinates,
  GeolocationPosition,
} from '@blastoise/shared';
import { firstValueFrom, take } from 'rxjs';

// Mock GeolocationProvider
class MockGeolocationProvider extends GeolocationProvider {
  private mockPosition: GeolocationPosition | null = null;
  private mockPermission: LocationPermission = LocationPermission.GRANTED;
  private watchCallbacks = new Map<
    string,
    (position: GeolocationPosition | null, error?: Error) => void
  >();

  setMockPosition(coords: Coordinates, timestamp = Date.now()) {
    this.mockPosition = {
      coords,
      timestamp,
      accuracy: 10,
    };
  }

  setMockPermission(permission: LocationPermission) {
    this.mockPermission = permission;
  }

  triggerPositionUpdate() {
    this.watchCallbacks.forEach((callback) => {
      callback(this.mockPosition);
    });
  }

  async requestPermissions(): Promise<LocationPermission> {
    return this.mockPermission;
  }

  async checkPermissions(): Promise<LocationPermission> {
    return this.mockPermission;
  }

  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    return this.mockPosition;
  }

  async watchPosition(
    callback: (position: GeolocationPosition | null, error?: Error) => void
  ): Promise<string> {
    const watchId = crypto.randomUUID();
    this.watchCallbacks.set(watchId, callback);
    return watchId;
  }

  async clearWatch(watchId: string): Promise<void> {
    this.watchCallbacks.delete(watchId);
  }
}

describe('GeofenceService', () => {
  let spectator: SpectatorService<GeofenceService>;
  let mockProvider: MockGeolocationProvider;

  const mockVenue: Venue = {
    id: 'venue-1',
    name: 'Test Brewery',
    venue_type: 'brewery',
    source: 'manual',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94102',
    country: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const createService = createServiceFactory({
    service: GeofenceService,
    providers: [
      {
        provide: GeolocationProvider,
        useFactory: () => {
          mockProvider = new MockGeolocationProvider();
          return mockProvider;
        },
      },
    ],
  });

  beforeEach(() => {
    spectator = createService();
  });

  afterEach(() => {
    spectator.service.stopTracking();
  });

  describe('Permission Management', () => {
    it('should request location permissions', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
      const status = await spectator.service.requestPermissions();
      expect(status).toBe(LocationPermission.GRANTED);
      expect(spectator.service.permissionStatus()).toBe(LocationPermission.GRANTED);
    });

    it('should check current permission status', async () => {
      mockProvider.setMockPermission(LocationPermission.DENIED);
      const status = await spectator.service.checkPermissions();
      expect(status).toBe(LocationPermission.DENIED);
      expect(spectator.service.permissionStatus()).toBe(LocationPermission.DENIED);
    });

    it('should throw error when starting tracking without permission', async () => {
      mockProvider.setMockPermission(LocationPermission.DENIED);
      await expect(spectator.service.startTracking([mockVenue])).rejects.toThrow(
        'Location permission not granted'
      );
    });
  });

  describe('Geofence Boundary Detection', () => {
    beforeEach(() => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
    });

    it('should detect ENTER event when user moves inside geofence (within 150m)', async () => {
      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords);

      await spectator.service.startTracking([mockVenue]);

      const transitionsPromise = firstValueFrom(
        spectator.service.getGeofenceTransitions().pipe(take(1))
      );

      const insideCoords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(insideCoords, Date.now());
      mockProvider.triggerPositionUpdate();

      const transition = await transitionsPromise;
      expect(transition.event).toBe(GeofenceEvent.ENTER);
      expect(transition.venue_id).toBe(mockVenue.id);
      expect(spectator.service.isInsideAnyGeofence()).toBe(true);
    });

    it('should NOT detect ENTER event when user is outside geofence (beyond 150m)', async () => {
      const farOutsideCoords: Coordinates = {
        latitude: 37.78,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(farOutsideCoords);

      await spectator.service.startTracking([mockVenue]);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(spectator.service.isInsideAnyGeofence()).toBe(false);
      expect(spectator.service.getActiveGeofenceVenueIds()).toEqual([]);
    });

    it('should detect EXIT event when user moves outside geofence after being inside', async () => {
      const insideCoords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(insideCoords);

      await spectator.service.startTracking([mockVenue]);
      mockProvider.triggerPositionUpdate();

      await firstValueFrom(spectator.service.getGeofenceTransitions().pipe(take(1)));

      const elevenMinutesMs = 11 * 60 * 1000;
      const futureTime = Date.now() + elevenMinutesMs;

      const exitPromise = firstValueFrom(
        spectator.service.getGeofenceTransitions().pipe(take(1))
      );

      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords, futureTime);
      mockProvider.triggerPositionUpdate();

      const transition = await exitPromise;
      expect(transition.event).toBe(GeofenceEvent.EXIT);
      expect(transition.venue_id).toBe(mockVenue.id);
    });

    it('should calculate distance to venue correctly', async () => {
      const coords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(coords);

      await spectator.service.getCurrentPosition();

      const distance = spectator.service.calculateDistanceToVenue(mockVenue);
      expect(distance).not.toBeNull();
      expect(distance).toBeLessThan(50);
    });

    it('should handle multiple geofences simultaneously', async () => {
      const venue2: Venue = {
        ...mockVenue,
        id: 'venue-2',
        name: 'Another Brewery',
        latitude: 37.7849,
        longitude: -122.4194,
      };

      const coords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(coords);

      await spectator.service.startTracking([mockVenue, venue2]);
      mockProvider.triggerPositionUpdate();

      await firstValueFrom(spectator.service.getGeofenceTransitions().pipe(take(1)));

      const activeVenues = spectator.service.getActiveGeofenceVenueIds();
      expect(activeVenues.length).toBe(1);
      expect(activeVenues[0]).toBe(mockVenue.id);
    });
  });

  describe('Dwell Time Filtering', () => {
    beforeEach(() => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
    });

    it('should NOT emit EXIT event if dwell time < 10 minutes', async () => {
      const insideCoords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(insideCoords, 1000000);

      await spectator.service.startTracking([mockVenue]);
      mockProvider.triggerPositionUpdate();

      await firstValueFrom(spectator.service.getGeofenceTransitions().pipe(take(1)));

      const fiveMinutesLater = 1000000 + 5 * 60 * 1000;

      let exitEmitted = false;
      const subscription = spectator.service.getGeofenceTransitions().subscribe(() => {
        exitEmitted = true;
      });

      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords, fiveMinutesLater);
      mockProvider.triggerPositionUpdate();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(exitEmitted).toBe(false);
      subscription.unsubscribe();
    });

    it('should emit EXIT event if dwell time >= 10 minutes', async () => {
      const insideCoords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      const enterTime = 1000000;
      mockProvider.setMockPosition(insideCoords, enterTime);

      await spectator.service.startTracking([mockVenue]);
      mockProvider.triggerPositionUpdate();

      await firstValueFrom(spectator.service.getGeofenceTransitions().pipe(take(1)));

      const tenMinutesLater = enterTime + 10 * 60 * 1000;

      const exitPromise = firstValueFrom(
        spectator.service.getGeofenceTransitions().pipe(take(1))
      );

      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords, tenMinutesLater);
      mockProvider.triggerPositionUpdate();

      const transition = await exitPromise;
      expect(transition.event).toBe(GeofenceEvent.EXIT);
    });
  });

  describe('Tracking Lifecycle', () => {
    it('should start and stop tracking correctly', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);

      await spectator.service.startTracking([mockVenue]);
      expect(spectator.service.isTracking()).toBe(true);

      await spectator.service.stopTracking();
      expect(spectator.service.isTracking()).toBe(false);
      expect(spectator.service.isInsideAnyGeofence()).toBe(false);
    });

    it('should allow adding geofences dynamically', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
      await spectator.service.startTracking([mockVenue]);

      const newVenue: Venue = {
        ...mockVenue,
        id: 'venue-2',
        name: 'New Venue',
      };

      spectator.service.addGeofence(newVenue);
      expect(spectator.service.isTracking()).toBe(true);
    });

    it('should allow removing geofences dynamically', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
      await spectator.service.startTracking([mockVenue]);

      spectator.service.removeGeofence(mockVenue.id);

      const coords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(coords);
      mockProvider.triggerPositionUpdate();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(spectator.service.isInsideAnyGeofence()).toBe(false);
    });
  });
});
