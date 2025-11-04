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
import { PrivacySettings } from '../components/privacy-settings';
import { UpgradePrompt } from '@blastoise/features-auth';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, PrivacySettings, UpgradePrompt],
  template: `
    <div class="min-h-screen bg-base-100 py-8">
      <div class="container mx-auto px-4 max-w-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold">Settings</h1>
        </div>

        <!-- Tabs -->
        <div class="tabs tabs-boxed mb-6">
          <button
            class="tab"
            [class.tab-active]="activeTab() === 'privacy'"
            (click)="activeTab.set('privacy')"
          >
            Privacy
          </button>
          <button
            class="tab"
            [class.tab-active]="activeTab() === 'notifications'"
            (click)="activeTab.set('notifications')"
          >
            Notifications
          </button>
          <button
            class="tab"
            [class.tab-active]="activeTab() === 'account'"
            (click)="activeTab.set('account')"
          >
            Account
          </button>
        </div>

        <!-- Tab Content -->
        <div class="bg-base-200 rounded-lg p-6">
          @if (activeTab() === 'privacy') {
            <app-privacy-settings />
          }

          @if (activeTab() === 'notifications') {
            <div class="text-center text-gray-500 py-8">
              <p class="text-lg font-medium">Notification Settings</p>
              <p class="text-sm mt-2">Coming soon...</p>
            </div>
          }

          @if (activeTab() === 'account') {
            <div class="flex flex-col items-center py-8">
              <h2 class="text-lg font-medium mb-6">Account Settings</h2>
              <lib-upgrade-prompt />
            </div>
          }
        </div>

        <!-- Version Info -->
        <div class="text-center text-sm text-gray-500 mt-8">
          <p>Blastoise v1.0.0</p>
          <p class="mt-2">
            <a href="/privacy" class="link link-primary">Privacy Policy</a>
            <span class="mx-2">·</span>
            <a href="/terms" class="link link-primary">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  `,
  standalone: true,
})
export class SettingsComponent {
  readonly activeTab = signal<'privacy' | 'notifications' | 'account'>('privacy');
}
