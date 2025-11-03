import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Timeline Empty State Component (T127)
 *
 * Displays empty state when user has no visit history:
 * - Friendly messaging
 * - Instructions for enabling location tracking
 * - Link to settings
 * - Explanation of how visit detection works
 *
 * User Story 2: Visual Timeline of Visits
 */

@Component({
  selector: 'app-timeline-empty',
  imports: [CommonModule, RouterModule],
  templateUrl: './timeline-empty.html',
  standalone: true,
})
export class TimelineEmptyComponent {
  @Output() navigateToSettings = new EventEmitter<void>();

  onSettingsClick(): void {
    this.navigateToSettings.emit();
  }
}
