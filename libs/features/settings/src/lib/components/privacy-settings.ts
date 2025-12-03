/**
 * User privacy preferences including:
 * - Sharing default preferences (never, ask, always)
 * - Location tracking settings
 * - Data retention preferences
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMapPin, heroGlobeAlt, heroShare, heroCalendar, heroShieldCheck } from '@ng-icons/heroicons/outline';
import { PreferencesService, type UserPreferences } from '../services/preferences.service';

@Component({
  selector: 'app-privacy-settings',
  imports: [CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ heroMapPin, heroGlobeAlt, heroShare, heroCalendar, heroShieldCheck })],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
          <ng-icon name="heroShieldCheck" size="24" class="text-primary" />
        </div>
        <div>
          <h2 class="text-2xl font-bold">Privacy Settings</h2>
          <p class="text-sm text-base-content/60">Control how your data is used and shared</p>
        </div>
      </div>

      <!-- Location Settings Card -->
      <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
        <div class="p-4 border-b border-base-300/50 bg-base-200/30">
          <div class="flex items-center gap-2">
            <ng-icon name="heroMapPin" size="18" class="text-primary" />
            <h3 class="font-semibold">Location Tracking</h3>
          </div>
        </div>
        <div class="p-4 space-y-1">
          <!-- Location Tracking -->
          <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors">
            <div class="flex-1 pr-4">
              <div class="font-medium text-sm">Automatic visit detection</div>
              <div class="text-xs text-base-content/60 mt-0.5">Track brewery and winery visits automatically</div>
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              [checked]="preferences().locationTrackingEnabled"
              (change)="updatePreference('locationTrackingEnabled', $any($event.target).checked)"
            />
          </label>

          <!-- Background Tracking -->
          <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors"
                 [class.opacity-50]="!preferences().locationTrackingEnabled">
            <div class="flex-1 pr-4">
              <div class="font-medium text-sm">Background tracking</div>
              <div class="text-xs text-base-content/60 mt-0.5">Continue tracking when app is closed</div>
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              [checked]="preferences().backgroundTrackingEnabled"
              (change)="updatePreference('backgroundTrackingEnabled', $any($event.target).checked)"
              [disabled]="!preferences().locationTrackingEnabled"
            />
          </label>
        </div>
      </div>

      <!-- Sharing Settings Card -->
      <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
        <div class="p-4 border-b border-base-300/50 bg-base-200/30">
          <div class="flex items-center gap-2">
            <ng-icon name="heroShare" size="18" class="text-primary" />
            <h3 class="font-semibold">Sharing Preferences</h3>
          </div>
          <p class="text-xs text-base-content/60 mt-1">Choose when you want to share visits</p>
        </div>
        <div class="p-4 space-y-2">
          <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                 [class]="preferences().sharingPreference === 'never'
                   ? 'bg-primary/10 border-2 border-primary/30'
                   : 'bg-base-200/30 border-2 border-transparent hover:bg-base-200/50'">
            <input
              type="radio"
              name="sharing"
              value="never"
              class="radio radio-primary radio-sm"
              [checked]="preferences().sharingPreference === 'never'"
              (change)="updatePreference('sharingPreference', 'never')"
            />
            <div class="flex-1">
              <div class="font-medium text-sm">Never share automatically</div>
              <div class="text-xs text-base-content/60">Keep all visits private by default</div>
            </div>
          </label>

          <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                 [class]="preferences().sharingPreference === 'ask'
                   ? 'bg-primary/10 border-2 border-primary/30'
                   : 'bg-base-200/30 border-2 border-transparent hover:bg-base-200/50'">
            <input
              type="radio"
              name="sharing"
              value="ask"
              class="radio radio-primary radio-sm"
              [checked]="preferences().sharingPreference === 'ask'"
              (change)="updatePreference('sharingPreference', 'ask')"
            />
            <div class="flex-1">
              <div class="font-medium text-sm">Ask me each time</div>
              <div class="text-xs text-base-content/60">Review sharing on a per-visit basis</div>
            </div>
          </label>

          <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                 [class]="preferences().sharingPreference === 'always'
                   ? 'bg-primary/10 border-2 border-primary/30'
                   : 'bg-base-200/30 border-2 border-transparent hover:bg-base-200/50'">
            <input
              type="radio"
              name="sharing"
              value="always"
              class="radio radio-primary radio-sm"
              [checked]="preferences().sharingPreference === 'always'"
              (change)="updatePreference('sharingPreference', 'always')"
            />
            <div class="flex-1">
              <div class="font-medium text-sm">Always allow sharing</div>
              <div class="text-xs text-base-content/60">Automatically share all visits</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Data Retention Card -->
      <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
        <div class="p-4 border-b border-base-300/50 bg-base-200/30">
          <div class="flex items-center gap-2">
            <ng-icon name="heroCalendar" size="18" class="text-primary" />
            <h3 class="font-semibold">Data Retention</h3>
          </div>
          <p class="text-xs text-base-content/60 mt-1">How long to keep your visit history</p>
        </div>
        <div class="p-4">
          <select
            class="select select-bordered w-full bg-base-100"
            [value]="preferences().dataRetentionMonths ?? 'null'"
            (change)="updateDataRetention($any($event.target).value)"
          >
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">1 year</option>
            <option value="24">2 years</option>
            <option value="null">Forever - Keep all history</option>
          </select>

          @if (preferences().dataRetentionMonths !== null) {
            <div class="mt-3 flex items-center gap-2 text-xs text-base-content/50">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Older visits will be automatically deleted</span>
            </div>
          }
        </div>
      </div>

      <!-- Privacy Notice -->
      <div class="rounded-xl bg-gradient-to-r from-info/10 to-info/5 border border-info/20 p-4">
        <div class="flex gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-info/15 shrink-0">
            <ng-icon name="heroShieldCheck" size="20" class="text-info" />
          </div>
          <div>
            <h4 class="font-semibold text-sm">Your Privacy Matters</h4>
            <p class="text-xs text-base-content/60 mt-1">GPS coordinates are never stored or shared. Only venue names and approximate dates are saved.</p>
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      @if (saveStatus() === 'saving') {
        <div class="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 text-sm">
          <span class="loading loading-spinner loading-sm"></span>
          <span class="text-base-content/70">Saving preferences...</span>
        </div>
      }

      @if (saveStatus() === 'saved') {
        <div class="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Preferences saved successfully!</span>
        </div>
      }

      @if (saveStatus() === 'error') {
        <div class="flex items-center gap-3 p-3 rounded-xl bg-error/10 border border-error/20 text-sm text-error">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Failed to save preferences. Please try again.</span>
        </div>
      }
    </div>
  `,
  standalone: true,
})
export class PrivacySettings implements OnInit {
  private readonly preferencesService = inject(PreferencesService);

  readonly preferences = signal<UserPreferences>({
    locationTrackingEnabled: true,
    backgroundTrackingEnabled: false,
    sharingPreference: 'ask',
    dataRetentionMonths: null,
    notificationsEnabled: true,
  });

  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  ngOnInit(): void {
    this.loadPreferences();
  }

  private loadPreferences(): void {
    this.preferencesService.getPreferences().subscribe({
      next: (prefs) => {
        this.preferences.set(prefs);
      },
      error: (error) => {
        console.error('Failed to load preferences:', error);
      },
    });
  }

  updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    // Update the signal with merged preferences
    this.preferences.update((current) => ({
      ...current,
      [key]: value,
    }));

    // Save to backend
    this.savePreferences();
  }

  updateDataRetention(value: string): void {
    const months = value === 'null' ? null : parseInt(value, 10);
    this.updatePreference('dataRetentionMonths', months);
  }

  savePreferences(): void {
    this.saveStatus.set('saving');

    this.preferencesService.updatePreferences(this.preferences()).subscribe({
      next: () => {
        this.saveStatus.set('saved');
        setTimeout(() => this.saveStatus.set('idle'), 3000);
      },
      error: (error) => {
        console.error('Failed to save preferences:', error);
        this.saveStatus.set('error');
        setTimeout(() => this.saveStatus.set('idle'), 5000);
      },
    });
  }
}
