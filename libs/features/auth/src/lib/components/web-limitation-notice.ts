import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroDevicePhoneMobile,
  heroXMark,
  heroChevronDown,
  heroChevronUp,
  heroMapPin,
  heroBell,
  heroSignal,
  heroArrowDownTray,
} from '@ng-icons/heroicons/outline';

/**
 * Web Limitation Notice Component
 *
 * Displays a dismissible inline banner on web platforms explaining that background
 * location tracking requires the mobile app for full functionality.
 */
@Component({
  selector: 'lib-web-limitation-notice',
  standalone: true,
  imports: [NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      heroDevicePhoneMobile,
      heroXMark,
      heroChevronDown,
      heroChevronUp,
      heroMapPin,
      heroBell,
      heroSignal,
      heroArrowDownTray,
    }),
  ],
  template: `
    @if (showNotice()) {
      <div class="w-full max-w-4xl mx-auto">
        <div
          class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 border border-primary/20"
        >
          <!-- Decorative elements -->
          <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div class="absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div class="relative p-4">
            <!-- Header row -->
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                <ng-icon name="heroDevicePhoneMobile" size="22" class="text-primary" />
              </div>

              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-base-content text-sm">
                  Unlock the full experience
                </h4>
                <p class="text-xs text-base-content/60">
                  Get the mobile app for automatic visit tracking
                </p>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-square hover:bg-primary/10"
                  (click)="toggleExpanded()"
                  [attr.aria-expanded]="isExpanded()"
                  aria-label="Toggle details"
                >
                  @if (isExpanded()) {
                    <ng-icon name="heroChevronUp" size="18" />
                  } @else {
                    <ng-icon name="heroChevronDown" size="18" />
                  }
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-square hover:bg-error/10 hover:text-error"
                  (click)="dismiss()"
                  aria-label="Dismiss notice"
                >
                  <ng-icon name="heroXMark" size="18" />
                </button>
              </div>
            </div>

            <!-- Expanded content -->
            @if (isExpanded()) {
              <div class="mt-4 pt-4 border-t border-primary/10">
                <!-- Feature grid -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div class="flex items-center gap-2 p-2 rounded-lg bg-base-100/50">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                      <ng-icon name="heroMapPin" size="16" class="text-primary" />
                    </div>
                    <span class="text-xs font-medium text-base-content/80">Auto visit detection</span>
                  </div>
                  <div class="flex items-center gap-2 p-2 rounded-lg bg-base-100/50">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10">
                      <ng-icon name="heroSignal" size="16" class="text-secondary" />
                    </div>
                    <span class="text-xs font-medium text-base-content/80">Background tracking</span>
                  </div>
                  <div class="flex items-center gap-2 p-2 rounded-lg bg-base-100/50">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
                      <ng-icon name="heroArrowDownTray" size="16" class="text-accent" />
                    </div>
                    <span class="text-xs font-medium text-base-content/80">Offline support</span>
                  </div>
                  <div class="flex items-center gap-2 p-2 rounded-lg bg-base-100/50">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-info/10">
                      <ng-icon name="heroBell" size="16" class="text-info" />
                    </div>
                    <span class="text-xs font-medium text-base-content/80">Push notifications</span>
                  </div>
                </div>

                <!-- CTA -->
                <a
                  href="https://play.google.com/store/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-primary-content font-medium text-sm hover:bg-primary-focus transition-colors"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
                  </svg>
                  Download for Android
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class WebLimitationNotice {
  private readonly STORAGE_KEY = 'blastoise_web_notice_dismissed';

  readonly showNotice = signal(true);
  readonly isExpanded = signal(false);

  constructor() {
    const dismissed = localStorage.getItem(this.STORAGE_KEY);
    if (dismissed === 'true') {
      this.showNotice.set(false);
    }
  }

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  dismiss(): void {
    this.showNotice.set(false);
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }
}
