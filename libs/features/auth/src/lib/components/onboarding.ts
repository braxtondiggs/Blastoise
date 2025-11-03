import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-onboarding',
  imports: [],
  templateUrl: './onboarding.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class Onboarding {}
