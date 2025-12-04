/**
 * Container for all settings sections:
 * - Privacy settings
 * - Notification settings
 * - Account settings
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroShieldCheck,
  heroBell,
  heroUser,
  heroCog6Tooth,
  heroCloudArrowUp,
  heroArrowRight,
  heroClock,
  heroSparkles,
  heroQuestionMarkCircle,
  heroExclamationTriangle,
} from '@ng-icons/heroicons/outline';
import { PrivacySettings } from '../components/privacy-settings';
import { NotificationSettingsComponent } from '../components/notification-settings.component';
import { AccountSettingsComponent } from '../components/account-settings.component';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, NgIconComponent, RouterLink, PrivacySettings, NotificationSettingsComponent, AccountSettingsComponent],
  viewProviders: [provideIcons({ heroShieldCheck, heroBell, heroUser, heroCog6Tooth, heroCloudArrowUp, heroArrowRight, heroClock, heroSparkles, heroQuestionMarkCircle, heroExclamationTriangle })],
  template: `
    <div class="min-h-screen bg-base-100">
      <div class="container mx-auto px-4 max-w-4xl py-6">
        <!-- Hero Header -->
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 mb-6">
          <!-- Decorative elements -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div class="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

          <div class="relative p-6 sm:p-8">
            <div class="flex items-center gap-5">
              <div class="relative">
                <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                  <ng-icon name="heroCog6Tooth" size="32" class="text-primary-content" />
                </div>
                <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                  <ng-icon name="heroSparkles" size="12" class="text-secondary-content" />
                </div>
              </div>
              <div>
                <h1 class="text-2xl sm:text-3xl font-bold text-base-content" data-testid="settings-title">Settings</h1>
                <p class="text-base-content/60 mt-1" data-testid="settings-description">Customize your Blastoise experience</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="bg-base-200/80 backdrop-blur-sm rounded-2xl p-1.5 mb-6 shadow-sm border border-base-300/50">
          <div class="grid grid-cols-4 gap-1">
            <button
              type="button"
              class="relative flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl font-medium text-sm transition-all duration-200"
              data-testid="privacy-tab"
              [class]="activeTab() === 'privacy'
                ? 'bg-primary text-primary-content shadow-md'
                : 'text-base-content/70 hover:bg-base-300/50 hover:text-base-content'"
              (click)="activeTab.set('privacy')"
            >
              <ng-icon name="heroShieldCheck" size="20" />
              <span class="text-xs sm:text-sm">Privacy</span>
            </button>
            <button
              type="button"
              class="relative flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl font-medium text-sm transition-all duration-200"
              data-testid="notifications-tab"
              [class]="activeTab() === 'notifications'
                ? 'bg-primary text-primary-content shadow-md'
                : 'text-base-content/70 hover:bg-base-300/50 hover:text-base-content'"
              (click)="activeTab.set('notifications')"
            >
              <ng-icon name="heroBell" size="20" />
              <span class="text-xs sm:text-sm">Alerts</span>
            </button>
            <button
              type="button"
              class="relative flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl font-medium text-sm transition-all duration-200"
              data-testid="data-tab"
              [class]="activeTab() === 'data'
                ? 'bg-primary text-primary-content shadow-md'
                : 'text-base-content/70 hover:bg-base-300/50 hover:text-base-content'"
              (click)="activeTab.set('data')"
            >
              <ng-icon name="heroCloudArrowUp" size="20" />
              <span class="text-xs sm:text-sm">Data</span>
            </button>
            <button
              type="button"
              class="relative flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl font-medium text-sm transition-all duration-200"
              data-testid="account-tab"
              [class]="activeTab() === 'account'
                ? 'bg-primary text-primary-content shadow-md'
                : 'text-base-content/70 hover:bg-base-300/50 hover:text-base-content'"
              (click)="activeTab.set('account')"
            >
              <ng-icon name="heroUser" size="20" />
              <span class="text-xs sm:text-sm">Account</span>
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="bg-base-200/50 rounded-2xl border border-base-300/50 shadow-sm">
          <div class="p-5 sm:p-6">
            @if (activeTab() === 'privacy') {
              <app-privacy-settings />
            }

            @if (activeTab() === 'notifications') {
              <app-notification-settings />
            }

            @if (activeTab() === 'data') {
              <!-- Data Management Tab -->
              <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                  <ng-icon name="heroCloudArrowUp" size="24" class="text-primary" />
                </div>
                <div>
                  <h2 class="text-2xl font-bold">Data Management</h2>
                  <p class="text-sm text-base-content/60">Import and manage your visit history</p>
                </div>
              </div>

              <!-- Import Cards Grid -->
              <div class="grid gap-4 sm:grid-cols-2">
                <!-- Import Google Timeline Card -->
                <div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                  <div class="relative">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 mb-4 group-hover:scale-110 transition-transform">
                      <ng-icon name="heroCloudArrowUp" size="24" class="text-primary" />
                    </div>
                    <h3 class="font-semibold text-lg mb-2">Google Timeline</h3>
                    <p class="text-sm text-base-content/60 mb-4">
                      Import brewery visits from your Google Timeline JSON export
                    </p>
                    <a
                      routerLink="/settings/import"
                      class="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-content font-medium text-sm hover:bg-primary/90 transition-colors"
                    >
                      Start Import
                      <ng-icon name="heroArrowRight" size="16" />
                    </a>
                  </div>
                </div>

                <!-- Import History Card -->
                <div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/5 to-secondary/10 border border-secondary/20 p-5 hover:shadow-lg hover:border-secondary/30 transition-all duration-300">
                  <div class="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                  <div class="relative">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/15 mb-4 group-hover:scale-110 transition-transform">
                      <ng-icon name="heroClock" size="24" class="text-secondary" />
                    </div>
                    <h3 class="font-semibold text-lg mb-2">Import History</h3>
                    <p class="text-sm text-base-content/60 mb-4">
                      View past imports and audit your imported data
                    </p>
                    <a
                      routerLink="/settings/import-history"
                      class="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-secondary text-secondary-content font-medium text-sm hover:bg-secondary/90 transition-colors"
                    >
                      View History
                      <ng-icon name="heroArrowRight" size="16" />
                    </a>
                  </div>
                </div>
              </div>

              <!-- Coming Soon Section -->
              <div class="mt-6">
                <h3 class="text-sm font-medium text-base-content/50 mb-3 uppercase tracking-wide">Coming Soon</h3>
                <div class="rounded-xl bg-base-300/30 border border-base-300/50 p-4 opacity-60">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-base-300/50">
                      <svg class="w-5 h-5 text-base-content/50" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </div>
                    <div>
                      <span class="font-medium text-sm">Apple Maps Timeline Import</span>
                      <p class="text-xs text-base-content/50">Import from Apple Maps history</p>
                    </div>
                    <div class="ml-auto">
                      <span class="badge badge-sm badge-outline" data-testid="coming-soon-badge">Soon</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Help Guide Section -->
              <div class="mt-8">
                <div class="flex items-center gap-3 mb-4">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-info/10">
                    <ng-icon name="heroQuestionMarkCircle" size="20" class="text-info" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-lg">Export Help Guide</h3>
                    <p class="text-sm text-base-content/60">How to export your Timeline data</p>
                  </div>
                </div>

                <!-- Platform Tabs -->
                <div class="bg-base-200/80 rounded-xl p-1 mb-4">
                  <div class="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      class="py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                      [class]="helpPlatform() === 'android'
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'text-base-content/70 hover:bg-base-300/50'"
                      (click)="helpPlatform.set('android')"
                    >
                      Android
                    </button>
                    <button
                      type="button"
                      class="py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                      [class]="helpPlatform() === 'ios'
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'text-base-content/70 hover:bg-base-300/50'"
                      (click)="helpPlatform.set('ios')"
                    >
                      iOS
                    </button>
                    <button
                      type="button"
                      class="py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                      [class]="helpPlatform() === 'web'
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'text-base-content/70 hover:bg-base-300/50'"
                      (click)="helpPlatform.set('web')"
                    >
                      Takeout
                    </button>
                  </div>
                </div>

                <!-- Platform Content -->
                <div class="rounded-xl bg-base-100/80 border border-base-300/50 p-5">
                  @if (helpPlatform() === 'android') {
                    <div>
                      <h4 class="font-bold text-sm mb-3">Export from Settings App</h4>
                      <ol class="space-y-3 text-sm">
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">1</span><span>On your Android phone or tablet, open the Settings app</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">2</span><span>Tap "Location"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">3</span><span>Tap "Location services"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">4</span><span>Tap "Timeline"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">5</span><span>Under "Timeline," tap "Export Timeline data"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">6</span><span>Tap "Continue"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">7</span><span>Select your preferred storage location</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">8</span><span>Tap "Save"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">9</span><span>Wait for the "Export complete" notification</span></li>
                      </ol>
                    </div>
                  }

                  @if (helpPlatform() === 'ios') {
                    <div>
                      <h4 class="font-bold text-sm mb-3">Export from Google Maps App</h4>
                      <ol class="space-y-3 text-sm">
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">1</span><span>On your iPhone or iPad, open the Google Maps app</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">2</span><span>Tap your profile picture or initial</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">3</span><span>Tap "Settings"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">4</span><span>Under "Account Settings," tap "Personal content"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">5</span><span>Under "Location settings," tap "Export Timeline data"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">6</span><span>On the iOS share sheet, tap "Save to Files"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">7</span><span>Select your preferred storage location</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">8</span><span>At the top right, tap "Save"</span></li>
                        <li class="flex gap-3"><span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">9</span><span>Your exported Timeline data is saved as "location-history.json"</span></li>
                      </ol>
                    </div>
                  }

                  @if (helpPlatform() === 'web') {
                    <div class="rounded-xl bg-warning/10 border border-warning/20 p-4 mb-4">
                      <div class="flex gap-3">
                        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/15 shrink-0">
                          <ng-icon name="heroExclamationTriangle" size="20" class="text-warning" />
                        </div>
                        <div>
                          <h4 class="font-semibold text-sm">Timeline Not Available on Web</h4>
                          <p class="text-xs text-base-content/70 mt-1">
                            Since the data shown on your Google Maps Timeline comes directly from your device, Timeline is not available for Maps on your computer. To use Google Maps Timeline, download the Google Maps app on your Android or iOS device.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p class="text-sm text-base-content/70">
                      Please use the Android or iOS tabs above to learn how to export your Timeline data from your mobile device.
                    </p>
                  }
                </div>

                <!-- Privacy Note -->
                <div class="mt-4 rounded-xl bg-success/10 border border-success/20 p-4">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-success/15 shrink-0">
                      <ng-icon name="heroShieldCheck" size="16" class="text-success" />
                    </div>
                    <p class="text-xs text-base-content/60">
                      <strong class="text-success">Privacy:</strong> Your Timeline data is processed locally. Only verified brewery/winery visits are saved - no raw location data is stored.
                    </p>
                  </div>
                </div>
              </div>
            }

            @if (activeTab() === 'account') {
              <app-account-settings />
            }
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-6 px-4">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-base-content/50">
            <div class="flex items-center gap-2">
              <img src="/assets/icons/icon-72x72.png" alt="Blastoise" class="w-5 h-5 rounded opacity-60" />
              <span class="font-medium">Blastoise</span>
            </div>
            <div class="flex gap-6">
              <a href="/privacy" class="hover:text-primary transition-colors">Privacy</a>
              <a href="/terms" class="hover:text-primary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  standalone: true,
})
export class SettingsComponent {
  readonly activeTab = signal<'privacy' | 'notifications' | 'data' | 'account'>('privacy');
  readonly helpPlatform = signal<'web' | 'android' | 'ios'>('android');
}
