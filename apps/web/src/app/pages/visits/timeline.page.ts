import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from '@blastoise/features-visits';

/**
 * T134: Timeline Page
 *
 * Main page that integrates the timeline component
 * for displaying user's visit history.
 *
 * User Story 2: Visual Timeline of Visits
 */

@Component({
  selector: 'app-timeline-page',
  imports: [CommonModule, TimelineComponent],
  template: `
    <div class="min-h-screen bg-base-100">
      <app-timeline />
    </div>
  `,
  standalone: true,
})
export class TimelinePage {}
