/**
 * Account Settings Component
 *
 * Displays account information and actions:
 * - User profile (email, account type)
 * - Upgrade prompt for anonymous users
 * - Logout button
 * - Delete account option
 */

import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroUser, heroArrowRightOnRectangle, heroTrash, heroShieldCheck, heroCheckBadge } from '@ng-icons/heroicons/outline';
import { AuthStateService } from '@blastoise/shared/auth-state';
import { AuthService } from '@blastoise/features-auth';
import { UpgradePrompt } from '@blastoise/features-auth';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, NgIconComponent, UpgradePrompt],
  viewProviders: [provideIcons({ heroUser, heroArrowRightOnRectangle, heroTrash, heroShieldCheck, heroCheckBadge })],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
          <ng-icon name="heroUser" size="24" class="text-primary" />
        </div>
        <div>
          <h2 class="text-2xl font-bold">Account Settings</h2>
          <p class="text-sm text-base-content/60">Manage your account and profile</p>
        </div>
      </div>

      <!-- Account Information (Authenticated Users) -->
      @if (authState.isAuthenticated()) {
        <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
          <div class="p-4 border-b border-base-300/50 bg-base-200/30">
            <div class="flex items-center gap-2">
              <ng-icon name="heroCheckBadge" size="18" class="text-primary" />
              <h3 class="font-semibold">Account Information</h3>
            </div>
          </div>
          <div class="p-4">
            <!-- Email -->
            <div class="flex items-center justify-between p-3 rounded-lg bg-base-200/30 mb-2">
              <div>
                <div class="text-xs text-base-content/50 uppercase tracking-wide">Email</div>
                <div class="font-medium text-sm mt-0.5">{{ userEmail() || 'Not available' }}</div>
              </div>
              <span class="badge badge-success badge-sm gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                Verified
              </span>
            </div>

            <!-- Member Since -->
            <div class="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
              <div>
                <div class="text-xs text-base-content/50 uppercase tracking-wide">Member Since</div>
                <div class="font-medium text-sm mt-0.5">{{ memberSince() }}</div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Upgrade Prompt (Anonymous Users) -->
      @if (authState.isAnonymous()) {
        <lib-upgrade-prompt />
      }

      <!-- Account Actions -->
      <div class="rounded-xl bg-base-100/80 border border-base-300/50 overflow-hidden">
        <div class="p-4 border-b border-base-300/50 bg-base-200/30">
          <div class="flex items-center gap-2">
            <ng-icon name="heroShieldCheck" size="18" class="text-primary" />
            <h3 class="font-semibold">Account Actions</h3>
          </div>
        </div>
        <div class="p-4 space-y-2">
          @if (authState.isAuthenticated()) {
            <!-- Logout -->
            <button
              type="button"
              class="w-full flex items-center gap-3 p-3 rounded-xl bg-base-200/30 hover:bg-base-200/50 transition-colors text-left"
              (click)="onLogout()"
            >
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-base-300/50">
                <ng-icon name="heroArrowRightOnRectangle" size="20" class="text-base-content/70" />
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm">Sign Out</div>
                <div class="text-xs text-base-content/50">Sign out of your account</div>
              </div>
            </button>

            <!-- Delete Account -->
            <button
              type="button"
              class="w-full flex items-center gap-3 p-3 rounded-xl bg-error/5 hover:bg-error/10 border border-error/20 transition-colors text-left group"
              (click)="onDeleteAccount()"
            >
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-error/10 group-hover:bg-error/20 transition-colors">
                <ng-icon name="heroTrash" size="20" class="text-error" />
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm text-error">Delete Account</div>
                <div class="text-xs text-base-content/50">Permanently delete your account and data</div>
              </div>
            </button>
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
            <h4 class="font-semibold text-sm">Your Data is Private</h4>
            <p class="text-xs text-base-content/60 mt-1">We never share your personal information. All visit data is encrypted and stored securely.</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AccountSettingsComponent {
  readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userEmail = computed(() => {
    return this.authState.currentUser()?.email || null;
  });

  readonly memberSince = computed(() => {
    const user = this.authState.currentUser();
    if (!user?.created_at) {
      return 'N/A';
    }
    return new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  async onLogout(): Promise<void> {
    if (confirm('Are you sure you want to sign out?')) {
      await this.authService.signOut();
      this.router.navigate(['/auth/login']);
    }
  }

  async onDeleteAccount(): Promise<void> {
    const confirmation = prompt(
      'This action cannot be undone. All your data will be permanently deleted.\n\nType "DELETE" to confirm:'
    );

    if (confirmation === 'DELETE') {
      try {
        // TODO: Implement actual delete account API call
        console.warn('Delete account not yet implemented');
        alert('Account deletion is not yet implemented. Please contact support.');
      } catch (error) {
        console.error('Failed to delete account:', error);
        alert('Failed to delete account. Please try again.');
      }
    }
  }
}
