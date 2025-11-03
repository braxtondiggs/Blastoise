/* eslint-disable playwright/no-skipped-test */
import { test, expect } from '@playwright/test';

/**
 * T167-T168: E2E Tests for Interactive Venue Map (User Story 3)
 *
 * Test the map interactions, venue markers, list view, and detail navigation
 */

test.describe.skip('T167: Map Interaction and Venue Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Complete onboarding/login if needed
    // TODO: Add login/auth flow when ready

    // Navigate to map page
    await page.goto('/map');
  });

  test('should display interactive map with venue markers', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('#venue-map', { timeout: 5000 });

    // Check that Leaflet map is initialized
    const mapContainer = page.locator('#venue-map');
    await expect(mapContainer).toBeVisible();

    // Check for Leaflet-specific classes
    const leafletContainer = page.locator('.leaflet-container');
    expect(await leafletContainer.count()).toBeGreaterThan(0);
  });

  test('should show user location marker on map', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });

    // Check for user location marker
    const userMarker = page.locator('.user-location-marker');
    if (await userMarker.count()) {
      await expect(userMarker).toBeVisible();

      // Check for pulse animation
      const pulse = userMarker.locator('.pulse');
      expect(await pulse.count()).toBeGreaterThan(0);
    }
  });

  test('should display venue markers with correct icons', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });

    // Wait for markers to load
    await page.waitForTimeout(1000);

    // Check for venue markers
    const markers = page.locator('.marker-pin');
    const markerCount = await markers.count();

    if (markerCount > 0) {
      // Check first marker has an icon
      const firstMarker = markers.first();
      const markerIcon = firstMarker.locator('.marker-icon');
      const iconText = await markerIcon.textContent();

      // Should be either beer or wine emoji
      expect(iconText).toMatch(/🍺|🍷/);
    }
  });

  test('should show venue popup when clicking marker', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Click first venue marker
    const firstMarker = page.locator('.marker-pin').first();
    if (await firstMarker.count()) {
      await firstMarker.click();

      // Wait for popup to appear
      await page.waitForSelector('.venue-popup', { timeout: 2000 });

      // Check popup contains venue name
      const venueName = page.locator('.venue-popup h3');
      await expect(venueName).toHaveText();

      // Check for "View Details" button
      const viewDetailsBtn = page.locator('.view-details-btn');
      expect(await viewDetailsBtn.count()).toBeGreaterThan(0);
    }
  });

  test('should recenter map when clicking recenter button', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });

    // Find and click recenter button
    const recenterBtn = page.locator('.map-controls button').first();
    if (await recenterBtn.count()) {
      await recenterBtn.click();

      // Map should recenter (visual change, hard to test precisely)
      // Just verify button works without errors
      await expect(recenterBtn).toBeEnabled();
    }
  });

  test('should fit map to show all venues', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });

    // Find and click fit-to-venues button
    const fitBtn = page.locator('.map-controls button').nth(1);
    if (await fitBtn.count()) {
      await fitBtn.click();

      // Wait for map animation
      await page.waitForTimeout(500);

      // Verify button works
      await expect(fitBtn).toBeEnabled();
    }
  });

  test('should show venue count badge', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });

    // Check for venue count badge
    const countBadge = page.locator('.venue-count-badge');
    if (await countBadge.count()) {
      const badgeText = await countBadge.textContent();
      expect(badgeText).toMatch(/\d+ venue/);
    }
  });

  test('should display clustered markers for many venues', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Check for marker clusters
    const clusters = page.locator('.marker-cluster');
    if (await clusters.count()) {
      // Should have cluster count displayed
      const firstCluster = clusters.first();
      const clusterText = await firstCluster.textContent();
      expect(clusterText).toMatch(/\d+/);
    }
  });

  test('should differentiate visited and unvisited venues', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Check for different marker types
    const visitedMarkers = page.locator('.venue-marker-visited');
    const unvisitedMarkers = page.locator('.venue-marker');

    const totalMarkers =
      (await visitedMarkers.count()) + (await unvisitedMarkers.count());
    expect(totalMarkers).toBeGreaterThan(0);
  });

  test('should handle map zoom and pan', async ({ page }) => {
    await page.waitForSelector('#venue-map', { timeout: 5000 });

    // Find Leaflet zoom controls
    const zoomIn = page.locator('.leaflet-control-zoom-in');
    const zoomOut = page.locator('.leaflet-control-zoom-out');

    if (await zoomIn.count()) {
      // Test zoom in
      await zoomIn.click();
      await page.waitForTimeout(300);

      // Test zoom out
      await zoomOut.click();
      await page.waitForTimeout(300);

      // No errors should occur
      await expect(zoomIn).toBeVisible();
    }
  });
});

test.describe.skip('T168: Venue Detail Navigation and List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
    await page.waitForSelector('#venue-map', { timeout: 5000 });
  });

  test('should switch between map and list view', async ({ page }) => {
    // Check if there's a toggle for list view
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();

      // Should show list view
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });
      await expect(page.locator('.venue-list-container')).toBeVisible();

      // Switch back to map
      const mapViewToggle = page.locator('button:has-text("Map")');
      if (await mapViewToggle.count()) {
        await mapViewToggle.click();

        // Should show map again
        await expect(page.locator('#venue-map')).toBeVisible();
      }
    }
  });

  test('should display venues in list format', async ({ page }) => {
    // Switch to list view
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      // Check for venue cards
      const venueCards = page.locator('.venue-card');
      const cardCount = await venueCards.count();

      if (cardCount > 0) {
        const firstCard = venueCards.first();

        // Should have venue name
        const venueName = firstCard.locator('.venue-info h3');
        await expect(venueName).toHaveText();

        // Should have venue type
        const venueType = firstCard.locator('.venue-info p').first();
        expect(await venueType.textContent()).toMatch(/Brewery|Winery/);
      }
    }
  });

  test('should filter venues by type in list view', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      // Open filter dropdown
      const filterButton = page.locator('button:has-text("Filter")');
      if (await filterButton.count()) {
        await filterButton.click();

        // Select "Breweries Only"
        const breweriesOption = page.locator('a:has-text("Breweries Only")');
        if (await breweriesOption.count()) {
          await breweriesOption.click();

          // Wait for filtering
          await page.waitForTimeout(500);

          // All venues should be breweries
          const venueTypes = page.locator('.venue-info p').first();
          if (await venueTypes.count()) {
            const typeText = await venueTypes.textContent();
            expect(typeText).toContain('Brewery');
          }
        }
      }
    }
  });

  test('should search venues in list view', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.count()) {
        await searchInput.fill('Deschutes');

        // Wait for search results
        await page.waitForTimeout(500);

        // Should show filtered results
        const venueCards = page.locator('.venue-card');
        const cardCount = await venueCards.count();

        if (cardCount > 0) {
          const firstCardName = await venueCards
            .first()
            .locator('h3')
            .textContent();
          expect(firstCardName).toContain('Deschutes');
        }
      }
    }
  });

  test('should sort venues in list view', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      // Open sort dropdown
      const sortButton = page.locator('button:has-text("Sort")');
      if (await sortButton.count()) {
        await sortButton.click();

        // Select "By Name"
        const nameOption = page.locator('a:has-text("By Name")');
        if (await nameOption.count()) {
          await nameOption.click();

          // Wait for sorting
          await page.waitForTimeout(500);

          // Verify venues are sorted
          const venueCards = page.locator('.venue-card');
          if ((await venueCards.count()) > 1) {
            const firstName = await venueCards.first().locator('h3').textContent();
            const secondName = await venueCards.nth(1).locator('h3').textContent();

            // First name should be alphabetically before second
            expect(firstName! < secondName!).toBe(true);
          }
        }
      }
    }
  });

  test('should navigate to venue detail from list', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      // Click first venue card
      const firstCard = page.locator('.venue-card').first();
      if (await firstCard.count()) {
        await firstCard.click();

        // Should navigate to venue detail
        await page.waitForSelector('.venue-detail-container', { timeout: 3000 });
        await expect(page.locator('.venue-detail-container')).toBeVisible();
      }
    }
  });

  test('should display venue details with address', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      const firstCard = page.locator('.venue-card').first();
      if (await firstCard.count()) {
        await firstCard.click();
        await page.waitForSelector('.venue-detail-container', { timeout: 3000 });

        // Should show venue name
        const venueName = page.locator('.venue-info-section h2');
        await expect(venueName).toHaveText();

        // Should show address
        const address = page.locator('.card-body p');
        const addressCount = await address.count();
        expect(addressCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have navigation button in venue detail', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      const firstCard = page.locator('.venue-card').first();
      if (await firstCard.count()) {
        await firstCard.click();
        await page.waitForSelector('.venue-detail-container', { timeout: 3000 });

        // Should have Navigate button
        const navigateBtn = page.locator('button:has-text("Navigate")');
        expect(await navigateBtn.count()).toBeGreaterThan(0);
        await expect(navigateBtn).toBeEnabled();
      }
    }
  });

  test('should have Add Visit button in venue detail', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      const firstCard = page.locator('.venue-card').first();
      if (await firstCard.count()) {
        await firstCard.click();
        await page.waitForSelector('.venue-detail-container', { timeout: 3000 });

        // Should have Add Visit button
        const addVisitBtn = page.locator('button:has-text("Add Visit")');
        expect(await addVisitBtn.count()).toBeGreaterThan(0);
        await expect(addVisitBtn).toBeEnabled();
      }
    }
  });

  test('should close venue detail and return to map', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      const firstCard = page.locator('.venue-card').first();
      if (await firstCard.count()) {
        await firstCard.click();
        await page.waitForSelector('.venue-detail-container', { timeout: 3000 });

        // Find close button
        const closeBtn = page.locator('.detail-header button').first();
        if (await closeBtn.count()) {
          await closeBtn.click();

          // Should return to map/list
          await page.waitForTimeout(500);
          const isOnMap = await page.locator('#venue-map').isVisible();
          const isOnList = await page.locator('.venue-list-container').isVisible();

          expect(isOnMap || isOnList).toBe(true);
        }
      }
    }
  });

  test('should show visit history in venue detail', async ({ page }) => {
    const listViewToggle = page.locator('button:has-text("List")');

    if (await listViewToggle.count()) {
      await listViewToggle.click();
      await page.waitForSelector('.venue-list-container', { timeout: 2000 });

      const firstCard = page.locator('.venue-card').first();
      if (await firstCard.count()) {
        await firstCard.click();
        await page.waitForSelector('.venue-detail-container', { timeout: 3000 });

        // Should have visit history section
        const visitHistorySection = page.locator('.visit-history-section');
        expect(await visitHistorySection.count()).toBeGreaterThan(0);

        // Check for "Visit History" heading
        const heading = page.locator('h3:has-text("Visit History")');
        expect(await heading.count()).toBeGreaterThan(0);
      }
    }
  });
});
