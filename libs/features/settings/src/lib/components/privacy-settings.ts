/**
 * T193, T196: Privacy Settings Component
 *
 * User privacy preferences including:
 * - Sharing default preferences (never, ask, always)
 * - Location tracking settings
 * - Data retention preferences
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreferencesService, type UserPreferences } from '../services/preferences.service';

@Component({
  selector: 'app-privacy-settings',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold mb-4">Privacy Settings</h2>
        <p class="text-sm text-gray-600 mb-6">
          Control how your data is used and shared
        </p>
      </div>

      <!-- Location Tracking -->
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">
            <div class="font-medium">Location Tracking</div>
            <div class="text-sm text-gray-500">Enable automatic visit detection</div>
          </span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            [(ngModel)]="preferences().locationTrackingEnabled"
            (change)="savePreferences()"
          />
        </label>
      </div>

      <!-- Background Tracking -->
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">
            <div class="font-medium">Background Tracking</div>
            <div class="text-sm text-gray-500">Continue tracking when app is closed</div>
          </span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            [(ngModel)]="preferences().backgroundTrackingEnabled"
            (change)="savePreferences()"
            [disabled]="!preferences().locationTrackingEnabled"
          />
        </label>
      </div>

      <!-- Sharing Default Preference -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Default Sharing Preference</span>
        </label>
        <select
          class="select select-bordered"
          [(ngModel)]="preferences().sharingPreference"
          (change)="savePreferences()"
        >
          <option value="never">Never share automatically</option>
          <option value="ask">Ask me each time</option>
          <option value="always">Always allow sharing</option>
        </select>
        <label class="label">
          <span class="label-text-alt text-gray-500">
            Choose when you want to share visits with others
          </span>
        </label>
      </div>

      <!-- Data Retention -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Visit History Retention</span>
        </label>
        <select
          class="select select-bordered"
          [(ngModel)]="preferences().dataRetentionMonths"
          (change)="savePreferences()"
        >
          <option [ngValue]="1">1 month</option>
          <option [ngValue]="3">3 months</option>
          <option [ngValue]="6">6 months</option>
          <option [ngValue]="12">1 year</option>
          <option [ngValue]="24">2 years</option>
          <option [ngValue]="null">Keep all history</option>
        </select>
        <label class="label">
          <span class="label-text-alt text-gray-500">
            How long to keep your visit history
          </span>
        </label>
      </div>

      <!-- Privacy Notice -->
      <div class="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="text-sm">
          <p class="font-semibold">Your Privacy Matters</p>
          <p>GPS coordinates are never stored or shared. Only venue names and approximate dates are saved.</p>
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
