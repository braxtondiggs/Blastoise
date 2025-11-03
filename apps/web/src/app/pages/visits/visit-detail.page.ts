import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisitDetailComponent } from '@blastoise/features-visits';

/**
 * T134: Visit Detail Page
 *
 * Page that displays detailed information about a single visit.
 *
 * User Story 2: Visual Timeline of Visits
 */

@Component({
  selector: 'app-visit-detail-page',
  imports: [CommonModule, VisitDetailComponent],
  template: `
    <div class="min-h-screen bg-base-100">
      <app-visit-detail />
    </div>
  `,
  standalone: true,
})
export class VisitDetailPage {}
