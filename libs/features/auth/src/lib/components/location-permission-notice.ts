import { ChangeDetectionStrategy, Component, signal, OnInit, OnDestroy } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroMapPin,
  heroXMark,
  heroExclamationTriangle,
  heroCog6Tooth,
} from '@ng-icons/heroicons/outline';
import { Capacitor } from '@capacitor/core';

/**
 * Location Permission Notice Component
 *
 * Displays a notice when geolocation is disabled or permission is denied.
 * Prompts the user to enable location services for full app functionality.
 */
@Component({
  selector: 'lib-location-permission-notice',
  standalone: true,
  imports: [NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      heroMapPin,
      heroXMark,
      heroExclamationTriangle,
      heroCog6Tooth,
    }),
  ],
  template: `
    @if (showNotice()) {
      <div class="w-full max-w-4xl mx-auto">
        <div
          class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-warning/5 via-warning/10 to-error/5 border border-warning/30"
        >
          <!-- Decorative elements -->
          <div class="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div class="absolute bottom-0 left-0 w-24 h-24 bg-error/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div class="relative p-4">
            <!-- Header row -->
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/15 shrink-0">
                <ng-icon name="heroExclamationTriangle" size="22" class="text-warning" />
              </div>

              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-base-content text-sm">
                  Location access required
                </h4>
                <p class="text-xs text-base-content/60">
                  Enable location to automatically track your brewery visits
                </p>
              </div>

              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square hover:bg-error/10 hover:text-error shrink-0"
                (click)="dismiss()"
                aria-label="Dismiss notice"
              >
                <ng-icon name="heroXMark" size="18" />
              </button>
            </div>

            <!-- Action buttons -->
            <div class="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                (click)="requestPermission()"
                class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-warning text-warning-content font-medium text-sm hover:bg-warning/90 transition-colors"
              >
                <ng-icon name="heroMapPin" size="18" />
                Enable Location
              </button>
              <button
                type="button"
                (click)="openSettings()"
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-base-200 text-base-content font-medium text-sm hover:bg-base-300 transition-colors"
              >
                <ng-icon name="heroCog6Tooth" size="18" />
                <span class="hidden sm:inline">Settings</span>
              </button>
            </div>

            @if (permissionDenied()) {
              <p class="mt-3 text-xs text-base-content/50 text-center">
                Location was denied. Please enable it in your browser settings to use visit tracking.
              </p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class LocationPermissionNotice implements OnInit, OnDestroy {
  private readonly STORAGE_KEY = 'blastoise_location_notice_dismissed';

  readonly showNotice = signal(false);
  readonly permissionDenied = signal(false);

  private permissionCheckInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.checkPermission();
    // Periodically check permission status
    this.permissionCheckInterval = setInterval(() => this.checkPermission(), 5000);
  }

  ngOnDestroy(): void {
    if (this.permissionCheckInterval) {
      clearInterval(this.permissionCheckInterval);
    }
  }

  private async checkPermission(): Promise<void> {
    // Check if dismissed recently (within this session)
    const dismissed = sessionStorage.getItem(this.STORAGE_KEY);
    if (dismissed === 'true') {
      this.showNotice.set(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      this.showNotice.set(false);
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'denied') {
        this.showNotice.set(true);
        this.permissionDenied.set(true);
      } else if (permission.state === 'prompt') {
        this.showNotice.set(true);
        this.permissionDenied.set(false);
      } else {
        // Permission granted
        this.showNotice.set(false);
        this.permissionDenied.set(false);
      }

      // Listen for permission changes
      permission.onchange = () => {
        if (permission.state === 'granted') {
          this.showNotice.set(false);
          this.permissionDenied.set(false);
        } else if (permission.state === 'denied') {
          this.showNotice.set(true);
          this.permissionDenied.set(true);
        }
      };
    } catch {
      // Permissions API not supported, try to get position
      this.showNotice.set(true);
    }
  }

  async requestPermission(): Promise<void> {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      this.showNotice.set(false);
      this.permissionDenied.set(false);
    } catch (error) {
      if (error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED) {
        this.permissionDenied.set(true);
      }
    }
  }

  openSettings(): void {
    const platform = Capacitor.getPlatform();
    let message = 'To enable location:\n\n';

    if (platform === 'ios') {
      message += '1. Open Settings app\n2. Scroll down and tap "Blastoise"\n3. Tap "Location"\n4. Select "While Using the App" or "Always"';
    } else if (platform === 'android') {
      message += '1. Open Settings app\n2. Tap "Apps" or "Applications"\n3. Find and tap "Blastoise"\n4. Tap "Permissions"\n5. Enable "Location"';
    } else {
      // Web: provide browser-specific guidance
      const userAgent = navigator.userAgent.toLowerCase();

      if (userAgent.includes('chrome')) {
        message += '1. Click the lock/info icon in the address bar\n2. Find "Location" and set it to "Allow"';
      } else if (userAgent.includes('firefox')) {
        message += '1. Click the lock icon in the address bar\n2. Clear the blocked permission for Location';
      } else if (userAgent.includes('safari')) {
        message += '1. Go to Safari > Settings > Websites\n2. Find Location and allow for this site';
      } else {
        message += 'Check your browser settings to allow location access for this site.';
      }
    }

    alert(message);
  }

  dismiss(): void {
    this.showNotice.set(false);
    // Only dismiss for this session
    sessionStorage.setItem(this.STORAGE_KEY, 'true');
  }
}
