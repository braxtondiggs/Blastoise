import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Visits } from './visits';

describe('Visits', () => {
  let spectator: Spectator<Visits>;

  const createComponent = createComponentFactory({
    component: Visits,
    detectChanges: false,
  });

  beforeEach(() => {
    spectator = createComponent();
    spectator.detectChanges();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });
});
