/**
 * T192: Main Settings Component
 *
 * Container for all settings sections:
 * - Privacy settings
 * - Notification settings
 * - Account settings
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroShieldCheck, heroBell, heroUser, heroCog6Tooth } from '@ng-icons/heroicons/outline';
import { PrivacySettings } from '../components/privacy-settings';
import { NotificationSettingsComponent } from '../components/notification-settings.component';
import { AccountSettingsComponent } from '../components/account-settings.component';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, NgIconComponent, PrivacySettings, NotificationSettingsComponent, AccountSettingsComponent],
  viewProviders: [provideIcons({ heroShieldCheck, heroBell, heroUser, heroCog6Tooth })],
  template: `
    <div class="min-h-screen bg-linear-to-br from-base-100 to-base-200 py-8">
      <div class="container mx-auto px-4 max-w-4xl">
        <!-- Header Card -->
        <div class="card bg-base-200 shadow-xl mb-6">
          <div class="card-body">
            <div class="flex items-center gap-4">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content rounded-full w-16 flex items-center justify-center">
                  <ng-icon name="heroCog6Tooth" size="32" />
                </div>
              </div>
              <div>
                <h1 class="text-3xl font-bold card-title">Settings</h1>
                <p class="text-base-content/70">Manage your preferences and account</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs with Icons -->
        <div class="tabs tabs-boxed bg-base-200 shadow-lg mb-6 p-2 gap-2">
          <button
            class="tab gap-2 flex-1"
            [class.tab-active]="activeTab() === 'privacy'"
            (click)="activeTab.set('privacy')"
          >
            <ng-icon name="heroShieldCheck" size="20" />
            <span class="hidden sm:inline">Privacy</span>
          </button>
          <button
            class="tab gap-2 flex-1"
            [class.tab-active]="activeTab() === 'notifications'"
            (click)="activeTab.set('notifications')"
          >
            <ng-icon name="heroBell" size="20" />
            <span class="hidden sm:inline">Notifications</span>
          </button>
          <button
            class="tab gap-2 flex-1"
            [class.tab-active]="activeTab() === 'account'"
            (click)="activeTab.set('account')"
          >
            <ng-icon name="heroUser" size="20" />
            <span class="hidden sm:inline">Account</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="card bg-base-200 shadow-xl">
          <div class="card-body">
            @if (activeTab() === 'privacy') {
              <app-privacy-settings />
            }

            @if (activeTab() === 'notifications') {
              <app-notification-settings />
            }

            @if (activeTab() === 'account') {
              <app-account-settings />
            }
          </div>
        </div>

        <!-- Footer Info Card -->
        <div class="card bg-base-200/50 shadow-md mt-6">
          <div class="card-body py-4">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-base-content/60">
              <div class="flex items-center gap-2">
                <img src="/assets/icons/icon-72x72.png" alt="Blastoise" class="w-6 h-6 rounded" />
                <span class="font-medium">Blastoise v1.0.0</span>
              </div>
              <div class="flex gap-4">
                <a href="/privacy" class="link link-primary link-hover">Privacy Policy</a>
                <a href="/terms" class="link link-primary link-hover">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  standalone: true,
})
export class SettingsComponent {
  readonly activeTab = signal<'privacy' | 'notifications' | 'account'>('privacy');
}
