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

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreferencesService } from '../services/preferences.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-2xl mb-4">Notification Settings</h2>
        <p class="text-base-content/70 mb-6">
          Choose which notifications you'd like to receive. You can change these at any time.
        </p>

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
            <div>
              <h3 class="font-semibold text-lg mb-3">Visit Tracking</h3>
              <div class="space-y-4">
                <!-- Visit Detected -->
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <div class="flex-1">
                      <span class="label-text font-medium">Visit Detected (Arrival)</span>
                      <p class="text-sm text-base-content/60 mt-1">
                        Notify when you arrive at a brewery or winery
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.visitDetected"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable visit detected notifications"
                    />
                  </label>
                </div>

                <!-- Visit Ended -->
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <div class="flex-1">
                      <span class="label-text font-medium">Visit Ended (Departure)</span>
                      <p class="text-sm text-base-content/60 mt-1">
                        Notify when you leave a venue with visit summary
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.visitEnded"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable visit ended notifications"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div class="divider"></div>

            <!-- Discovery Notifications Section -->
            <div>
              <h3 class="font-semibold text-lg mb-3">Venue Discovery</h3>
              <div class="space-y-4">
                <!-- New Nearby Venues -->
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <div class="flex-1">
                      <span class="label-text font-medium">New Nearby Venues</span>
                      <p class="text-sm text-base-content/60 mt-1">
                        Notify when new breweries or wineries are added near you
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.newNearbyVenues"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable new nearby venues notifications"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div class="divider"></div>

            <!-- Summary Notifications Section -->
            <div>
              <h3 class="font-semibold text-lg mb-3">Summaries</h3>
              <div class="space-y-4">
                <!-- Weekly Summary -->
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <div class="flex-1">
                      <span class="label-text font-medium">Weekly Visit Summary</span>
                      <p class="text-sm text-base-content/60 mt-1">
                        Receive a weekly recap of your visits every Sunday
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.weeklySummary"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable weekly summary notifications"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div class="divider"></div>

            <!-- Sharing Notifications Section -->
            <div>
              <h3 class="font-semibold text-lg mb-3">Sharing</h3>
              <div class="space-y-4">
                <!-- Sharing Activity -->
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <div class="flex-1">
                      <span class="label-text font-medium">Sharing Activity</span>
                      <p class="text-sm text-base-content/60 mt-1">
                        Notify when someone views your shared visits
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      [(ngModel)]="preferences.sharingActivity"
                      (change)="onPreferenceChange()"
                      class="toggle toggle-primary"
                      aria-label="Enable sharing activity notifications"
                    />
                  </label>
                </div>
              </div>
            </div>

            <!-- System Permission Notice -->
            @if (!hasSystemPermission()) {
              <div class="alert alert-warning">
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
                <div class="text-sm">
                  <p class="font-semibold mb-1">Notifications Blocked</p>
                  <p>
                    Your device settings are blocking notifications. Please enable notifications in your system settings to receive alerts.
                  </p>
                </div>
              </div>
            }

            <!-- Save Success Message -->
            @if (saveSuccess()) {
              <div class="alert alert-success">
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
              <div class="alert alert-error">
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

            <!-- Action Buttons -->
            <div class="card-actions justify-end mt-6">
              <button
                type="button"
                class="btn btn-ghost"
                (click)="resetToDefaults()"
                [disabled]="isSaving()"
              >
                Reset to Defaults
              </button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="savePreferences()"
                [disabled]="isSaving()"
              >
                @if (isSaving()) {
                  <span class="loading loading-spinner loading-sm"></span>
                  <span>Saving...</span>
                } @else {
                  <span>Save Preferences</span>
                }
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class NotificationSettingsComponent implements OnInit {
  private readonly preferencesService = inject(PreferencesService);

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

  async ngOnInit(): Promise<void> {
    await this.loadPreferences();
  }

  /**
   * Load current notification preferences
   */
  private async loadPreferences(): Promise<void> {
    try {
      const prefs = await this.preferencesService.getPreferences().toPromise();

      if (prefs?.notification_settings) {
        this.preferences = {
          visitDetected: prefs.notification_settings.visit_detected ?? this.defaultPreferences.visitDetected,
          visitEnded: prefs.notification_settings.visit_ended ?? this.defaultPreferences.visitEnded,
          newNearbyVenues: prefs.notification_settings.new_venues_nearby ?? this.defaultPreferences.newNearbyVenues,
          weeklySummary: prefs.notification_settings.weekly_summary ?? this.defaultPreferences.weeklySummary,
          sharingActivity: prefs.notification_settings.sharing_activity ?? this.defaultPreferences.sharingActivity,
        };
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
      this.error.set('Failed to load preferences. Using defaults.');
      this.preferences = { ...this.defaultPreferences };
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Save notification preferences
   */
  async savePreferences(): Promise<void> {
    this.isSaving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    try {
      await this.preferencesService.updateNotificationSettings({
        visit_detected: this.preferences.visitDetected,
        visit_ended: this.preferences.visitEnded,
        new_venues_nearby: this.preferences.newNearbyVenues,
        weekly_summary: this.preferences.weeklySummary,
        sharing_activity: this.preferences.sharingActivity,
      }).toPromise();

      this.saveSuccess.set(true);

      // Hide success message after 3 seconds
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      this.error.set('Failed to save preferences. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Auto-save on preference change (optional debounced save)
   */
  onPreferenceChange(): void {
    // Auto-save is optional - could debounce here
    // For now, user must click "Save Preferences"
  }

  /**
   * Reset to default preferences
   */
  async resetToDefaults(): Promise<void> {
    if (confirm('Reset all notification settings to defaults?')) {
      this.preferences = { ...this.defaultPreferences };
      await this.savePreferences();
    }
  }

  /**
   * Check if system-level notification permission is granted
   */
  hasSystemPermission(): boolean {
    if (typeof Notification === 'undefined') {
      return false;
    }
    return Notification.permission === 'granted';
  }
}
