/* eslint-disable playwright/no-skipped-test */
/**
 * Tests for user preferences configuration:
 * - Privacy settings (sharing defaults)
 * - Notification preferences
 * - Settings persistence
 */

import { test, expect } from '@playwright/test';

test.describe.skip('Settings and Sharing Preferences E2E Tests', () => {
  const baseUrl = 'http://localhost:4200';

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${baseUrl}/auth/login`);

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/visits**');

    // Navigate to settings
    await page.goto(`${baseUrl}/settings`);
    await page.waitForSelector('h1:has-text("Settings"), h2:has-text("Settings")', { timeout: 5000 });
  });

  test.describe('T216: Sharing Preferences', () => {
    test('should display privacy settings section', async ({ page }) => {
      // Look for privacy settings
      await expect(page.locator('h2:has-text("Privacy"), h3:has-text("Privacy")')).toBeVisible();

      // Should have sharing preference controls
      await expect(page.locator('text=/Sharing|Share/')).toBeVisible();
    });

    test('should have "never", "ask", and "always" sharing options', async ({ page }) => {
      // Find sharing preference dropdown or radio buttons
      const sharingControl = page.locator('select, [role="radiogroup"]').filter({ hasText: /share|sharing/i }).first();

      await expect(sharingControl).toBeVisible();

      // Check for all three options
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toContain('never');
      expect(pageContent.toLowerCase()).toContain('ask');
      expect(pageContent.toLowerCase()).toContain('always');
    });

    test('should default to "ask" for sharing preference', async ({ page }) => {
      // Find the sharing preference control
      const sharingSelect = page.locator('select[aria-label*="sharing" i], select:near(text="Sharing")').first();

      if (await sharingSelect.isVisible()) {
        const value = sharingSelect;
        await expect(value).toHaveValue('ask');
      } else {
        // Check radio button
        const askRadio = page.locator('input[type="radio"][value="ask"]');
        await expect(askRadio).toBeChecked();
      }
    });

    test('should allow changing sharing preference to "never"', async ({ page }) => {
      // Change to "never"
      const sharingSelect = page.locator('select[aria-label*="sharing" i], select:near(text="Sharing")').first();

      if (await sharingSelect.isVisible()) {
        await sharingSelect.selectOption('never');
      } else {
        // Click "never" radio
        await page.click('input[type="radio"][value="never"], label:has-text("Never")');
      }

      // Save settings
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();

      // Should show success message
      await expect(page.locator('.alert-success, text=/saved|success/i')).toBeVisible({ timeout: 5000 });
    });

    test('should allow changing sharing preference to "always"', async ({ page }) => {
      // Change to "always"
      const sharingSelect = page.locator('select[aria-label*="sharing" i], select:near(text="Sharing")').first();

      if (await sharingSelect.isVisible()) {
        await sharingSelect.selectOption('always');
      } else {
        await page.click('input[type="radio"][value="always"], label:has-text("Always")');
      }

      // Save settings
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();

      // Should show success message
      await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
    });

    test('should persist sharing preference after page reload', async ({ page }) => {
      // Set to "never"
      const sharingSelect = page.locator('select[aria-label*="sharing" i], select:near(text="Sharing")').first();

      if (await sharingSelect.isVisible()) {
        await sharingSelect.selectOption('never');
      } else {
        await page.click('input[type="radio"][value="never"], label:has-text("Never")');
      }

      // Save
      await page.click('button:has-text("Save")');
      await page.waitForSelector('.alert-success', { timeout: 5000 });

      // Reload page
      await page.reload();
      await page.waitForSelector('h1:has-text("Settings"), h2:has-text("Settings")');

      // Verify preference is still "never"
      if (await sharingSelect.isVisible()) {
        const value = sharingSelect;
        await expect(value).toHaveValue('never');
      } else {
        const neverRadio = page.locator('input[type="radio"][value="never"]');
        await expect(neverRadio).toBeChecked();
      }
    });

    test('should display data retention options', async ({ page }) => {
      // Look for data retention settings
      await expect(page.locator('text=/data retention|keep.*data|delete.*data/i')).toBeVisible();
    });

    test('should allow disabling location tracking', async ({ page }) => {
      // Find location tracking toggle
      const trackingToggle = page.locator('input[type="checkbox"][aria-label*="tracking" i], input[type="checkbox"]:near(text="Location")').first();

      if (await trackingToggle.isVisible()) {
        // Toggle off
        await trackingToggle.uncheck();

        // Save
        await page.click('button:has-text("Save")');

        // Success message
        await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Notification Preferences', () => {
    test('should display notification settings section', async ({ page }) => {
      // Navigate to notification settings tab/section
      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');

      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      // Should show notification preferences
      await expect(page.locator('h2:has-text("Notification"), h3:has-text("Notification")')).toBeVisible({ timeout: 5000 });
    });

    test('should have visit detected notification toggle (default ON)', async ({ page }) => {
      // Find notification settings
      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      // Visit detected toggle
      const visitDetectedToggle = page.locator('input[type="checkbox"][aria-label*="visit detected" i], input:near(text="Visit Detected")').first();

      await expect(visitDetectedToggle).toBeVisible();
      // Should be checked by default
      await expect(visitDetectedToggle).toBeChecked();
    });

    test('should have visit ended notification toggle (default ON)', async ({ page }) => {
      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      const visitEndedToggle = page.locator('input[type="checkbox"][aria-label*="visit ended" i], input:near(text="Visit Ended")').first();

      await expect(visitEndedToggle).toBeVisible();
      await expect(visitEndedToggle).toBeChecked();
    });

    test('should have new venues notification toggle (default OFF)', async ({ page }) => {
      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      const newVenuesToggle = page.locator('input[type="checkbox"][aria-label*="new venues" i], input:near(text="New")').first();

      await expect(newVenuesToggle).toBeVisible();
      // Should NOT be checked by default
      await expect(newVenuesToggle).not.toBeChecked();
    });

    test('should have weekly summary notification toggle (default OFF)', async ({ page }) => {
      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      const weeklySummaryToggle = page.locator('input[type="checkbox"][aria-label*="weekly" i], input:near(text="Weekly")').first();

      await expect(weeklySummaryToggle).toBeVisible();
      await expect(weeklySummaryToggle).not.toBeChecked();
    });

    test('should have sharing activity notification toggle (default OFF)', async ({ page }) => {
      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      const sharingActivityToggle = page.locator('input[type="checkbox"][aria-label*="sharing" i], input:near(text="Sharing")').first();

      await expect(sharingActivityToggle).toBeVisible();
      await expect(sharingActivityToggle).not.toBeChecked();
    });

    test('should allow toggling notification preferences', async ({ page }) => {
      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      // Toggle weekly summary ON
      const weeklySummaryToggle = page.locator('input[type="checkbox"][aria-label*="weekly" i]').first();
      await weeklySummaryToggle.check();

      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });

      // Reload and verify
      await page.reload();

      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      await expect(weeklySummaryToggle).toBeChecked();
    });

    test('should show warning if system notifications are blocked', async ({ page, context }) => {
      // Mock notification permission as denied
      await context.grantPermissions([]);

      const notificationTab = page.locator('button:has-text("Notifications"), a:has-text("Notifications")');
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
      }

      // Should show warning about blocked notifications
      await expect(page.locator('.alert-warning:has-text("blocked"), .alert-warning:has-text("permission")')).toBeVisible();
    });

    test('should allow resetting to default preferences', async ({ page }) => {
      // Change some settings first
      const sharingSelect = page.locator('select[aria-label*="sharing" i]').first();
      if (await sharingSelect.isVisible()) {
        await sharingSelect.selectOption('never');
      }

      // Save
      await page.click('button:has-text("Save")');
      await page.waitForSelector('.alert-success');

      // Click reset button
      const resetButton = page.locator('button:has-text("Reset"), button:has-text("Default")');
      if (await resetButton.isVisible()) {
        await resetButton.click();

        // Confirm dialog
        await page.click('button:has-text("Yes"), button:has-text("Confirm"), button:has-text("OK")');

        // Should reset to "ask"
        await page.waitForTimeout(1000);
        const value = sharingSelect;
        await expect(value).toHaveValue('ask');
      }
    });
  });

  test.describe('Settings Persistence', () => {
    test('should sync settings to backend when authenticated', async ({ page }) => {
      // Change a setting
      const sharingSelect = page.locator('select[aria-label*="sharing" i]').first();
      if (await sharingSelect.isVisible()) {
        await sharingSelect.selectOption('always');
      }

      // Listen for API call
      const apiPromise = page.waitForRequest(request =>
        request.url().includes('/api/v1/user/preferences') &&
        request.method() === 'PATCH'
      );

      // Save
      await page.click('button:has-text("Save")');

      // Wait for API call
      const request = await apiPromise;
      expect(request).toBeTruthy();
    });

    test('should load settings from backend on page load', async ({ page }) => {
      // Settings should be loaded automatically
      await page.waitForSelector('select, input[type="checkbox"]', { timeout: 5000 });

      // No loading spinner should remain
      await expect(page.locator('.loading-spinner')).toBeHidden();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/v1/user/preferences', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // Try to save
      await page.click('button:has-text("Save")');

      // Should show error message
      await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Privacy Explanations', () => {
    test('should provide explanations for each privacy setting', async ({ page }) => {
      // Each setting should have descriptive text
      const sharingPreference = page.locator('text=/sharing preference|share default/i').first();
      await expect(sharingPreference).toBeVisible();

      // Should have explanatory text nearby
      const explanation = page.locator('p, span').filter({ hasText: /never|ask|always/i }).first();
      await expect(explanation).toBeVisible();
    });

    test('should explain data retention options', async ({ page }) => {
      const dataRetention = page.locator('text=/data retention|keep.*data/i').first();

      if (await dataRetention.isVisible()) {
        // Should have explanation
        const explanation = dataRetention.locator('..').locator('p, span').first();
        await expect(explanation).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels on all controls', async ({ page }) => {
      // Check for aria-label on important controls
      const toggles = page.locator('input[type="checkbox"]');
      const count = await toggles.count();

      for (let i = 0; i < count; i++) {
        const toggle = toggles.nth(i);
        const ariaLabel = toggle;
        await expect(ariaLabel).toHaveAttribute('aria-label', );
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through settings
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should focus on interactive element
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT', 'SELECT', 'A']).toContain(focused);
    });
  });
});
