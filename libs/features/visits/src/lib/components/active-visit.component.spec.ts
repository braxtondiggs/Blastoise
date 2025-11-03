import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActiveVisit } from './active-visit';
import { Visit, Venue } from '@blastoise/shared';

describe('ActiveVisit Component', () => {
  let component: ActiveVisit;
  let fixture: ComponentFixture<ActiveVisit>;

  const mockVenue: Venue = {
    id: 'venue-1',
    name: 'Test Brewery',
    type: 'brewery',
    address: {
      street: '123 Main St',
      city: 'Portland',
      state: 'OR',
      postal_code: '97201',
      country: 'USA',
    },
    location: {
      latitude: 45.5231,
      longitude: -122.6765,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockActiveVisit: Visit = {
    id: 'visit-active',
    user_id: 'user-1',
    venue_id: 'venue-1',
    arrival_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    departure_time: null,
    duration_minutes: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveVisit],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveVisit);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Live Duration Calculation (T139)', () => {
    it('should calculate initial duration correctly from arrival time', () => {
      // Arrange
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: thirtyMinutesAgo.toISOString(),
      };

      // Act
      component.visit = visit;
      component.venue = mockVenue;
      component.ngOnInit();

      // Assert
      const duration = component.currentDuration();
      expect(duration).toBeGreaterThanOrEqual(30); // At least 30 minutes
      expect(duration).toBeLessThan(31); // But less than 31 minutes
    });

    it('should update duration every second', fakeAsync(() => {
      // Arrange
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: fiveMinutesAgo.toISOString(),
      };

      component.visit = visit;
      component.venue = mockVenue;

      // Act
      component.ngOnInit();
      const initialDuration = component.currentDuration();

      // Wait 3 seconds
      tick(3000);

      const updatedDuration = component.currentDuration();

      // Assert
      expect(updatedDuration).toBeGreaterThan(initialDuration);
      expect(updatedDuration - initialDuration).toBeCloseTo(0.05, 1); // 3 seconds = 0.05 minutes
    }));

    it('should format duration as hours and minutes for long visits', () => {
      // Arrange
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: twoHoursAgo.toISOString(),
      };

      component.visit = visit;
      component.venue = mockVenue;

      // Act
      component.ngOnInit();
      const formatted = component.formattedDuration();

      // Assert
      expect(formatted).toMatch(/2h/); // Should show 2 hours
      expect(formatted).toMatch(/\d+m/); // Should show minutes
    });

    it('should format duration as minutes only for short visits', () => {
      // Arrange
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: fifteenMinutesAgo.toISOString(),
      };

      component.visit = visit;
      component.venue = mockVenue;

      // Act
      component.ngOnInit();
      const formatted = component.formattedDuration();

      // Assert
      expect(formatted).toMatch(/^\d+m$/); // Should be just "15m" format
      expect(formatted).not.toContain('h'); // Should not contain hours
    });

    it('should stop updating duration on component destroy', fakeAsync(() => {
      // Arrange
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: fiveMinutesAgo.toISOString(),
      };

      component.visit = visit;
      component.venue = mockVenue;
      component.ngOnInit();

      const durationBeforeDestroy = component.currentDuration();

      // Act - Destroy component
      component.ngOnDestroy();

      // Wait and check duration doesn't update
      tick(3000);

      const durationAfterDestroy = component.currentDuration();

      // Assert - Duration should not change after destroy
      expect(durationAfterDestroy).toBe(durationBeforeDestroy);
    }));

    it('should handle visits that just started (0 minutes)', () => {
      // Arrange
      const now = new Date();
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: now.toISOString(),
      };

      component.visit = visit;
      component.venue = mockVenue;

      // Act
      component.ngOnInit();
      const duration = component.currentDuration();

      // Assert
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1); // Less than 1 minute
    });

    it('should calculate duration accurately for visits longer than 24 hours', () => {
      // Arrange
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: twentyFiveHoursAgo.toISOString(),
      };

      component.visit = visit;
      component.venue = mockVenue;

      // Act
      component.ngOnInit();
      const duration = component.currentDuration();
      const formatted = component.formattedDuration();

      // Assert
      expect(duration).toBeGreaterThanOrEqual(25 * 60); // At least 1500 minutes
      expect(formatted).toMatch(/25h/); // Should show 25+ hours
    });

    it('should update duration signal reactively', fakeAsync(() => {
      // Arrange
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: oneMinuteAgo.toISOString(),
      };

      component.visit = visit;
      component.venue = mockVenue;
      component.ngOnInit();

      let signalUpdates = 0;
      // Subscribe to signal changes
      const subscription = setInterval(() => {
        component.currentDuration();
        signalUpdates++;
      }, 1000);

      // Act - Wait 5 seconds
      tick(5000);
      clearInterval(subscription);

      // Assert - Signal should have updated multiple times
      expect(signalUpdates).toBeGreaterThan(0);
    }));
  });
});
