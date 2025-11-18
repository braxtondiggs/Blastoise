/**
 * Public shared visit page (no authentication required)
 *
 * Displays anonymized visit information via public share link.
 * This route does NOT require authentication - anyone with the link can view.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedVisitViewComponent } from '@blastoise/features-sharing';

@Component({
  selector: 'app-shared-visit-page',
  imports: [CommonModule, SharedVisitViewComponent],
  template: `<app-shared-visit-view />`,
  standalone: true,
})
export class SharedVisitPage {
  // The SharedVisitViewComponent handles all logic including route params
}
