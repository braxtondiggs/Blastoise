import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-upgrade-prompt',
  imports: [],
  templateUrl: './upgrade-prompt.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class UpgradePrompt {}
