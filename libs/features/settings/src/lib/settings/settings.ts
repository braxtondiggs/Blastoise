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
  heroExclamationTriangle,
} from '@ng-icons/heroicons/outline';
import { PrivacySettings } from '../components/privacy-settings';
import { NotificationSettingsComponent } from '../components/notification-settings.component';
import { AccountSettingsComponent } from '../components/account-settings.component';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, NgIconComponent, RouterLink, PrivacySettings, NotificationSettingsComponent, AccountSettingsComponent],
  viewProviders: [provideIcons({ heroShieldCheck, heroBell, heroUser, heroCog6Tooth, heroCloudArrowUp, heroArrowRight, heroClock, heroExclamationTriangle })],
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
        <div class="tabs tabs-box bg-base-200 shadow-lg mb-6 p-2 gap-2">
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
            [class.tab-active]="activeTab() === 'data'"
            (click)="activeTab.set('data')"
          >
            <ng-icon name="heroCloudArrowUp" size="20" />
            <span class="hidden sm:inline">Data</span>
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

            @if (activeTab() === 'data') {
              <!-- Data Management Tab -->
              <h2 class="text-2xl font-bold mb-4">Data Management</h2>
              <p class="text-base-content/70 mb-6">
                Import your visit history from other services
              </p>

              <!-- Import Card -->
              <div class="card bg-base-300 shadow-md hover:shadow-lg transition-shadow mb-4">
                <div class="card-body">
                  <div class="flex items-start gap-4">
                    <div class="avatar placeholder">
                      <div class="bg-primary text-primary-content rounded-lg w-12 flex items-center justify-center">
                        <ng-icon name="heroCloudArrowUp" size="24" />
                      </div>
                    </div>
                    <div class="flex-1">
                      <h3 class="card-title text-lg">Import Google Timeline</h3>
                      <p class="text-sm text-base-content/70 mt-1">
                        Import your brewery and winery visits from Google Timeline JSON exports
                      </p>
                      <a
                        routerLink="/settings/import"
                        class="btn btn-primary btn-sm mt-4 gap-2"
                      >
                        Start Import
                        <ng-icon name="heroArrowRight" size="16" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Import History Card -->
              <div class="card bg-base-300 shadow-md hover:shadow-lg transition-shadow mb-4">
                <div class="card-body">
                  <div class="flex items-start gap-4">
                    <div class="avatar placeholder">
                      <div class="bg-secondary text-secondary-content rounded-lg w-12 flex items-center justify-center">
                        <ng-icon name="heroClock" size="24" />
                      </div>
                    </div>
                    <div class="flex-1">
                      <h3 class="card-title text-lg">Import History</h3>
                      <p class="text-sm text-base-content/70 mt-1">
                        View your past imports and audit your data
                      </p>
                      <a
                        routerLink="/settings/import-history"
                        class="btn btn-secondary btn-sm mt-4 gap-2"
                      >
                        View History
                        <ng-icon name="heroArrowRight" size="16" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Help Guide: How to Get Google Timeline Data -->
              <div class="card bg-info/10 border border-info/20 shadow-md mt-6">
                <div class="card-body">
                  <h3 class="card-title text-lg flex items-center gap-2">
                    <ng-icon name="heroShieldCheck" size="20" class="text-info" />
                    How to Export Your Google Timeline Data
                  </h3>
                  <p class="text-sm text-base-content/70 mb-4">
                    Before importing, you need to export your Google Timeline data. Choose your platform:
                  </p>

                  <!-- Platform Tabs -->
                  <div class="tabs tabs-box bg-base-200/50 mb-4">
                    <button
                      class="tab tab-sm"
                      [class.tab-active]="helpPlatform() === 'web'"
                      (click)="helpPlatform.set('web')"
                    >
                      Web (Google Takeout)
                    </button>
                    <button
                      class="tab tab-sm"
                      [class.tab-active]="helpPlatform() === 'android'"
                      (click)="helpPlatform.set('android')"
                    >
                      Android
                    </button>
                    <button
                      class="tab tab-sm"
                      [class.tab-active]="helpPlatform() === 'ios'"
                      (click)="helpPlatform.set('ios')"
                    >
                      iOS
                    </button>
                  </div>

                  <!-- Web Instructions (No longer available) -->
                  @if (helpPlatform() === 'web') {
                    <div class="bg-base-200/50 rounded-lg p-4">
                      <div class="alert alert-warning mb-4">
                        <ng-icon name="heroExclamationTriangle" size="20" />
                        <div class="text-sm">
                          <strong>Timeline Not Available on Web</strong>
                          <p class="mt-1">Since the data shown on your Google Maps Timeline comes directly from your device, Timeline is not available for Maps on your computer. To use Google Maps Timeline, download the Google Maps app on your Android or iOS device.</p>
                        </div>
                      </div>
                      <p class="text-sm text-base-content/70">
                        Please use the Android or iOS tabs above to learn how to export your Timeline data from your mobile device.
                      </p>
                    </div>
                  }

                  <!-- Android Instructions -->
                  @if (helpPlatform() === 'android') {
                    <div class="bg-base-200/50 rounded-lg p-4">
                      <h4 class="font-bold text-sm mb-3">Export from Settings App</h4>
                      <ol class="list-decimal list-inside space-y-2 text-sm">
                        <li>On your Android phone or tablet, open the Settings app</li>
                        <li>Tap "Location"</li>
                        <li>Tap "Location services"</li>
                        <li>Tap "Timeline"</li>
                        <li>Under "Timeline," tap "Export Timeline data"</li>
                        <li>Tap "Continue"</li>
                        <li>Select your preferred storage location</li>
                        <li>Tap "Save"</li>
                        <li>Wait for the "Export complete" notification</li>
                      </ol>
                    </div>
                  }

                  <!-- iOS Instructions -->
                  @if (helpPlatform() === 'ios') {
                    <div class="bg-base-200/50 rounded-lg p-4">
                      <h4 class="font-bold text-sm mb-3">Export from Google Maps App</h4>
                      <ol class="list-decimal list-inside space-y-2 text-sm">
                        <li>On your iPhone or iPad, open the Google Maps app</li>
                        <li>Tap your profile picture or initial</li>
                        <li>Tap "Settings"</li>
                        <li>Under "Account Settings," tap "Personal content"</li>
                        <li>Under "Location settings," tap "Export Timeline data"</li>
                        <li>On the iOS share sheet, tap "Save to Files"</li>
                        <li>Select your preferred storage location</li>
                        <li>At the top right, tap "Save"</li>
                        <li>Your exported Timeline data is saved as "location-history.json"</li>
                      </ol>
                    </div>
                  }

                  <!-- Privacy Notice -->
                  <div class="bg-success/10 border border-success/20 rounded-lg p-3 mt-4">
                    <div class="flex items-start gap-2">
                      <ng-icon name="heroShieldCheck" size="16" class="text-success mt-0.5" />
                      <div class="text-xs text-base-content/80">
                        <strong class="text-success">Privacy First:</strong> Your Timeline data is processed locally and on our servers.
                        We only store venue IDs and rounded timestamps—never your precise GPS coordinates.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Coming Soon -->
              <div class="mt-6">
                <h3 class="font-semibold text-sm text-base-content/60 mb-2">Coming Soon</h3>
                <div class="card bg-base-300/50 shadow-sm opacity-60">
                  <div class="card-body p-4">
                    <div class="flex items-center gap-3">
                      <div class="badge badge-ghost">Coming Soon</div>
                      <span class="text-sm">Apple Maps Timeline Import</span>
                    </div>
                  </div>
                </div>
              </div>
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
                <span class="font-medium">Blastoise</span>
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
  readonly activeTab = signal<'privacy' | 'notifications' | 'data' | 'account'>('privacy');
  readonly helpPlatform = signal<'web' | 'android' | 'ios'>('android');
}
