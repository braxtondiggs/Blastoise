import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { Analytics, logEvent } from '@angular/fire/analytics';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { takeUntil, catchError, filter } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [RouterModule]
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private readonly analytics = inject(Analytics);
  private readonly messaging = inject(Messaging);
  private readonly swUpdate = inject(SwUpdate);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.initializeApp();
    this.setupRouterTracking();
    this.checkForAppUpdates();
    this.requestNotificationPermission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeApp(): void {
    try {
      // Set initial app metadata
      this.title.setTitle('Blastoise - Brewery Tracker');
      this.meta.updateTag({ name: 'description', content: 'Track brewery visits and discover new locations with Blastoise' });
      this.meta.updateTag({ name: 'keywords', content: 'brewery, beer, tracker, locations, pwa' });
      this.meta.updateTag({ property: 'og:title', content: 'Blastoise - Brewery Tracker' });
      this.meta.updateTag({ property: 'og:description', content: 'Track brewery visits and discover new locations' });
      this.meta.updateTag({ property: 'og:type', content: 'website' });

      // Log app initialization for analytics tracking
      try {
        logEvent(this.analytics as any, 'app_initialized', {
          version: '16.0',
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        });
      } catch {}
    } catch (error) {
      console.warn('App initialization failed:', error);
    }
  }

  private setupRouterTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Router tracking failed:', error);
          return EMPTY;
        })
      )
      .subscribe((event) => {
        // Type assertion since we've already filtered for NavigationEnd
        const navigationEvent = event as NavigationEnd;

        // Track page views for analytics
        try { logEvent(this.analytics as any, 'page_view', {
          page_path: navigationEvent.urlAfterRedirects,
          page_title: this.title.getTitle()
        }); } catch {}

        // Update title based on route
        this.updatePageTitle(navigationEvent.urlAfterRedirects);
      });
  }

  private updatePageTitle(url: string): void {
    let pageTitle = 'Blastoise - Brewery Tracker';

    if (url.includes('/admin')) {
      pageTitle = 'Admin - Blastoise';
    } else if (url === '/' || url.includes('/home')) {
      pageTitle = 'Home - Blastoise';
    }

    this.title.setTitle(pageTitle);
  }

  private checkForAppUpdates(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Service Worker update check failed:', error);
            return EMPTY;
          })
        )
        .subscribe(event => {
          if (event.type === 'VERSION_READY') {
            console.log('New version available. Reloading...');
            try { logEvent(this.analytics as any, 'app_update_available'); } catch {}

            this.swUpdate.activateUpdate().then(() => {
              try { logEvent(this.analytics as any, 'app_update_applied'); } catch {}
              document.location.reload();
            }).catch(error => {
              console.error('Failed to activate update:', error);
              try { logEvent(this.analytics as any, 'app_update_failed', { error: error.message }); } catch {}
            });
          }
        });

      // Check for updates periodically (every 6 hours)
      setInterval(() => {
        this.swUpdate.checkForUpdate().catch(error => {
          console.warn('Update check failed:', error);
        });
      }, 6 * 60 * 60 * 1000);
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    try {
      if (Notification.permission === 'granted') {
        const token = await getToken(this.messaging as any, { vapidKey: undefined });
        if (token) {
          try { logEvent(this.analytics as any, 'notification_permission_granted', { token_length: token.length }); } catch {}
        }

        onMessage(this.messaging as any, (message) => {
          console.log('Foreground message received:', message);
          try { logEvent(this.analytics as any, 'notification_received', { message_id: (message as any)?.messageId || 'unknown' }); } catch {}
        });
      }
    } catch (error: any) {
      console.warn('Notification permission request failed:', error);
      try { logEvent(this.analytics as any, 'notification_permission_denied', { error: error?.message }); } catch {}
    }
  }
}
