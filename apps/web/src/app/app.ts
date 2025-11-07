import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { AuthService } from '@blastoise/features-auth';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroBars3, heroClock, heroMapPin, heroCog6Tooth, heroArrowRightOnRectangle } from '@ng-icons/heroicons/outline';

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
  imports: [CommonModule, RouterModule, NgIconComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  viewProviders: [provideIcons({ heroBars3, heroClock, heroMapPin, heroCog6Tooth, heroArrowRightOnRectangle })],
})
export class App {
  protected title = 'Blastoise';

  // Mobile menu state
  readonly isMobileMenuOpen = signal(false);

  // Injected services
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);

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

  get isAuthInitialized(): boolean {
    return this.authState.isInitialized();
  }

  async onSignOut(): Promise<void> {
    await this.authService.signOut();
    this.closeMobileMenu();
  }
}
