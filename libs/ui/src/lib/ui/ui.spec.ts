import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Ui } from './ui';

describe('Ui', () => {
  let spectator: Spectator<Ui>;

  const createComponent = createComponentFactory({
    component: Ui,
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });
});
