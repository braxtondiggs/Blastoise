/* eslint-disable playwright/no-skipped-test */
import { test, expect } from '@playwright/test';

/**
 * Tests the complete automatic visit detection workflow:
 * 1. User grants location permission
 * 2. App starts geofence tracking
 * 3. User moves within geofence radius (simulated)
 * 4. Visit is automatically detected
 * 5. Visit appears in timeline
 * 6. User moves outside geofence
 * 7. Visit is completed with departure time
 */

test.describe.skip('T120: Automatic Visit Detection', () => {
  test.beforeEach(async ({ context, page }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);

    // Complete onboarding first (skip for existing users)
    await page.goto('/');

    // If redirected to onboarding, complete it quickly
    const url = page.url();
    if (url.includes('onboarding')) {
      await page.getByRole('button', { name: /get started/i }).click();
      await page.getByRole('button', { name: /enable location/i }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /start tracking/i }).click();
    }

    // Should be on visits page
    await expect(page).toHaveURL(/.*visits/);
  });

  test('should detect visit when entering venue geofence', async ({
    page,
    context,
  }) => {
    // STEP 1: Set initial position outside any venue (downtown SF)
    await context.setGeolocation({
      latitude: 37.7749,
      longitude: -122.4194,
    });

    await page.goto('/visits');

    // Verify no active visit initially
    await expect(page.getByText(/no active visit/i)).toBeVisible();

    // STEP 2: Move to a brewery location (simulated)
    // Anchor Brewing Company coordinates (example)
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    // Wait for geofence detection (should be < 30 seconds per requirements)
    await page.waitForTimeout(2000);

    // STEP 3: Verify visit detected
    await expect(page.getByText(/active visit/i)).toBeVisible();
    await expect(page.getByText(/anchor brewing/i)).toBeVisible({
      timeout: 5000,
    });

    // Verify arrival time is displayed
    await expect(page.getByText(/arrived at/i)).toBeVisible();

    // STEP 4: Verify visit appears in timeline
    await page.getByRole('link', { name: /timeline/i }).click();
    await expect(page.getByText(/anchor brewing/i)).toBeVisible();

    // Verify visit shows as "In Progress"
    await expect(page.getByText(/in progress/i)).toBeVisible();
  });

  test('should complete visit when leaving venue geofence', async ({
    page,
    context,
  }) => {
    // Start at brewery
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');

    // Wait for visit to be detected
    await page.waitForTimeout(2000);
    await expect(page.getByText(/active visit/i)).toBeVisible();

    // Move outside geofence (at least 200m away)
    await context.setGeolocation({
      latitude: 37.7649, // ~300m north
      longitude: -122.4011,
    });

    // Wait for 10+ minutes to pass (simulated via timestamp manipulation in test)
    // In real implementation, this would use time manipulation or wait
    await page.evaluate(() => {
      // Fast-forward time by 11 minutes
      const originalNow = Date.now;
      Date.now = () => originalNow() + 11 * 60 * 1000;
    });

    // Wait for exit detection
    await page.waitForTimeout(2000);

    // Verify visit is now completed
    await expect(page.getByText(/no active visit/i)).toBeVisible();

    // Check timeline for completed visit
    await page.getByRole('link', { name: /timeline/i }).click();

    // Should show duration
    await expect(page.getByText(/11 min/i)).toBeVisible();

    // Should NOT show "In Progress"
    await expect(page.getByText(/in progress/i)).toBeHidden();
  });

  test('should not create visit for brief passes (< 10 min dwell time)', async ({
    page,
    context,
  }) => {
    const initialVisitCount = await page
      .locator('[data-testid="visit-card"]')
      .count();

    // Enter brewery geofence
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    // Verify active visit detected
    await expect(page.getByText(/active visit/i)).toBeVisible();

    // Leave after only 5 minutes (less than 10-minute threshold)
    await page.evaluate(() => {
      const originalNow = Date.now;
      Date.now = () => originalNow() + 5 * 60 * 1000;
    });

    await context.setGeolocation({
      latitude: 37.7649,
      longitude: -122.4011,
    });

    await page.waitForTimeout(2000);

    // Visit should be filtered out (not saved)
    await page.getByRole('link', { name: /timeline/i }).click();

    const finalVisitCount = await page
      .locator('[data-testid="visit-card"]')
      .count();

    // Should not have increased visit count
    expect(finalVisitCount).toBe(initialVisitCount);
  });

  test('should show real-time visit duration for active visit', async ({
    page,
    context,
  }) => {
    // Enter brewery
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    await expect(page.getByText(/active visit/i)).toBeVisible();

    // Verify duration is updating
    await expect(page.getByText(/0 min/i)).toBeVisible();

    // Wait a bit and check duration updated
    await page.waitForTimeout(1000);

    // Duration should still be visible (may be 0-1 min depending on timing)
    await expect(
      page.locator('[data-testid="active-visit-duration"]')
    ).toBeVisible();
  });

  test('should display venue information in active visit card', async ({
    page,
    context,
  }) => {
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    // Verify venue details displayed
    await expect(page.getByText(/anchor brewing/i)).toBeVisible();
    await expect(page.getByText(/brewery/i)).toBeVisible();
    await expect(page.getByText(/san francisco/i)).toBeVisible();

    // Should show map preview or distance
    await expect(
      page.locator('[data-testid="venue-map-preview"]')
    ).toBeVisible();
  });

  test('should allow manual check-out from active visit', async ({
    page,
    context,
  }) => {
    // Start visit
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    await expect(page.getByText(/active visit/i)).toBeVisible();

    // Click "Check Out" button
    await page.getByRole('button', { name: /check out/i }).click();

    // Confirm check out
    await page.getByRole('button', { name: /confirm/i }).click();

    // Visit should be completed
    await expect(page.getByText(/no active visit/i)).toBeVisible();

    // Check timeline
    await page.getByRole('link', { name: /timeline/i }).click();
    await expect(page.getByText(/anchor brewing/i)).toBeVisible();
    await expect(page.getByText(/manually ended/i)).toBeVisible();
  });

  test('should sync visit to server when online', async ({ page, context }) => {
    // Intercept API calls
    await page.route('**/api/v1/visits/batch', (route) => {
      route.fulfill({
        status: 201,
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'server-visit-123',
              user_id: 'test-user',
              venue_id: 'venue-1',
              arrival_time: new Date().toISOString(),
              is_active: true,
              synced: true,
            },
          ],
        }),
      });
    });

    // Create visit
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    // Wait for sync (should happen automatically)
    await page.waitForTimeout(2000);

    // Verify sync indicator
    await expect(page.getByText(/synced/i)).toBeVisible();
  });

  test('should queue visit locally when offline', async ({
    page,
    context,
  }) => {
    // Go offline
    await context.setOffline(true);

    // Create visit
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    await expect(page.getByText(/active visit/i)).toBeVisible();

    // Verify offline indicator
    await expect(page.getByText(/offline/i)).toBeVisible();
    await expect(page.getByText(/will sync when online/i)).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await page.waitForTimeout(3000);

    // Should show synced
    await expect(page.getByText(/synced/i)).toBeVisible();
  });

  test('should handle multiple venue geofences simultaneously', async ({
    page,
    context,
  }) => {
    // Position between two breweries
    await context.setGeolocation({
      latitude: 37.7749,
      longitude: -122.4194,
    });

    await page.goto('/visits');

    // Should show nearby venues
    await expect(page.getByText(/nearby venues/i)).toBeVisible();

    // Should show at least 2 venues in proximity
    const nearbyVenueCards = await page
      .locator('[data-testid="nearby-venue-card"]')
      .count();
    expect(nearbyVenueCards).toBeGreaterThanOrEqual(2);

    // Move close to one specific venue
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.waitForTimeout(2000);

    // Should only detect visit at the closest venue
    await expect(page.getByText(/active visit/i)).toBeVisible();

    const activeVisits = await page
      .locator('[data-testid="active-visit-card"]')
      .count();
    expect(activeVisits).toBe(1);
  });

  test('should persist visit across app restarts', async ({
    page,
    context,
  }) => {
    // Create active visit
    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    const venueName = await page
      .locator('[data-testid="active-visit-venue-name"]')
      .innerText();

    // Simulate app restart (reload page)
    await page.reload();

    // Active visit should still be there
    await expect(page.getByText(/active visit/i)).toBeVisible();
    await expect(page.getByText(venueName)).toBeVisible();
  });

  test('should show notification when visit is detected', async ({
    page,
    context,
  }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);

    await context.setGeolocation({
      latitude: 37.7623,
      longitude: -122.4011,
    });

    await page.goto('/visits');
    await page.waitForTimeout(2000);

    // Should show toast/notification
    await expect(
      page.getByText(/visit detected at anchor brewing/i)
    ).toBeVisible();
  });

  test('should calculate and display distance to nearby venues', async ({
    page,
    context,
  }) => {
    await context.setGeolocation({
      latitude: 37.7749,
      longitude: -122.4194,
    });

    await page.goto('/visits');

    // Should show distance for nearby venues
    await expect(page.getByText(/150m away/i)).toBeVisible();
    await expect(page.getByText(/0.3 mi/i)).toBeVisible();
  });
});
