import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDevicePhoneMobile, heroXMark, heroExclamationTriangle } from '@ng-icons/heroicons/outline';

/**
 * Web Limitation Notice Component
 *
 * Displays a dismissible notice on web platforms explaining that background
 * location tracking requires the mobile app for full functionality.
 *
 * Features:
 * - Only shown on web (not on iOS/Android native)
 * - Dismissible with localStorage persistence
 * - Clear explanation of mobile-only features
 * - Link to download/instructions for mobile app
 */
@Component({
  selector: 'lib-web-limitation-notice',
  standalone: true,
  imports: [NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ heroDevicePhoneMobile, heroXMark, heroExclamationTriangle })],
  template: `
    @if (showNotice()) {
    <div
      class="alert alert-warning shadow-lg mb-6"
      role="alert"
      aria-live="polite"
      aria-label="Web platform limitation notice"
    >
      <ng-icon name="heroExclamationTriangle" size="24" class="shrink-0" />
      <div class="flex-1">
        <h3 class="font-bold text-base">Web Version Limited</h3>
        <div class="text-sm mt-1">
          <p class="mb-2">
            Background location tracking requires the mobile app. The web version provides limited
            functionality for viewing your data.
          </p>
          <p class="font-medium">
            <ng-icon name="heroDevicePhoneMobile" size="16" class="inline mr-1" />
            Download the mobile app for:
          </p>
          <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Automatic visit detection with geofencing</li>
            <li>Background location tracking</li>
            <li>Full offline support</li>
            <li>Real-time notifications</li>
          </ul>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        (click)="dismiss()"
        aria-label="Dismiss notice"
      >
        <ng-icon name="heroXMark" size="20" />
      </button>
    </div>
    }
  `,
})
export class WebLimitationNotice {
  private readonly STORAGE_KEY = 'blastoise_web_notice_dismissed';

  // Signal to control notice visibility
  readonly showNotice = signal(true);

  constructor() {
    // Check if user has previously dismissed the notice
    const dismissed = localStorage.getItem(this.STORAGE_KEY);
    if (dismissed === 'true') {
      this.showNotice.set(false);
    }
  }

  /**
   * Dismiss the notice and persist the preference
   */
  dismiss(): void {
    this.showNotice.set(false);
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }
}
