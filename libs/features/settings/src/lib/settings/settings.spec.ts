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
      const notificationsTab = spectator.query('[data-testid="notifications-tab"]');
      spectator.click(notificationsTab!);

      expect(spectator.component.activeTab()).toBe('notifications');
    });

    it('should switch to data tab', () => {
      const dataTab = spectator.query('[data-testid="data-tab"]');
      spectator.click(dataTab!);

      expect(spectator.component.activeTab()).toBe('data');
    });

    it('should switch to account tab', () => {
      const accountTab = spectator.query('[data-testid="account-tab"]');
      spectator.click(accountTab!);

      expect(spectator.component.activeTab()).toBe('account');
    });

    it('should show active state on selected tab', () => {
      const privacyTab = spectator.query('[data-testid="privacy-tab"]');
      expect(privacyTab?.className).toContain('bg-primary');

      const notificationsTab = spectator.query('[data-testid="notifications-tab"]');
      spectator.click(notificationsTab!);
      spectator.detectChanges();

      expect(notificationsTab?.className).toContain('bg-primary');
      expect(privacyTab?.className).not.toContain('bg-primary');
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
      const comingSoonBadge = spectator.query('[data-testid="coming-soon-badge"]');
      expect(comingSoonBadge?.textContent).toContain('Soon');
    });
  });

  describe('Header', () => {
    it('should display settings title', () => {
      const title = spectator.query('[data-testid="settings-title"]');
      expect(title?.textContent).toContain('Settings');
    });

    it('should display description', () => {
      const description = spectator.query('[data-testid="settings-description"]');
      expect(description?.textContent).toContain('Customize your Blastoise experience');
    });
  });
});
