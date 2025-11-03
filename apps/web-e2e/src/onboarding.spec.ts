/* eslint-disable playwright/no-skipped-test */
import { test, expect } from '@playwright/test';

/**
 * T119: E2E Test for Onboarding Flow
 *
 * Tests the complete user onboarding experience:
 * 1. First-time user lands on app
 * 2. Sees onboarding welcome screen
 * 3. Learns about location permissions
 * 4. Grants location permissions
 * 5. Completes onboarding
 * 6. Lands on main app (visits timeline)
 */

test.describe.skip('T119: Onboarding Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Grant geolocation permission for all tests
    await context.grantPermissions(['geolocation']);

    // Set mock geolocation (San Francisco)
    await context.setGeolocation({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  test('should complete onboarding flow for new user', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Should redirect to onboarding for new users
    await expect(page).toHaveURL(/.*onboarding/);

    // STEP 1: Welcome screen
    await expect(
      page.getByRole('heading', { name: /welcome/i })
    ).toBeVisible();
    await expect(
      page.getByText(/track your brewery and winery visits/i)
    ).toBeVisible();

    // Click "Get Started"
    await page.getByRole('button', { name: /get started/i }).click();

    // STEP 2: Location permission education
    await expect(
      page.getByRole('heading', { name: /location permission/i })
    ).toBeVisible();
    await expect(
      page.getByText(/we need access to your location/i)
    ).toBeVisible();

    // Verify privacy explanation is visible
    await expect(
      page.getByText(/we only store venue names/i)
    ).toBeVisible();
    await expect(page.getByText(/no precise gps/i)).toBeVisible();

    // Click "Enable Location"
    await page.getByRole('button', { name: /enable location/i }).click();

    // Browser permission prompt appears (automatically granted in beforeEach)
    // Wait for permission to be processed
    await page.waitForTimeout(500);

    // STEP 3: Onboarding completion
    await expect(
      page.getByRole('heading', { name: /all set/i })
    ).toBeVisible();
    await expect(
      page.getByText(/you're ready to start tracking/i)
    ).toBeVisible();

    // Click "Start Tracking"
    await page.getByRole('button', { name: /start tracking/i }).click();

    // STEP 4: Should redirect to main app (visits timeline)
    await expect(page).toHaveURL(/.*visits/);
    await expect(
      page.getByRole('heading', { name: /your visits/i })
    ).toBeVisible();
  });

  test('should show anonymous mode option', async ({ page }) => {
    await page.goto('/auth/onboarding');

    // Welcome screen
    await expect(
      page.getByRole('heading', { name: /welcome/i })
    ).toBeVisible();

    // Should show "Continue as Guest" option
    await expect(
      page.getByRole('button', { name: /continue as guest/i })
    ).toBeVisible();

    // Click guest mode
    await page.getByRole('button', { name: /continue as guest/i }).click();

    // Should show anonymous mode explanation
    await expect(
      page.getByText(/guest mode keeps everything local/i)
    ).toBeVisible();
    await expect(page.getByText(/no cloud sync/i)).toBeVisible();

    // Confirm guest mode
    await page.getByRole('button', { name: /continue/i }).click();

    // Should proceed to location permission screen
    await expect(
      page.getByRole('heading', { name: /location permission/i })
    ).toBeVisible();
  });

  test('should allow login instead of onboarding', async ({ page }) => {
    await page.goto('/auth/onboarding');

    // Should show login option
    await expect(
      page.getByRole('link', { name: /already have an account/i })
    ).toBeVisible();

    // Click login link
    await page.getByRole('link', { name: /already have an account/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/.*auth\/login/);
    await expect(
      page.getByRole('heading', { name: /sign in/i })
    ).toBeVisible();
  });

  test('should handle location permission denial gracefully', async ({
    page,
    context,
  }) => {
    // Deny geolocation permission
    await context.clearPermissions();

    await page.goto('/auth/onboarding');

    // Complete welcome screen
    await page.getByRole('button', { name: /get started/i }).click();

    // Try to enable location
    await page.getByRole('button', { name: /enable location/i }).click();

    // Wait for denial to be processed
    await page.waitForTimeout(500);

    // Should show error message
    await expect(
      page.getByText(/location permission denied/i)
    ).toBeVisible();

    // Should show "Try Again" button
    await expect(
      page.getByRole('button', { name: /try again/i })
    ).toBeVisible();

    // Should show "Continue Without Location" option
    await expect(
      page.getByRole('button', { name: /continue without location/i })
    ).toBeVisible();
  });

  test('should show privacy policy link', async ({ page }) => {
    await page.goto('/auth/onboarding');

    // Should show privacy policy link
    await expect(
      page.getByRole('link', { name: /privacy policy/i })
    ).toBeVisible();

    // Click privacy policy
    await page.getByRole('link', { name: /privacy policy/i }).click();

    // Should open privacy policy (in new tab or modal)
    // Verification depends on implementation (new page, modal, etc.)
  });

  test('should persist onboarding completion', async ({ page }) => {
    // Complete onboarding
    await page.goto('/auth/onboarding');
    await page.getByRole('button', { name: /get started/i }).click();
    await page.getByRole('button', { name: /enable location/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /start tracking/i }).click();

    // Navigate away and back
    await page.goto('/');

    // Should NOT redirect to onboarding again
    await expect(page).not.toHaveURL(/.*onboarding/);
    await expect(page).toHaveURL(/.*visits/);
  });

  test('should show progress indicator during onboarding', async ({ page }) => {
    await page.goto('/auth/onboarding');

    // Step 1 of 3
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();

    await page.getByRole('button', { name: /get started/i }).click();

    // Step 2 of 3
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();

    await page.getByRole('button', { name: /enable location/i }).click();
    await page.waitForTimeout(500);

    // Step 3 of 3
    await expect(page.getByText(/step 3 of 3/i)).toBeVisible();
  });

  test('should allow skipping onboarding steps (back button)', async ({
    page,
  }) => {
    await page.goto('/auth/onboarding');
    await page.getByRole('button', { name: /get started/i }).click();

    // Should show back button
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

    // Click back
    await page.getByRole('button', { name: /back/i }).click();

    // Should return to welcome screen
    await expect(
      page.getByRole('heading', { name: /welcome/i })
    ).toBeVisible();
  });

  test('should display key features during onboarding', async ({ page }) => {
    await page.goto('/auth/onboarding');

    // Should show key features/benefits
    await expect(
      page.getByText(/automatic detection/i)
    ).toBeVisible();
    await expect(page.getByText(/privacy-first/i)).toBeVisible();
    await expect(page.getByText(/offline support/i)).toBeVisible();
  });
});
