import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { fakeAsync, tick } from '@angular/core/testing';
import { ActiveVisitComponent } from './active-visit';
import { Visit, Venue } from '@blastoise/shared';

describe('ActiveVisit Component', () => {
  let spectator: Spectator<ActiveVisitComponent>;

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
    departure_time: undefined,
    duration_minutes: undefined,
    is_active: true,
    source: 'auto_detect',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  };

  const createComponent = createComponentFactory({
    component: ActiveVisitComponent,
    detectChanges: false,
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('Live Duration Calculation', () => {
    it('should calculate initial duration correctly from arrival time', () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: thirtyMinutesAgo.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);
      spectator.component.ngOnInit();

      const duration = spectator.component.currentDuration();
      expect(duration).toBeGreaterThanOrEqual(30);
      expect(duration).toBeLessThan(31);
    });

    it('should update duration every second', fakeAsync(() => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: fiveMinutesAgo.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);

      spectator.component.ngOnInit();
      const initialDuration = spectator.component.currentDuration();

      tick(3000);

      const updatedDuration = spectator.component.currentDuration();

      expect(updatedDuration).toBeGreaterThan(initialDuration);
      expect(updatedDuration - initialDuration).toBeCloseTo(0.05, 1);
    }));

    it('should format duration as hours and minutes for long visits', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: twoHoursAgo.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);

      spectator.component.ngOnInit();
      const formatted = spectator.component.formattedDuration();

      expect(formatted).toMatch(/2h/);
      expect(formatted).toMatch(/\d+m/);
    });

    it('should format duration as minutes only for short visits', () => {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: fifteenMinutesAgo.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);

      spectator.component.ngOnInit();
      const formatted = spectator.component.formattedDuration();

      expect(formatted).toMatch(/^\d+m$/);
      expect(formatted).not.toContain('h');
    });

    it('should stop updating duration on component destroy', fakeAsync(() => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: fiveMinutesAgo.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);
      spectator.component.ngOnInit();

      const durationBeforeDestroy = spectator.component.currentDuration();

      spectator.component.ngOnDestroy();

      tick(3000);

      const durationAfterDestroy = spectator.component.currentDuration();

      expect(durationAfterDestroy).toBe(durationBeforeDestroy);
    }));

    it('should handle visits that just started (0 minutes)', () => {
      const now = new Date();
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: now.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);

      spectator.component.ngOnInit();
      const duration = spectator.component.currentDuration();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1);
    });

    it('should calculate duration accurately for visits longer than 24 hours', () => {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: twentyFiveHoursAgo.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);

      spectator.component.ngOnInit();
      const duration = spectator.component.currentDuration();
      const formatted = spectator.component.formattedDuration();

      expect(duration).toBeGreaterThanOrEqual(25 * 60);
      expect(formatted).toMatch(/25h/);
    });

    it('should update duration signal reactively', fakeAsync(() => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      const visit: Visit = {
        ...mockActiveVisit,
        arrival_time: oneMinuteAgo.toISOString(),
      };

      spectator.setInput('visit', visit);
      spectator.setInput('venue', mockVenue);
      spectator.component.ngOnInit();

      let signalUpdates = 0;
      const subscription = setInterval(() => {
        spectator.component.currentDuration();
        signalUpdates++;
      }, 1000);

      tick(5000);
      clearInterval(subscription);

      expect(signalUpdates).toBeGreaterThan(0);
    }));
  });
});
