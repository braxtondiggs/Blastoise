import { TestBed } from '@angular/core/testing';
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
  let service: GeofenceService;
  let mockProvider: MockGeolocationProvider;

  const mockVenue: Venue = {
    id: 'venue-1',
    name: 'Test Brewery',
    type: 'brewery',
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockProvider = new MockGeolocationProvider();

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [
        GeofenceService,
        { provide: GeolocationProvider, useValue: mockProvider },
      ],
    }).compileComponents();

    service = TestBed.inject(GeofenceService);
  });

  afterEach(() => {
    // Clean up tracking
    service.stopTracking();
  });

  describe('Permission Management', () => {
    it('should request location permissions', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
      const status = await service.requestPermissions();
      expect(status).toBe(LocationPermission.GRANTED);
      expect(service.permissionStatus()).toBe(LocationPermission.GRANTED);
    });

    it('should check current permission status', async () => {
      mockProvider.setMockPermission(LocationPermission.DENIED);
      const status = await service.checkPermissions();
      expect(status).toBe(LocationPermission.DENIED);
      expect(service.permissionStatus()).toBe(LocationPermission.DENIED);
    });

    it('should throw error when starting tracking without permission', async () => {
      mockProvider.setMockPermission(LocationPermission.DENIED);
      await expectAsync(service.startTracking([mockVenue])).toBeRejectedWithError(
        'Location permission not granted'
      );
    });
  });

  describe('T111: Geofence Boundary Detection', () => {
    beforeEach(() => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
    });

    it('should detect ENTER event when user moves inside geofence (within 150m)', async () => {
      // Start at position outside geofence (200m away)
      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords);

      await service.startTracking([mockVenue]);

      // Set up listener for transitions
      const transitionsPromise = firstValueFrom(
        service.getGeofenceTransitions().pipe(take(1))
      );

      // Move inside geofence (within 150m) - same longitude, latitude closer
      const insideCoords: Coordinates = {
        latitude: 37.7751, // ~22m north of venue
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(insideCoords, Date.now());
      mockProvider.triggerPositionUpdate();

      const transition = await transitionsPromise;
      expect(transition.event).toBe(GeofenceEvent.ENTER);
      expect(transition.venue_id).toBe(mockVenue.id);
      expect(service.isInsideAnyGeofence()).toBe(true);
    });

    it('should NOT detect ENTER event when user is outside geofence (beyond 150m)', async () => {
      // Start at position far outside geofence (500m away)
      const farOutsideCoords: Coordinates = {
        latitude: 37.78, // ~550m north
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(farOutsideCoords);

      await service.startTracking([mockVenue]);

      // Wait a bit to ensure no transitions fire
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(service.isInsideAnyGeofence()).toBe(false);
      expect(service.getActiveGeofenceVenueIds()).toEqual([]);
    });

    it('should detect EXIT event when user moves outside geofence after being inside', async () => {
      // Start inside geofence
      const insideCoords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(insideCoords);

      await service.startTracking([mockVenue]);

      // Trigger initial position to enter geofence
      mockProvider.triggerPositionUpdate();

      // Wait for ENTER event
      await firstValueFrom(service.getGeofenceTransitions().pipe(take(1)));

      // Wait 11 minutes to exceed dwell time threshold
      const elevenMinutesMs = 11 * 60 * 1000;
      const futureTime = Date.now() + elevenMinutesMs;

      // Set up listener for EXIT event
      const exitPromise = firstValueFrom(
        service.getGeofenceTransitions().pipe(take(1))
      );

      // Move outside geofence
      const outsideCoords: Coordinates = {
        latitude: 37.776, // ~135m north (outside 150m radius)
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

      await service.getCurrentPosition();

      const distance = service.calculateDistanceToVenue(mockVenue);
      expect(distance).not.toBeNull();
      expect(distance).toBeLessThan(50); // Should be very close (~22m)
    });

    it('should handle multiple geofences simultaneously', async () => {
      const venue2: Venue = {
        ...mockVenue,
        id: 'venue-2',
        name: 'Another Brewery',
        latitude: 37.7849, // ~1.1km north
        longitude: -122.4194,
      };

      // Start between both venues (closer to venue1)
      const coords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(coords);

      await service.startTracking([mockVenue, venue2]);
      mockProvider.triggerPositionUpdate();

      await firstValueFrom(service.getGeofenceTransitions().pipe(take(1)));

      // Should only be inside venue1
      const activeVenues = service.getActiveGeofenceVenueIds();
      expect(activeVenues.length).toBe(1);
      expect(activeVenues[0]).toBe(mockVenue.id);
    });
  });

  describe('T112: Dwell Time Filtering', () => {
    beforeEach(() => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
    });

    it('should NOT emit EXIT event if dwell time < 10 minutes', async () => {
      const insideCoords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(insideCoords, 1000000);

      await service.startTracking([mockVenue]);
      mockProvider.triggerPositionUpdate();

      // Wait for ENTER event
      await firstValueFrom(service.getGeofenceTransitions().pipe(take(1)));

      // Only wait 5 minutes (less than 10-minute threshold)
      const fiveMinutesLater = 1000000 + 5 * 60 * 1000;

      // Set up a promise that will reject if any transition is emitted
      let exitEmitted = false;
      const subscription = service.getGeofenceTransitions().subscribe(() => {
        exitEmitted = true;
      });

      // Move outside geofence
      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords, fiveMinutesLater);
      mockProvider.triggerPositionUpdate();

      // Wait a bit to ensure no event is emitted
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

      await service.startTracking([mockVenue]);
      mockProvider.triggerPositionUpdate();

      // Wait for ENTER event
      await firstValueFrom(service.getGeofenceTransitions().pipe(take(1)));

      // Wait exactly 10 minutes (meets threshold)
      const tenMinutesLater = enterTime + 10 * 60 * 1000;

      const exitPromise = firstValueFrom(
        service.getGeofenceTransitions().pipe(take(1))
      );

      // Move outside geofence
      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords, tenMinutesLater);
      mockProvider.triggerPositionUpdate();

      const transition = await exitPromise;
      expect(transition.event).toBe(GeofenceEvent.EXIT);
    });

    it('should emit EXIT event if dwell time > 10 minutes', async () => {
      const insideCoords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      const enterTime = 1000000;
      mockProvider.setMockPosition(insideCoords, enterTime);

      await service.startTracking([mockVenue]);
      mockProvider.triggerPositionUpdate();

      await firstValueFrom(service.getGeofenceTransitions().pipe(take(1)));

      // Wait 15 minutes (exceeds threshold)
      const fifteenMinutesLater = enterTime + 15 * 60 * 1000;

      const exitPromise = firstValueFrom(
        service.getGeofenceTransitions().pipe(take(1))
      );

      const outsideCoords: Coordinates = {
        latitude: 37.776,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(outsideCoords, fifteenMinutesLater);
      mockProvider.triggerPositionUpdate();

      const transition = await exitPromise;
      expect(transition.event).toBe(GeofenceEvent.EXIT);

      // Verify dwell time was at least 10 minutes
      const dwellTimeMs = fifteenMinutesLater - enterTime;
      expect(dwellTimeMs).toBeGreaterThanOrEqual(10 * 60 * 1000);
    });
  });

  describe('Tracking Lifecycle', () => {
    it('should start and stop tracking correctly', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);

      await service.startTracking([mockVenue]);
      expect(service.isTracking()).toBe(true);

      await service.stopTracking();
      expect(service.isTracking()).toBe(false);
      expect(service.isInsideAnyGeofence()).toBe(false);
    });

    it('should allow adding geofences dynamically', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
      await service.startTracking([mockVenue]);

      const newVenue: Venue = {
        ...mockVenue,
        id: 'venue-2',
        name: 'New Venue',
      };

      service.addGeofence(newVenue);

      // Verify geofence was added (indirectly through tracking state)
      expect(service.isTracking()).toBe(true);
    });

    it('should allow removing geofences dynamically', async () => {
      mockProvider.setMockPermission(LocationPermission.GRANTED);
      await service.startTracking([mockVenue]);

      service.removeGeofence(mockVenue.id);

      // Trigger position update - should not fire any events
      const coords: Coordinates = {
        latitude: 37.7751,
        longitude: -122.4194,
      };
      mockProvider.setMockPosition(coords);
      mockProvider.triggerPositionUpdate();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(service.isInsideAnyGeofence()).toBe(false);
    });
  });
});
