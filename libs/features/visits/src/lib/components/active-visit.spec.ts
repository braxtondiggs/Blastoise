import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActiveVisitComponent } from './active-visit';

describe('ActiveVisit', () => {
  let spectator: Spectator<ActiveVisitComponent>;

  const createComponent = createComponentFactory({
    component: ActiveVisitComponent,
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
