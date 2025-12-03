/**
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
import { NotificationService } from '@blastoise/data-frontend';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';

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
      <!-- Section Header -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
          <ng-icon name="heroBell" size="24" class="text-primary" />
        </div>
        <div>
          <h2 class="text-2xl font-bold">Notification Settings</h2>
          <p class="text-sm text-base-content/60">Choose which notifications you'd like to receive</p>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }

      <!-- Settings Form -->
      @if (!isLoading()) {
        <div class="space-y-6">
          <!-- Visit Notifications Section -->
          <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
            <div class="p-4 border-b border-base-300/50 bg-base-200/30">
              <div class="flex items-center gap-2">
                <ng-icon name="heroMapPin" size="18" class="text-primary" />
                <h3 class="font-semibold">Visit Tracking</h3>
              </div>
            </div>
            <div class="p-4 space-y-1">
              <!-- Visit Detected -->
              <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors">
                <div class="flex-1 pr-4">
                  <div class="font-medium text-sm">Visit Detected (Arrival)</div>
                  <div class="text-xs text-base-content/60 mt-0.5">Notify when you arrive at a brewery or winery</div>
                </div>
                <input
                  type="checkbox"
                  [checked]="preferences.visitDetected"
                  (change)="onVisitNotificationToggle('visitDetected', $event)"
                  class="toggle toggle-primary toggle-sm"
                  aria-label="Enable visit detected notifications"
                />
              </label>

              <!-- Visit Ended -->
              <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors">
                <div class="flex-1 pr-4">
                  <div class="font-medium text-sm">Visit Ended (Departure)</div>
                  <div class="text-xs text-base-content/60 mt-0.5">Notify when you leave a venue with visit summary</div>
                </div>
                <input
                  type="checkbox"
                  [checked]="preferences.visitEnded"
                  (change)="onVisitNotificationToggle('visitEnded', $event)"
                  class="toggle toggle-primary toggle-sm"
                  aria-label="Enable visit ended notifications"
                />
              </label>
            </div>
          </div>

          <!-- Discovery Notifications Section -->
          <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
            <div class="p-4 border-b border-base-300/50 bg-base-200/30">
              <div class="flex items-center gap-2">
                <ng-icon name="heroGlobeAlt" size="18" class="text-primary" />
                <h3 class="font-semibold">Venue Discovery</h3>
              </div>
            </div>
            <div class="p-4">
              <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors">
                <div class="flex-1 pr-4">
                  <div class="font-medium text-sm">New Nearby Venues</div>
                  <div class="text-xs text-base-content/60 mt-0.5">Notify when new breweries or wineries are added near you</div>
                </div>
                <input
                  type="checkbox"
                  [(ngModel)]="preferences.newNearbyVenues"
                  (change)="onPreferenceChange()"
                  class="toggle toggle-primary toggle-sm"
                  aria-label="Enable new nearby venues notifications"
                />
              </label>
            </div>
          </div>

          <!-- Summary Notifications Section -->
          <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
            <div class="p-4 border-b border-base-300/50 bg-base-200/30">
              <div class="flex items-center gap-2">
                <ng-icon name="heroChartBar" size="18" class="text-primary" />
                <h3 class="font-semibold">Summaries</h3>
              </div>
            </div>
            <div class="p-4">
              <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors">
                <div class="flex-1 pr-4">
                  <div class="font-medium text-sm">Weekly Visit Summary</div>
                  <div class="text-xs text-base-content/60 mt-0.5">Receive a weekly recap of your visits every Sunday</div>
                </div>
                <input
                  type="checkbox"
                  [(ngModel)]="preferences.weeklySummary"
                  (change)="onPreferenceChange()"
                  class="toggle toggle-primary toggle-sm"
                  aria-label="Enable weekly summary notifications"
                />
              </label>
            </div>
          </div>

          <!-- Sharing Notifications Section -->
          <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
            <div class="p-4 border-b border-base-300/50 bg-base-200/30">
              <div class="flex items-center gap-2">
                <ng-icon name="heroShare" size="18" class="text-primary" />
                <h3 class="font-semibold">Sharing</h3>
              </div>
            </div>
            <div class="p-4">
              <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors">
                <div class="flex-1 pr-4">
                  <div class="font-medium text-sm">Sharing Activity</div>
                  <div class="text-xs text-base-content/60 mt-0.5">Notify when someone views your shared visits</div>
                </div>
                <input
                  type="checkbox"
                  [(ngModel)]="preferences.sharingActivity"
                  (change)="onPreferenceChange()"
                  class="toggle toggle-primary toggle-sm"
                  aria-label="Enable sharing activity notifications"
                />
              </label>
            </div>
          </div>

          <!-- Permission Prompt Modal -->
          @if (showPermissionPrompt()) {
            <div class="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
              <div class="flex flex-col gap-4">
                <div class="flex items-start gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15 shrink-0">
                    <ng-icon name="heroBell" size="20" class="text-primary" />
                  </div>
                  <div class="flex-1">
                    <h4 class="font-semibold text-sm">Enable Notifications</h4>
                    <p class="text-xs text-base-content/60 mt-1">
                      To receive visit alerts, you need to allow notifications for Blastoise.
                    </p>
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button
                    type="button"
                    class="py-2 px-4 rounded-xl bg-base-200 text-base-content font-medium text-sm hover:bg-base-300 transition-colors"
                    (click)="cancelPermissionPrompt()"
                  >
                    Not Now
                  </button>
                  <button
                    type="button"
                    class="py-2 px-4 rounded-xl bg-primary text-primary-content font-medium text-sm hover:bg-primary/90 transition-colors"
                    (click)="confirmEnableNotifications()"
                  >
                    Enable Notifications
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Permission Request Notice (shown when permission is default and no modal) -->
          @if (canRequestPermission() && !showPermissionPrompt()) {
            <div class="rounded-xl bg-gradient-to-r from-info/10 to-info/5 border border-info/20 p-4">
              <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-info/15 shrink-0">
                  <ng-icon name="heroBell" size="20" class="text-info" />
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-sm">Enable Notifications</h4>
                  <p class="text-xs text-base-content/60 mt-1">Allow notifications to receive visit alerts and updates.</p>
                </div>
                <button
                  type="button"
                  class="py-2 px-4 rounded-xl bg-info text-info-content font-medium text-sm hover:bg-info/90 transition-colors"
                  (click)="requestPermission()"
                >
                  Enable
                </button>
              </div>
            </div>
          }

          <!-- Permission Denied Notice -->
          @if (isPermissionDenied()) {
            <div class="rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 p-4">
              <div class="flex gap-3">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/15 shrink-0">
                  <svg class="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold text-sm">Notifications Blocked</h4>
                  <p class="text-xs text-base-content/60 mt-1">You previously denied notification permission. Please enable it in your browser settings for this site.</p>
                </div>
              </div>
            </div>
          }

          <!-- Status Messages -->
          @if (saveSuccess()) {
            <div class="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Notification preferences saved successfully!</span>
            </div>
          }

          @if (error()) {
            <div class="flex items-center gap-3 p-3 rounded-xl bg-error/10 border border-error/20 text-sm text-error">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  private readonly notificationService = inject(NotificationService);
  private subscription?: Subscription;

  // State
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly saveSuccess = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPermissionPrompt = signal(false);
  private pendingToggle: { key: 'visitDetected' | 'visitEnded'; value: boolean } | null = null;

  // Default preferences (visit notifications enabled by default)
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
   * Handle visit notification toggle with permission check
   */
  async onVisitNotificationToggle(
    key: 'visitDetected' | 'visitEnded',
    event: Event
  ): Promise<void> {
    const checkbox = event.target as HTMLInputElement;
    const newValue = checkbox.checked;

    // If turning OFF, just save immediately
    if (!newValue) {
      this.preferences[key] = false;
      this.savePreferences();
      return;
    }

    // If turning ON, check permission first
    const permission = await this.notificationService.checkPermission();

    if (permission === 'granted') {
      // Permission already granted, enable the setting
      this.preferences[key] = true;
      this.savePreferences();
    } else if (permission === 'denied') {
      // Permission denied, show error and revert toggle
      checkbox.checked = false;
      this.error.set('Notifications are blocked. Please enable them in your device settings.');
      setTimeout(() => this.error.set(null), 5000);
    } else {
      // Permission not yet requested, show prompt
      checkbox.checked = false; // Revert toggle until permission granted
      this.pendingToggle = { key, value: true };
      this.showPermissionPrompt.set(true);
    }
  }

  /**
   * Cancel permission prompt
   */
  cancelPermissionPrompt(): void {
    this.showPermissionPrompt.set(false);
    this.pendingToggle = null;
  }

  /**
   * Confirm and request notification permission
   */
  async confirmEnableNotifications(): Promise<void> {
    this.showPermissionPrompt.set(false);

    const permission = await this.notificationService.requestPermission();

    if (permission === 'granted') {
      // Permission granted, enable the pending toggle
      if (this.pendingToggle) {
        this.preferences[this.pendingToggle.key] = this.pendingToggle.value;
        this.savePreferences();
      }
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } else {
      this.error.set('Notification permission was denied. Please enable notifications in your device settings.');
      setTimeout(() => this.error.set(null), 5000);
    }

    this.pendingToggle = null;
  }

  /**
   * Check if notification permission was explicitly denied
   */
  isPermissionDenied(): boolean {
    if (Capacitor.isNativePlatform()) {
      return this.notificationService.getCurrentPermission() === 'denied';
    }
    if (typeof Notification === 'undefined') {
      return false;
    }
    return Notification.permission === 'denied';
  }

  /**
   * Check if we can request notification permission
   */
  canRequestPermission(): boolean {
    if (Capacitor.isNativePlatform()) {
      return this.notificationService.getCurrentPermission() === 'default';
    }
    if (typeof Notification === 'undefined') {
      return false;
    }
    return Notification.permission === 'default';
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<void> {
    const permission = await this.notificationService.requestPermission();

    if (permission === 'granted') {
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } else if (permission === 'denied') {
      this.error.set('Notification permission was denied. Please enable notifications in your device settings.');
      setTimeout(() => this.error.set(null), 5000);
    }
  }
}
