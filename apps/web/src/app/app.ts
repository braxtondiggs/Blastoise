import { Component, signal, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { AuthService, WebLimitationNotice } from '@blastoise/features-auth';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroBars3, heroClock, heroMapPin, heroCog6Tooth, heroArrowRightOnRectangle } from '@ng-icons/heroicons/outline';
import { Capacitor } from '@capacitor/core';

/**
 * T135: Main App Component with Navigation
 *
 * Root component with navigation to:
 * - Timeline (visits)
 * - Map (venue discovery)
 * - Settings
 *
 * User Story 2: Visual Timeline of Visits
 */

@Component({
  imports: [CommonModule, RouterModule, NgIconComponent, WebLimitationNotice],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  viewProviders: [provideIcons({ heroBars3, heroClock, heroMapPin, heroCog6Tooth, heroArrowRightOnRectangle })],
})
export class App implements OnInit {
  protected title = 'Blastoise';

  // Mobile menu state
  readonly isMobileMenuOpen = signal(false);

  // Platform detection: show web limitation notice only on web platforms
  readonly showWebNotice = signal(false);

  // Injected services
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Detect platform: show web limitation notice only on web (not iOS/Android)
    if (isPlatformBrowser(this.platformId)) {
      const platform = Capacitor.getPlatform();
      const isWeb = platform === 'web';
      this.showWebNotice.set(isWeb);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  isActiveRoute(path: string): boolean {
    return this.router.url.startsWith(`/${path}`);
  }

  get isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  async onSignOut(): Promise<void> {
    await this.authService.signOut();
    this.closeMobileMenu();
  }
}
