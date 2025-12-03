import { Component, signal, inject, PLATFORM_ID, OnInit, ElementRef, HostListener, computed, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { AuthService, WebLimitationNotice, LocationPermissionNotice } from '@blastoise/features-auth';
import { TrackingManagerService } from '@blastoise/features-visits';
import { NotificationService } from '@blastoise/data-frontend';
import { PreferencesService } from '@blastoise/features-settings';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroHome, heroCog6Tooth, heroArrowRightOnRectangle, heroBars3, heroXMark } from '@ng-icons/heroicons/outline';
import { Capacitor } from '@capacitor/core';

/**
 * Main App Component with Navigation
 *
 * Root component with dropdown navigation containing:
 * - Timeline/Home
 * - Settings
 * - Sign out
 *
 * User Story 2: Visual Timeline of Visits
 */

@Component({
  imports: [CommonModule, RouterModule, NgIconComponent, WebLimitationNotice, LocationPermissionNotice],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  viewProviders: [provideIcons({ heroHome, heroCog6Tooth, heroArrowRightOnRectangle, heroBars3, heroXMark })],
})
export class App implements OnInit {
  protected title = 'Blastoise';

  // Dropdown menu state
  readonly isDropdownOpen = signal(false);

  // Platform detection: show web limitation notice only on web platforms
  private readonly isWebPlatform = signal(false);
  private readonly currentRoute = signal('');

  // Computed: show notice only on web AND not on onboarding page
  readonly showWebNotice = computed(() =>
    this.isWebPlatform() && !this.currentRoute().startsWith('/auth/onboarding')
  );

  // Computed: show location notice when not on onboarding page
  readonly showLocationNotice = computed(() =>
    !this.currentRoute().startsWith('/auth/onboarding')
  );

  // Injected services
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly trackingManager = inject(TrackingManagerService);
  private readonly notificationService = inject(NotificationService);
  private readonly preferencesService = inject(PreferencesService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly elementRef = inject(ElementRef);

  private notificationPermissionRequested = false;
  private trackingInitialized = false;

  constructor() {
    // Reactive effect: start tracking when user becomes authenticated
    effect(async () => {
      const isAuthenticated = this.authState.isAuthenticated();
      const isInitialized = this.authState.isInitialized();

      // Only proceed if auth is initialized and we haven't already initialized tracking
      if (!isInitialized || this.trackingInitialized) {
        return;
      }

      if (isAuthenticated) {
        this.trackingInitialized = true;
        console.log('[App] User authenticated - initializing tracking');
        await this.trackingManager.initialize();
        await this.requestNotificationPermission();
      }
    });
  }

  ngOnInit(): void {
    // Detect platform: show web limitation notice only on web (not iOS/Android)
    if (isPlatformBrowser(this.platformId)) {
      const platform = Capacitor.getPlatform();
      this.isWebPlatform.set(platform === 'web');

      // Track current route for conditional display
      this.currentRoute.set(this.router.url);
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => this.currentRoute.set(event.urlAfterRedirects));
    }
  }

  /**
   * Request notification permission on first login
   * If denied, disable visit notification preferences
   */
  private async requestNotificationPermission(): Promise<void> {
    // Only request once per session
    if (this.notificationPermissionRequested) {
      return;
    }
    this.notificationPermissionRequested = true;

    // Initialize notification service (checks current permission)
    await this.notificationService.initialize();

    // Check if permission needs to be requested
    const currentPermission = this.notificationService.getCurrentPermission();

    // If already granted or denied, don't prompt again
    if (currentPermission !== 'default') {
      // If denied, ensure visit notifications are off
      if (currentPermission === 'denied') {
        this.preferencesService.updateNotificationSettings({
          visit_detected: false,
          visit_ended: false,
        }).subscribe();
      }
      return;
    }

    // On web, Notification.requestPermission() requires user gesture
    // So we just initialize - the notification settings UI will handle prompting
    // On native, we can request directly
    if (Capacitor.isNativePlatform()) {
      const permission = await this.notificationService.requestPermission();

      if (permission === 'denied') {
        this.preferencesService.updateNotificationSettings({
          visit_detected: false,
          visit_ended: false,
        }).subscribe();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close dropdown when clicking outside
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update((open) => !open);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  isActiveRoute(path: string): boolean {
    return this.router.url.startsWith(`/${path}`);
  }

  get isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  get isAuthInitialized(): boolean {
    return this.authState.isInitialized();
  }

  async onSignOut(): Promise<void> {
    await this.authService.signOut();
    this.trackingInitialized = false; // Reset so tracking can restart on next login
    this.closeDropdown();
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
    this.closeDropdown();
  }
}
