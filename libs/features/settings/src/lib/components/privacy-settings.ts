/**
 * User privacy preferences including:
 * - Sharing default preferences (never, ask, always)
 * - Location tracking settings
 * - Data retention preferences
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMapPin, heroGlobeAlt, heroShare, heroCalendar, heroShieldCheck } from '@ng-icons/heroicons/outline';
import { PreferencesService, type UserPreferences } from '../services/preferences.service';

@Component({
  selector: 'app-privacy-settings',
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({ heroMapPin, heroGlobeAlt, heroShare, heroCalendar, heroShieldCheck })],
  template: `
    <div class="space-y-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="avatar placeholder">
          <div class="bg-primary/10 text-primary rounded-lg w-12 flex items-center justify-center">
            <ng-icon name="heroShieldCheck" size="24" />
          </div>
        </div>
        <div>
          <h2 class="text-2xl font-bold">Privacy Settings</h2>
          <p class="text-sm text-base-content/60">
            Control how your data is used and shared
          </p>
        </div>
      </div>

      <!-- Location Settings Card -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body p-4">
          <div class="flex items-center gap-2 mb-3">
            <ng-icon name="heroMapPin" size="20" class="text-primary" />
            <h3 class="font-semibold text-lg">Location Tracking</h3>
          </div>

          <div class="space-y-4">
            <!-- Location Tracking -->
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  [(ngModel)]="preferences().locationTrackingEnabled"
                  (change)="savePreferences()"
                />
                <span class="label-text">
                  <div class="font-medium">Enable automatic visit detection</div>
                  <div class="text-sm text-base-content/60">Track brewery visits automatically</div>
                </span>
              </label>
            </div>

            <!-- Background Tracking -->
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  [(ngModel)]="preferences().backgroundTrackingEnabled"
                  (change)="savePreferences()"
                  [disabled]="!preferences().locationTrackingEnabled"
                />
                <span class="label-text">
                  <div class="font-medium">Background tracking</div>
                  <div class="text-sm text-base-content/60">Continue tracking when app is closed</div>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Sharing Settings Card -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body p-4">
          <div class="flex items-center gap-2 mb-4">
            <ng-icon name="heroShare" size="20" class="text-primary" />
            <h3 class="font-semibold text-lg">Sharing Preferences</h3>
          </div>

          <p class="text-sm text-base-content/60 mb-4">Choose when you want to share visits with others</p>

          <div class="space-y-3">
            <label class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-base-200"
                   [class.border-primary]="preferences().sharingPreference === 'never'"
                   [class.bg-primary/5]="preferences().sharingPreference === 'never'"
                   [class.border-base-300]="preferences().sharingPreference !== 'never'">
              <input
                type="radio"
                name="sharing"
                value="never"
                class="radio radio-primary"
                [(ngModel)]="preferences().sharingPreference"
                (change)="savePreferences()"
              />
              <div class="flex-1">
                <div class="font-medium">Never share automatically</div>
                <div class="text-sm text-base-content/60">Keep all visits private by default</div>
              </div>
            </label>

            <label class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-base-200"
                   [class.border-primary]="preferences().sharingPreference === 'ask'"
                   [class.bg-primary/5]="preferences().sharingPreference === 'ask'"
                   [class.border-base-300]="preferences().sharingPreference !== 'ask'">
              <input
                type="radio"
                name="sharing"
                value="ask"
                class="radio radio-primary"
                [(ngModel)]="preferences().sharingPreference"
                (change)="savePreferences()"
              />
              <div class="flex-1">
                <div class="font-medium">Ask me each time</div>
                <div class="text-sm text-base-content/60">Review sharing on a per-visit basis</div>
              </div>
            </label>

            <label class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-base-200"
                   [class.border-primary]="preferences().sharingPreference === 'always'"
                   [class.bg-primary/5]="preferences().sharingPreference === 'always'"
                   [class.border-base-300]="preferences().sharingPreference !== 'always'">
              <input
                type="radio"
                name="sharing"
                value="always"
                class="radio radio-primary"
                [(ngModel)]="preferences().sharingPreference"
                (change)="savePreferences()"
              />
              <div class="flex-1">
                <div class="font-medium">Always allow sharing</div>
                <div class="text-sm text-base-content/60">Automatically share all visits</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Data Retention Card -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body p-4">
          <div class="flex items-center gap-2 mb-4">
            <ng-icon name="heroCalendar" size="20" class="text-primary" />
            <h3 class="font-semibold text-lg">Data Retention</h3>
          </div>

          <p class="text-sm text-base-content/60 mb-4">How long to keep your visit history</p>

          <div class="relative">
            <select
              class="select select-bordered select-lg w-full font-semibold text-base focus:select-primary transition-all"
              [(ngModel)]="preferences().dataRetentionMonths"
              (change)="savePreferences()"
            >
              <option [ngValue]="1">1 month</option>
              <option [ngValue]="3">3 months</option>
              <option [ngValue]="6">6 months</option>
              <option [ngValue]="12">1 year</option>
              <option [ngValue]="24">2 years</option>
              <option [ngValue]="null">Forever - Keep all history</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <ng-icon name="heroCalendar" size="20" class="text-base-content/40" />
            </div>
          </div>

          @if (preferences().dataRetentionMonths !== null) {
            <div class="mt-3 text-xs text-base-content/50 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Older visits will be automatically deleted after this period</span>
            </div>
          }
        </div>
      </div>

      <!-- Privacy Notice -->
      <div class="alert alert-info shadow-sm">
        <ng-icon name="heroShieldCheck" size="24" class="shrink-0" />
        <div>
          <h4 class="font-bold">Your Privacy Matters</h4>
          <p class="text-sm">GPS coordinates are never stored or shared. Only venue names and approximate dates are saved.</p>
        </div>
      </div>

      @if (saveStatus() === 'saving') {
        <div class="alert alert-info">
          <span class="loading loading-spinner"></span>
          <span>Saving preferences...</span>
        </div>
      }

      @if (saveStatus() === 'saved') {
        <div class="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Preferences saved successfully!</span>
        </div>
      }

      @if (saveStatus() === 'error') {
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
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
