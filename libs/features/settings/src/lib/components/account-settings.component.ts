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
      <div class="flex items-center gap-3 mb-6">
        <div class="avatar placeholder">
          <div class="bg-primary/10 text-primary rounded-lg w-12 flex items-center justify-center">
            <ng-icon name="heroUser" size="24" />
          </div>
        </div>
        <div>
          <h2 class="text-2xl font-bold">Account Settings</h2>
          <p class="text-sm text-base-content/60">
            Manage your account and profile
          </p>
        </div>
      </div>

      <!-- Account Information (Authenticated Users) -->
      @if (authState.isAuthenticated()) {
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body p-4">
            <div class="flex items-center gap-2 mb-4">
              <ng-icon name="heroCheckBadge" size="20" class="text-primary" />
              <h3 class="font-semibold text-lg">Account Information</h3>
            </div>

            <div class="space-y-4">
              <!-- Email -->
              <div class="flex items-center justify-between py-3 border-b border-base-300">
                <div>
                  <div class="font-medium">Email</div>
                  <div class="text-sm text-base-content/60">{{ userEmail() || 'Not available' }}</div>
                </div>
                <div class="badge badge-success">Verified</div>
              </div>

              <!-- Member Since -->
              <div class="flex items-center justify-between py-3">
                <div>
                  <div class="font-medium">Member Since</div>
                  <div class="text-sm text-base-content/60">{{ memberSince() }}</div>
                </div>
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
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body p-4">
          <div class="flex items-center gap-2 mb-4">
            <ng-icon name="heroShieldCheck" size="20" class="text-primary" />
            <h3 class="font-semibold text-lg">Account Actions</h3>
          </div>

          <div class="space-y-3">
            <!-- Logout -->
            @if (authState.isAuthenticated()) {
              <button
                class="btn btn-outline btn-block justify-start gap-3"
                (click)="onLogout()"
              >
                <ng-icon name="heroArrowRightOnRectangle" size="20" />
                <span>Sign Out</span>
              </button>
            }

            <!-- Delete Account -->
            @if (authState.isAuthenticated()) {
              <button
                class="btn btn-outline btn-error btn-block justify-start gap-3"
                (click)="onDeleteAccount()"
              >
                <ng-icon name="heroTrash" size="20" />
                <span>Delete Account</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Privacy Notice -->
      <div class="alert alert-info shadow-sm">
        <ng-icon name="heroShieldCheck" size="24" class="shrink-0" />
        <div>
          <h4 class="font-bold">Your Data is Private</h4>
          <p class="text-sm">We never share your personal information. All visit data is encrypted and stored securely.</p>
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
