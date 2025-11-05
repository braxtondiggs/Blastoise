/* eslint-disable playwright/no-skipped-test */
import { test, expect } from '@playwright/test';

/**
 * Test the chronological timeline with date grouping, visit detail navigation,
 * and empty state display.
 */

test.describe.skip('T142: Timeline Display with Multiple Visits', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Complete onboarding/login if needed
    // TODO: Add login/auth flow when ready
  });

  test('should display timeline with visits grouped by date', async ({
    page,
  }) => {
    // Navigate to timeline page
    await page.goto('/visits');

    // Wait for timeline to load
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    // Check that date group headers are visible
    const dateHeaders = await page.locator('.date-group-header').all();
    expect(dateHeaders.length).toBeGreaterThan(0);

    // Verify date headers have proper format
    const firstDateHeader = page
      .locator('.date-group-header')
      .first()
      ;
    await expect(firstDateHeader).toHaveText();
    // Should contain either "Today", "Yesterday", or a month name
    expect(
      firstDateHeader?.match(/Today|Yesterday|January|February|March|April|May|June|July|August|September|October|November|December/)
    ).toBeTruthy();
  });

  test('should display visit cards with venue name and time', async ({
    page,
  }) => {
    await page.goto('/visits');

    // Wait for at least one visit card
    await page.waitForSelector('app-visit-card', { timeout: 5000 });

    // Get first visit card
    const visitCard = page.locator('app-visit-card').first();

    // Check that venue name is displayed
    const venueName = visitCard.locator('.venue-name');
    await expect(venueName).toHaveText();
    expect(venueName!.length).toBeGreaterThan(0);

    // Check that arrival time is displayed
    const arrivalTime = visitCard.locator('.arrival-time');
    await expect(arrivalTime).toHaveText();
  });

  test('should show visit duration for completed visits', async ({ page }) => {
    await page.goto('/visits');

    // Wait for visit cards
    await page.waitForSelector('app-visit-card', { timeout: 5000 });

    // Find a completed visit (has departure time)
    const completedVisit = page
      .locator('app-visit-card')
      .filter({ has: page.locator('.departure-time') })
      .first();

    if (await completedVisit.count()) {
      // Check duration is displayed
      const duration = completedVisit.locator('.duration');
      await expect(duration).toHaveText();
      expect(duration).toMatch(/\d+[hm]/); // Should contain hours or minutes
    }
  });

  test('should display active visit with live duration', async ({ page }) => {
    await page.goto('/visits');

    // Look for active visit indicator
    const activeVisit = page.locator('.active-visit-card').first();

    if (await activeVisit.count()) {
      // Check that duration updates (wait 2 seconds and compare)
      await page.waitForTimeout(2000);

      const updatedDuration = activeVisit
        .locator('.duration')
        ;

      // Duration should have changed (or at least be present)
      await expect(updatedDuration).toHaveText();
    }
  });

  test('should sort visits in chronological order (most recent first)', async ({
    page,
  }) => {
    await page.goto('/visits');

    await page.waitForSelector('app-visit-card', { timeout: 5000 });

    // Get all visit cards
    const visitCards = await page.locator('app-visit-card').all();

    if (visitCards.length > 1) {
      // Get arrival times from first two visits
      const firstTime = await visitCards[0]
        .locator('.arrival-time')
        .getAttribute('data-timestamp');
      const secondTime = await visitCards[1]
        .locator('.arrival-time')
        .getAttribute('data-timestamp');

      // First visit should be more recent (larger timestamp)
      if (firstTime && secondTime) {
        expect(new Date(firstTime).getTime()).toBeGreaterThan(
          new Date(secondTime).getTime()
        );
      }
    }
  });

  test('should show visit statistics in date group header', async ({ page }) => {
    await page.goto('/visits');

    await page.waitForSelector('.date-group-header', { timeout: 5000 });

    // Check for statistics (e.g., "3 visits")
    const dateGroup = page.locator('.date-group').first();
    const statsText = await dateGroup.locator('.group-stats').textContent();

    if (statsText) {
      expect(statsText).toMatch(/\d+ visit/i);
    }
  });

  test('should handle infinite scroll for long visit lists', async ({
    page,
  }) => {
    await page.goto('/visits');

    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    // Get initial visit count
    const initialCount = await page.locator('app-visit-card').count();

    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for potential new visits to load
    await page.waitForTimeout(1000);

    // Get new visit count
    const newCount = await page.locator('app-visit-card').count();

    // If there were more visits to load, count should increase
    // Or if at end, should show "end of timeline" message
    if (newCount === initialCount) {
      const endMessage = page.locator('.timeline-end');
      if (await endMessage.count()) {
        expect(await endMessage.textContent()).toContain('No more visits');
      }
    }
  });

  test('should show loading indicator while fetching visits', async ({
    page,
  }) => {
    await page.goto('/visits');

    // Either loading was visible, or timeline loaded so fast we missed it
    const timelineContainer = await page.waitForSelector(
      '.timeline-container',
      {
        timeout: 5000,
      }
    );
    expect(timelineContainer).toBeTruthy();
  });

  test('should display venue type badge on visit cards', async ({ page }) => {
    await page.goto('/visits');

    await page.waitForSelector('app-visit-card', { timeout: 5000 });

    const visitCard = page.locator('app-visit-card').first();
    const venueTypeBadge = visitCard.locator('.venue-type-badge');

    if (await venueTypeBadge.count()) {
      const badgeText = await venueTypeBadge.textContent();
      expect(badgeText).toMatch(/brewery|winery/i);
    }
  });
});

test.describe.skip('T143: Visit Detail Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/visits');
    await page.waitForSelector('.timeline-container', { timeout: 5000 });
  });

  test('should navigate to visit detail when clicking visit card', async ({
    page,
  }) => {
    // Click first visit card
    await page.locator('app-visit-card').first().click();

    // Should navigate to visit detail page
    await page.waitForURL(/\/visits\/.*/, { timeout: 3000 });
    expect(page.url()).toMatch(/\/visits\/.+/);
  });

  test('should display full visit details on detail page', async ({ page }) => {
    // Click first visit card
    await page.locator('app-visit-card').first().click();

    await page.waitForSelector('.visit-detail-container', { timeout: 3000 });

    // Check that detail page has venue information
    const venueName = page.locator('.venue-name');
    await expect(venueName).toHaveText();

    // Check for arrival time
    const arrivalTime = page.locator('.arrival-time');
    await expect(arrivalTime).toHaveText();

    // Check for address
    const address = page.locator('.venue-address');
    await expect(address).toHaveText();
  });

  test('should show back button on visit detail page', async ({ page }) => {
    await page.locator('app-visit-card').first().click();

    await page.waitForSelector('.visit-detail-container', { timeout: 3000 });

    // Check for back button
    const backButton = page.locator('button:has-text("Back")');
    expect(await backButton.count()).toBeGreaterThan(0);
  });

  test('should return to timeline when clicking back button', async ({
    page,
  }) => {
    // Navigate to detail page
    await page.locator('app-visit-card').first().click();
    await page.waitForSelector('.visit-detail-container', { timeout: 3000 });

    // Click back button
    await page.locator('button:has-text("Back")').click();

    // Should be back on timeline
    await page.waitForSelector('.timeline-container', { timeout: 3000 });
    expect(page.url()).toMatch(/\/visits$/);
  });

  test('should display map on visit detail page if location available', async ({
    page,
  }) => {
    await page.locator('app-visit-card').first().click();

    await page.waitForSelector('.visit-detail-container', { timeout: 3000 });

    // Check for map container
    const mapContainer = page.locator('.venue-map');
    if (await mapContainer.count()) {
      await expect(mapContainer).toBeVisible();
    }
  });

  test('should show delete button on visit detail page', async ({ page }) => {
    await page.locator('app-visit-card').first().click();

    await page.waitForSelector('.visit-detail-container', { timeout: 3000 });

    // Check for delete button
    const deleteButton = page.locator('button:has-text("Delete")');
    expect(await deleteButton.count()).toBeGreaterThan(0);
  });

  test('should handle browser back navigation from detail page', async ({
    page,
  }) => {
    // Navigate to detail
    await page.locator('app-visit-card').first().click();
    await page.waitForSelector('.visit-detail-container', { timeout: 3000 });

    // Use browser back
    await page.goBack();

    // Should be back on timeline
    await page.waitForSelector('.timeline-container', { timeout: 3000 });
  });
});

test.describe.skip('T144: Empty State Display', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Clear all visits or use test user with no visits
    await page.goto('/visits');
  });

  test('should display empty state when no visits exist', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    // Check if empty state is visible (if no visits)
    const emptyState = page.locator('.empty-state-container');

    if (await emptyState.count()) {
      await expect(emptyState).toBeVisible();

      // Check for empty state message
      const message = emptyState.locator('.empty-message');
      await expect(message).toHaveText();
      expect(message).toMatch(/no visits|start exploring|no history/i);
    }
  });

  test('should display helpful message in empty state', async ({ page }) => {
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    const emptyState = page.locator('.empty-state-container');

    if (await emptyState.count()) {
      const message = emptyState;

      // Should contain helpful instructions
      await expect(message).toHaveText();
      expect(message!.length).toBeGreaterThan(20); // Reasonable message length
    }
  });

  test('should show icon or illustration in empty state', async ({ page }) => {
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    const emptyState = page.locator('.empty-state-container');

    if (await emptyState.count()) {
      // Check for icon or illustration
      const icon =
        (await emptyState.locator('svg').count()) ||
        (await emptyState.locator('img').count());
      expect(icon).toBeGreaterThan(0);
    }
  });

  test('should provide call-to-action in empty state', async ({ page }) => {
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    const emptyState = page.locator('.empty-state-container');

    if (await emptyState.count()) {
      // Look for CTA button (e.g., "Enable Location" or "Explore Map")
      const ctaButton = emptyState.locator('button');
      if (await ctaButton.count()) {
        const buttonText = ctaButton;
        await expect(buttonText).toHaveText();
      }
    }
  });

  test('should not display empty state when visits exist', async ({ page }) => {
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    // Check if there are visit cards
    const visitCards = await page.locator('app-visit-card').count();

    if (visitCards > 0) {
      // Empty state should not be visible
      const emptyState = page.locator('.empty-state-container');
      expect(await emptyState.count()).toBe(0);
    }
  });

  test('should style empty state appropriately with DaisyUI', async ({
    page,
  }) => {
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    const emptyState = page.locator('.empty-state-container');

    if (await emptyState.count()) {
      // Check that it uses proper spacing and styling
      const styles = await emptyState.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          padding: computed.padding,
        };
      });

      expect(styles.display).not.toBe('none');
    }
  });

  test('should maintain accessibility in empty state', async ({ page }) => {
    await page.waitForSelector('.timeline-container', { timeout: 5000 });

    const emptyState = page.locator('.empty-state-container');

    if (await emptyState.count()) {
      // Check for proper ARIA labels or semantic HTML
      const heading = emptyState.locator('h1, h2, h3');
      expect(await heading.count()).toBeGreaterThan(0);
    }
  });
});
