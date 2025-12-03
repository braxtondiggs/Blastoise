import { Component, signal, inject, PLATFORM_ID, OnInit, ElementRef, HostListener, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { AuthService, WebLimitationNotice, LocationPermissionNotice } from '@blastoise/features-auth';
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly elementRef = inject(ElementRef);

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
    this.closeDropdown();
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
    this.closeDropdown();
  }
}
