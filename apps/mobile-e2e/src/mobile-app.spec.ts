/* eslint-disable playwright/expect-expect */
/* eslint-disable playwright/no-skipped-test */
import { test, expect } from '@playwright/test';

/**
 * Mobile E2E Tests
 *
 * These tests verify the mobile app functionality.
 * Currently skipped - to be implemented when mobile-specific features are ready.
 *
 * Tests will cover:
 * - Mobile app loads successfully
 * - Touch interactions work correctly
 * - Native features (geolocation, notifications) work
 * - Offline mode functions properly
 * - App behaves correctly on different screen sizes
 */

test.describe.skip('Mobile App Basic Tests', () => {
  test.beforeEach(async ({ context }) => {
    // Grant geolocation permission for all tests
    await context.grantPermissions(['geolocation']);

    // Set mock geolocation (San Francisco)
    await context.setGeolocation({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  test('should load mobile app successfully', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Verify app loads
    await expect(page).toHaveTitle(/Blastoise/i);
  });

  test('should display mobile-optimized UI', async ({ page }) => {
    await page.goto('/');

    // Verify mobile viewport is detected
    // TODO: Implement mobile-specific UI checks
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.goto('/');

    // TODO: Test swipe gestures, tap interactions, etc.
  });

  test('should work offline', async ({ page, context }) => {
    await page.goto('/');

    // Go offline
    await context.setOffline(true);

    // TODO: Verify offline functionality
    // - Can view cached visits
    // - Can record new visits locally
    // - Shows offline indicator
  });

  test('should sync when coming back online', async ({ page }) => {
    await page.goto('/');

    // TODO: Test offline-to-online sync
    // - Record visits while offline
    // - Come back online
    // - Verify visits sync to backend
  });
});
