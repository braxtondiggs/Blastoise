import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Visit, Venue } from '@blastoise/shared';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroClock,
  heroMapPin,
  heroBolt,
  heroBeaker,
  heroSparkles,
  heroSignal,
  heroCheckCircle,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-visit-card',
  imports: [CommonModule, NgIconComponent],
  templateUrl: './visit-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  viewProviders: [
    provideIcons({
      heroClock,
      heroMapPin,
      heroBolt,
      heroBeaker,
      heroSparkles,
      heroSignal,
      heroCheckCircle,
    }),
  ],
})
export class VisitCard {
  @Input() visit!: Visit;
  @Input() venue?: Venue;

  /**
   * Format time to display (e.g., "2:30 PM")
   */
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /**
   * Get duration string (e.g., "2h 30m")
   */
  getDuration(): string | null {
    if (!this.visit.departure_time) {
      return null;
    }

    const arrival = new Date(this.visit.arrival_time).getTime();
    const departure = new Date(this.visit.departure_time).getTime();
    const durationMs = departure - arrival;
    const durationMinutes = Math.floor(durationMs / 1000 / 60);

    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
  }

  /**
   * Get location string (e.g., "Portland, OR")
   */
  getLocation(): string {
    const parts: string[] = [];

    if (this.venue?.city) {
      parts.push(this.venue.city);
    }

    if (this.venue?.state) {
      parts.push(this.venue.state);
    }

    return parts.join(', ');
  }

  /**
   * Get human-readable source label
   */
  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      auto_detect: 'Auto-detected',
      google_import: 'Google Timeline',
      manual: 'Manually added',
    };

    return labels[source] || source;
  }

  /**
   * Get badge color class for source
   */
  getSourceBadgeColor(source: string): string {
    const colors: Record<string, string> = {
      auto_detect: 'badge-accent',
      google_import: 'badge-accent',
      manual: 'badge-accent',
    };

    return colors[source] || 'badge-ghost';
  }
}
