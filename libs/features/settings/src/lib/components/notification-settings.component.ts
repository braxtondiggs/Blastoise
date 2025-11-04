/**
 * T194: Notification Settings Component
 *
 * Allows users to configure granular notification preferences:
 * - Visit detected (arrival)
 * - Visit ended (departure)
 * - New nearby venues
 * - Weekly visit summary
 * - Sharing activity
 *
 * Defaults: visit start/end enabled, others disabled
 */

import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroBell, heroMapPin, heroGlobeAlt, heroChartBar, heroShare } from '@ng-icons/heroicons/outline';
import { PreferencesService } from '../services/preferences.service';
import { Subscription } from 'rxjs';

export interface NotificationPreferences {
  visitDetected: boolean; // Arrival notification
  visitEnded: boolean; // Departure notification
  newNearbyVenues: boolean; // New venue alerts
  weeklySummary: boolean; // Weekly visit summary
  sharingActivity: boolean; // Share views/interactions
}

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({ heroBell, heroMapPin, heroGlobeAlt, heroChartBar, heroShare })],
  template: `
    <div class="space-y-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="avatar placeholder">
          <div class="bg-primary/10 text-primary rounded-lg w-12 flex items-center justify-center">
            <ng-icon name="heroBell" size="24" />
          </div>
        </div>
        <div>
          <h2 class="text-2xl font-bold">Notification Settings</h2>
          <p class="text-sm text-base-content/60">
            Choose which notifications you'd like to receive
          </p>
        </div>
      </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex items-center justify-center py-8">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        }

      <!-- Settings Form -->
      @if (!isLoading()) {
        <div class="space-y-6">
          <!-- Visit Notifications Section -->
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center gap-2 mb-4">
                <ng-icon name="heroMapPin" size="20" class="text-primary" />
                <h3 class="font-semibold text-lg">Visit Tracking</h3>
              </div>
              <div class="space-y-4">
                <!-- Visit Detected -->
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.visitDetected"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable visit detected notifications"
                    />
                    <span class="label-text">
                      <div class="font-medium">Visit Detected (Arrival)</div>
                      <div class="text-sm text-base-content/60">Notify when you arrive at a brewery or winery</div>
                    </span>
                  </label>
                </div>

                <!-- Visit Ended -->
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.visitEnded"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable visit ended notifications"
                    />
                    <span class="label-text">
                      <div class="font-medium">Visit Ended (Departure)</div>
                      <div class="text-sm text-base-content/60">Notify when you leave a venue with visit summary</div>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Discovery Notifications Section -->
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center gap-2 mb-4">
                <ng-icon name="heroGlobeAlt" size="20" class="text-primary" />
                <h3 class="font-semibold text-lg">Venue Discovery</h3>
              </div>
              <div class="space-y-4">
                <!-- New Nearby Venues -->
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.newNearbyVenues"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable new nearby venues notifications"
                    />
                    <span class="label-text">
                      <div class="font-medium">New Nearby Venues</div>
                      <div class="text-sm text-base-content/60">Notify when new breweries or wineries are added near you</div>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary Notifications Section -->
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center gap-2 mb-4">
                <ng-icon name="heroChartBar" size="20" class="text-primary" />
                <h3 class="font-semibold text-lg">Summaries</h3>
              </div>
              <div class="space-y-4">
                <!-- Weekly Summary -->
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.weeklySummary"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable weekly summary notifications"
                    />
                    <span class="label-text">
                      <div class="font-medium">Weekly Visit Summary</div>
                      <div class="text-sm text-base-content/60">Receive a weekly recap of your visits every Sunday</div>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Sharing Notifications Section -->
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center gap-2 mb-4">
                <ng-icon name="heroShare" size="20" class="text-primary" />
                <h3 class="font-semibold text-lg">Sharing</h3>
              </div>
              <div class="space-y-4">
                <!-- Sharing Activity -->
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.sharingActivity"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable sharing activity notifications"
                    />
                    <span class="label-text">
                      <div class="font-medium">Sharing Activity</div>
                      <div class="text-sm text-base-content/60">Notify when someone views your shared visits</div>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Permission Request Notice -->
          @if (canRequestPermission()) {
            <div class="alert alert-info shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div class="flex-1">
                <h4 class="font-bold">Enable Browser Notifications</h4>
                <p class="text-sm">Allow notifications to receive visit alerts and updates.</p>
              </div>
              <button class="btn btn-sm btn-primary" (click)="requestPermission()">
                Enable Notifications
              </button>
            </div>
          }

          <!-- Permission Denied Notice -->
          @if (isPermissionDenied()) {
            <div class="alert alert-warning shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 class="font-bold">Notifications Blocked</h4>
                <p class="text-sm">You previously denied notification permission. To receive alerts, please enable notifications in your browser settings for this site.</p>
              </div>
            </div>
          }

          <!-- Save Success Message -->
          @if (saveSuccess()) {
            <div class="alert alert-success shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Notification preferences saved successfully!</span>
            </div>
          }

          <!-- Error Message -->
          @if (error()) {
            <div class="alert alert-error shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{{ error() }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationSettingsComponent implements OnInit, OnDestroy {
  private readonly preferencesService = inject(PreferencesService);
  private subscription?: Subscription;

  // State
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly saveSuccess = signal(false);
  readonly error = signal<string | null>(null);

  // Default preferences (visit start/end enabled, others disabled)
  readonly defaultPreferences: NotificationPreferences = {
    visitDetected: true,
    visitEnded: true,
    newNearbyVenues: false,
    weeklySummary: false,
    sharingActivity: false,
  };

  // Current preferences
  preferences: NotificationPreferences = { ...this.defaultPreferences };

  ngOnInit(): void {
    this.loadPreferences();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Load current notification preferences
   */
  private loadPreferences(): void {
    this.subscription = this.preferencesService.getPreferences().subscribe({
      next: (prefs) => {
        if (prefs?.notification_settings) {
          this.preferences = {
            visitDetected: prefs.notification_settings.visit_detected ?? this.defaultPreferences.visitDetected,
            visitEnded: prefs.notification_settings.visit_ended ?? this.defaultPreferences.visitEnded,
            newNearbyVenues: prefs.notification_settings.new_venues_nearby ?? this.defaultPreferences.newNearbyVenues,
            weeklySummary: prefs.notification_settings.weekly_summary ?? this.defaultPreferences.weeklySummary,
            sharingActivity: prefs.notification_settings.sharing_activity ?? this.defaultPreferences.sharingActivity,
          };
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load notification preferences:', err);
        this.error.set('Failed to load preferences. Using defaults.');
        this.preferences = { ...this.defaultPreferences };
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Save notification preferences
   */
  savePreferences(): void {
    this.isSaving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    this.preferencesService.updateNotificationSettings({
      visit_detected: this.preferences.visitDetected,
      visit_ended: this.preferences.visitEnded,
      new_venues_nearby: this.preferences.newNearbyVenues,
      weekly_summary: this.preferences.weeklySummary,
      sharing_activity: this.preferences.sharingActivity,
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);

        // Hide success message after 3 seconds
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        console.error('Failed to save notification preferences:', err);
        this.error.set('Failed to save preferences. Please try again.');
        this.isSaving.set(false);
      },
    });
  }

  /**
   * Auto-save on preference change
   */
  onPreferenceChange(): void {
    this.savePreferences();
  }

  /**
   * Check if system-level notification permission is granted
   */
  hasSystemPermission(): boolean {
    if (typeof Notification === 'undefined') {
      return true; // Assume supported if API doesn't exist (e.g., server-side rendering)
    }
    return Notification.permission === 'granted';
  }

  /**
   * Check if notification permission was explicitly denied
   */
  isPermissionDenied(): boolean {
    if (typeof Notification === 'undefined') {
      return false;
    }
    return Notification.permission === 'denied';
  }

  /**
   * Check if we can request notification permission
   */
  canRequestPermission(): boolean {
    if (typeof Notification === 'undefined') {
      return false;
    }
    return Notification.permission === 'default';
  }

  /**
   * Request notification permission from the browser
   */
  async requestPermission(): Promise<void> {
    if (typeof Notification === 'undefined') {
      this.error.set('Notifications are not supported in this browser.');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.saveSuccess.set(true);
          setTimeout(() => this.saveSuccess.set(false), 3000);
        } else if (permission === 'denied') {
          this.error.set('Notification permission was denied. Please enable notifications in your browser settings.');
        }
      } catch (err) {
        console.error('Failed to request notification permission:', err);
        this.error.set('Failed to request notification permission.');
      }
    }
  }
}
