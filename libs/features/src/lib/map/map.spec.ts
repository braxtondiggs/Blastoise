import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Map } from './map';

describe('Map', () => {
  let spectator: Spectator<Map>;

  const createComponent = createComponentFactory({
    component: Map,
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
