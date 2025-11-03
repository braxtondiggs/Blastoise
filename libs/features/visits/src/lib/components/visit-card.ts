import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Visit, Venue } from '@blastoise/shared';

@Component({
  selector: 'app-visit-card',
  imports: [CommonModule],
  templateUrl: './visit-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class VisitCard {
  @Input() visit!: Visit;
  @Input() venue?: Venue;
}
