/**
 * Handles all application notifications:
 * - Push notification permissions
 * - Visit detected (arrival) notifications
 * - Visit ended (departure) notifications
 * - New nearby venues notifications
 * - Sharing activity notifications
 * - Device-level permission denial handling
 *
 * Phase 7: Notifications & Observability
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

export interface NotificationPreferences {
  visitDetected: boolean;
  visitEnded: boolean;
  newVenuesNearby: boolean;
  weeklySummary: boolean;
  sharingActivity: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  visitDetected: true,
  visitEnded: true,
  newVenuesNearby: false,
  weeklySummary: false,
  sharingActivity: false,
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly permissionStatus$ = new BehaviorSubject<NotificationPermission>('default');
  private preferences$ = new BehaviorSubject<NotificationPreferences>(DEFAULT_PREFERENCES);

  /**

   * Handles permission request gracefully across platforms
   */
  async requestPermission(): Promise<NotificationPermission> {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return 'denied';
    }

    // Check if already denied
    if (Notification.permission === 'denied') {
      this.handlePermissionDenial();
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus$.next(permission as NotificationPermission);


      if (permission === 'denied') {
        this.handlePermissionDenial();
      } else if (permission === 'granted') {
        // Clear any previous denial tracking
        this.clearDenialTracking();
      }

      return permission as NotificationPermission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      this.handlePermissionDenial();
      return 'denied';
    }
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): Observable<NotificationPermission> {
    return this.permissionStatus$.asObservable();
  }

  /**
   * Get current permission synchronously
   */
  getCurrentPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermission;
  }

  /**
   * Check if notifications are available and permitted
   */
  isNotificationEnabled(): boolean {
    return (
      'Notification' in window &&
      Notification.permission === 'granted'
    );
  }

  /**

   * Shows user-friendly message and provides guidance
   */
  handlePermissionDenial(): void {
    console.info('Notifications are blocked. User can enable them in browser settings.');

    // Store denial information for UI to display help
    try {
      localStorage.setItem('notification_denied', 'true');
      localStorage.setItem('notification_denied_at', new Date().toISOString());
    } catch (error) {
      console.error('Failed to store notification denial info:', error);
    }
  }

  /**
   * Check if notifications were previously denied
   */
  wasPermissionDenied(): boolean {
    try {
      return localStorage.getItem('notification_denied') === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Clear denial tracking (when user re-enables)
   */
  clearDenialTracking(): void {
    try {
      localStorage.removeItem('notification_denied');
      localStorage.removeItem('notification_denied_at');
    } catch (error) {
      console.error('Failed to clear denial tracking:', error);
    }
  }

  /**
   * Get instructions for enabling notifications based on platform
   */
  getEnableInstructions(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) {
      return 'Click the lock icon in the address bar, then allow notifications.';
    } else if (userAgent.includes('firefox')) {
      return 'Click the lock icon in the address bar, select "Permissions", then allow notifications.';
    } else if (userAgent.includes('safari')) {
      return 'Go to Safari > Preferences > Websites > Notifications, and allow notifications for this site.';
    } else if (userAgent.includes('edge')) {
      return 'Click the lock icon in the address bar, then allow notifications.';
    } else {
      return 'Check your browser settings to allow notifications for this site.';
    }
  }

  /**
   * Set notification preferences
   */
  setPreferences(preferences: Partial<NotificationPreferences>): void {
    const updated = { ...this.preferences$.value, ...preferences };
    this.preferences$.next(updated);

    // Persist to local storage
    try {
      localStorage.setItem('notification_preferences', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Get notification preferences
   */
  getPreferences(): Observable<NotificationPreferences> {
    return this.preferences$.asObservable();
  }

  /**
   * Load preferences from local storage
   */
  loadPreferences(): void {
    try {
      const stored = localStorage.getItem('notification_preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.preferences$.next({ ...DEFAULT_PREFERENCES, ...preferences });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  /**
   * Send a notification (internal helper)
   */
  private async sendNotification(config: NotificationConfig): Promise<void> {
    if (!this.isNotificationEnabled()) {
      console.log('Notifications not enabled, skipping:', config.title);
      return;
    }

    try {
      const notification = new Notification(config.title, {
        body: config.body,
        icon: config.icon || '/assets/icons/icon-192x192.png',
        badge: config.badge || '/assets/icons/badge-72x72.png',
        tag: config.tag,
        data: config.data,
        requireInteraction: config.requireInteraction || false,
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!config.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();

        // Navigate to relevant page if data includes a URL
        if (config.data?.url) {
          window.location.href = config.data.url;
        }
      };
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send visit detected (arrival) notification
   */
  async notifyVisitDetected(venueName: string, venueId: string): Promise<void> {
    const prefs = this.preferences$.value;

    if (!prefs.visitDetected) {
      console.log('Visit detected notifications disabled');
      return;
    }

    await this.sendNotification({
      title: '📍 Visit Detected',
      body: `You've arrived at ${venueName}!`,
      tag: `visit-detected-${venueId}`,
      data: {
        type: 'visit-detected',
        venueId,
        url: `/visits`,
      },
      requireInteraction: false,
    });
  }

  /**
   * Send visit ended (departure) notification
   */
  async notifyVisitEnded(
    venueName: string,
    durationMinutes: number,
    visitId: string
  ): Promise<void> {
    const prefs = this.preferences$.value;

    if (!prefs.visitEnded) {
      console.log('Visit ended notifications disabled');
      return;
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const durationText = hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes} minutes`;

    await this.sendNotification({
      title: '✅ Visit Ended',
      body: `Your visit to ${venueName} lasted ${durationText}`,
      tag: `visit-ended-${visitId}`,
      data: {
        type: 'visit-ended',
        visitId,
        url: `/visits/${visitId}`,
      },
      requireInteraction: false,
    });
  }

  /**
   * Send new nearby venues notification
   */
  async notifyNewVenuesNearby(count: number, city?: string): Promise<void> {
    const prefs = this.preferences$.value;

    if (!prefs.newVenuesNearby) {
      console.log('New venues notifications disabled');
      return;
    }

    const locationText = city ? ` in ${city}` : ' near you';
    const venueText = count === 1 ? 'venue' : 'venues';

    await this.sendNotification({
      title: '🆕 New Venues Nearby',
      body: `${count} new ${venueText}${locationText}!`,
      tag: 'new-venues-nearby',
      data: {
        type: 'new-venues',
        count,
        url: '/map',
      },
      requireInteraction: false,
    });
  }

  /**
   * Send weekly visit summary notification
   */
  async notifyWeeklySummary(
    visitCount: number,
    topVenue?: string
  ): Promise<void> {
    const prefs = this.preferences$.value;

    if (!prefs.weeklySummary) {
      console.log('Weekly summary notifications disabled');
      return;
    }

    let body = `You visited ${visitCount} ${visitCount === 1 ? 'venue' : 'venues'} this week!`;
    if (topVenue) {
      body += ` Top spot: ${topVenue}`;
    }

    await this.sendNotification({
      title: '📊 Weekly Visit Summary',
      body,
      tag: 'weekly-summary',
      data: {
        type: 'weekly-summary',
        url: '/visits',
      },
      requireInteraction: true,
    });
  }

  /**
   * Send sharing activity notification
   */
  async notifySharingActivity(
    venueName: string,
    viewCount: number,
    shareId: string
  ): Promise<void> {
    const prefs = this.preferences$.value;

    if (!prefs.sharingActivity) {
      console.log('Sharing activity notifications disabled');
      return;
    }

    const viewText = viewCount === 1 ? 'view' : 'views';

    await this.sendNotification({
      title: '👀 Share Activity',
      body: `Your visit to ${venueName} has ${viewCount} ${viewText}`,
      tag: `share-activity-${shareId}`,
      data: {
        type: 'share-activity',
        shareId,
        url: `/visits`,
      },
      requireInteraction: false,
    });
  }

  /**
   * Initialize notification service
   * - Load preferences from storage
   * - Check current permission status
   */
  initialize(): void {
    this.loadPreferences();

    if ('Notification' in window) {
      this.permissionStatus$.next(Notification.permission as NotificationPermission);
    }
  }
}
