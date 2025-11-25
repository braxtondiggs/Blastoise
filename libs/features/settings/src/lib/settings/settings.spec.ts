import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { SettingsComponent } from './settings';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '@blastoise/features-auth';
import { AuthStateService } from '@blastoise/shared/auth-state';

describe('SettingsComponent', () => {
  let spectator: Spectator<SettingsComponent>;

  const createComponent = createComponentFactory({
    component: SettingsComponent,
    imports: [RouterTestingModule, HttpClientTestingModule],
    providers: [
      mockProvider(AuthService, {
        signOut: jest.fn().mockResolvedValue(undefined),
      }),
      mockProvider(AuthStateService, {
        isAuthenticated: () => true,
        isAnonymous: () => false,
        currentUser: () => ({
          email: 'test@example.com',
          created_at: new Date('2024-01-01').toISOString(),
        }),
      }),
    ],
    detectChanges: false,
  });

  beforeEach(() => {
    spectator = createComponent();
    spectator.detectChanges();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('Tab Navigation', () => {
    it('should default to privacy tab', () => {
      expect(spectator.component.activeTab()).toBe('privacy');
    });

    it('should switch to notifications tab', () => {
      const notificationsTab = spectator.query('button.tab:nth-child(2)');
      spectator.click(notificationsTab!);

      expect(spectator.component.activeTab()).toBe('notifications');
    });

    it('should switch to data tab', () => {
      const dataTab = spectator.query('button.tab:nth-child(3)');
      spectator.click(dataTab!);

      expect(spectator.component.activeTab()).toBe('data');
    });

    it('should switch to account tab', () => {
      const accountTab = spectator.query('button.tab:nth-child(4)');
      spectator.click(accountTab!);

      expect(spectator.component.activeTab()).toBe('account');
    });

    it('should show active state on selected tab', () => {
      const privacyTab = spectator.query('button.tab:nth-child(1)');
      expect(privacyTab).toHaveClass('tab-active');

      const notificationsTab = spectator.query('button.tab:nth-child(2)');
      spectator.click(notificationsTab!);
      spectator.detectChanges();

      expect(notificationsTab).toHaveClass('tab-active');
      expect(privacyTab).not.toHaveClass('tab-active');
    });
  });

  describe('Data Tab Content', () => {
    beforeEach(() => {
      spectator.component.activeTab.set('data');
      spectator.detectChanges();
    });

    it('should show import Google Timeline link', () => {
      const importLink = spectator.query('a[routerLink="/settings/import"]');
      expect(importLink).toBeTruthy();
      expect(importLink?.textContent).toContain('Start Import');
    });

    it('should show import history link', () => {
      const historyLink = spectator.query('a[routerLink="/settings/import-history"]');
      expect(historyLink).toBeTruthy();
      expect(historyLink?.textContent).toContain('View History');
    });

    it('should show coming soon section', () => {
      const comingSoonBadge = spectator.query('.badge-ghost');
      expect(comingSoonBadge?.textContent).toContain('Coming Soon');
    });
  });

  describe('Header', () => {
    it('should display settings title', () => {
      const title = spectator.query('h1.card-title');
      expect(title?.textContent).toContain('Settings');
    });

    it('should display description', () => {
      const description = spectator.query('.text-base-content\\/70');
      expect(description?.textContent).toContain('Manage your preferences and account');
    });
  });
});
