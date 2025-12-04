import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { VisitCard } from './visit-card';
import type { Visit, Venue } from '@blastoise/shared';

describe('VisitCard', () => {
  let spectator: Spectator<VisitCard>;

  const mockVisit: Visit = {
    id: 'visit-1',
    user_id: 'user-123',
    venue_id: 'venue-1',
    arrival_time: '2025-01-15T14:30:00.000Z',
    departure_time: '2025-01-15T16:00:00.000Z',
    is_active: false,
    source: 'auto_detect',
    duration_minutes: 90,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

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
      latitude: 45.5152,
      longitude: -122.6784,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const createComponent = createComponentFactory({
    component: VisitCard,
    detectChanges: false,
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        visit: mockVisit,
        venue: mockVenue,
      },
    });
    spectator.detectChanges();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should have visit input', () => {
    expect(spectator.component.visit).toEqual(mockVisit);
  });

  it('should have venue input', () => {
    expect(spectator.component.venue).toEqual(mockVenue);
  });

  it('should accept visit without venue', () => {
    spectator.setInput('venue', undefined);
    spectator.detectChanges();

    expect(spectator.component.venue).toBeUndefined();
  });
});
