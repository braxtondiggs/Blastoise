import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDevicePhoneMobile, heroExclamationTriangle } from '@ng-icons/heroicons/outline';
import { ModalComponent } from '@blastoise/ui';

/**
 * Web Limitation Notice Component
 *
 * Displays a dismissible modal on web platforms explaining that background
 * location tracking requires the mobile app for full functionality.
 *
 * Features:
 * - Only shown on web (not on iOS/Android native)
 * - Dismissible modal with localStorage persistence
 * - Clear explanation of mobile-only features
 * - Link to download/instructions for mobile app
 */
@Component({
  selector: 'lib-web-limitation-notice',
  standalone: true,
  imports: [NgIconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ heroDevicePhoneMobile, heroExclamationTriangle })],
  template: `
    <lib-app-modal
      modalId="web-limitation-notice"
      [isOpen]="showNotice()"
      (closed)="dismiss()"
      size="md"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10 shrink-0">
          <ng-icon name="heroExclamationTriangle" size="20" class="text-warning" />
        </div>
        <h3 class="text-xl font-bold text-base-content">Web Version Limited</h3>
      </div>

      <div class="flex items-start gap-4">
        <div class="flex-1">
          <p class="text-base-content/80 mb-4">
            Background location tracking requires the mobile app. The web version provides limited
            functionality for viewing your data.
          </p>
          <div class="bg-base-200 rounded-lg p-4">
            <p class="font-semibold text-base-content flex items-center gap-2 mb-3">
              <ng-icon name="heroDevicePhoneMobile" size="20" class="text-primary" />
              Download the mobile app for:
            </p>
            <ul class="space-y-2 text-sm text-base-content/70">
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold mt-0.5">•</span>
                <span>Automatic visit detection with geofencing</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold mt-0.5">•</span>
                <span>Background location tracking</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold mt-0.5">•</span>
                <span>Full offline support</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-primary font-bold mt-0.5">•</span>
                <span>Real-time notifications</span>
              </li>
            </ul>
          </div>

          <div class="mt-6 flex justify-center">
            <a
              href="https://play.google.com/store/apps"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary gap-2"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
              </svg>
              Download for Android
            </a>
          </div>
        </div>
      </div>
    </lib-app-modal>
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
