/* eslint-disable playwright/no-skipped-test */
/**
 * Tests for:
 * - Share modal and link generation (T214)
 * - Public shared visit view (T215)
 * - Privacy validation
 * - Expiration handling
 */

import { test, expect } from '@playwright/test';

test.describe.skip('Sharing Feature E2E Tests', () => {
  const baseUrl = 'http://localhost:4200';

  test.beforeEach(async ({ page }) => {
    // Login and navigate to app
    await page.goto(`${baseUrl}/auth/login`);

    // Assume we have a test user already set up
    // In real tests, you'd use test fixtures or API setup
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('**/visits**');
  });

  test.describe('T214: Share Modal and Link Generation', () => {
    test('should open share modal from visit detail', async ({ page }) => {
      // Navigate to a visit detail page
      await page.goto(`${baseUrl}/visits`);

      // Wait for timeline to load
      await page.waitForSelector('[data-testid="timeline-container"]', { timeout: 5000 });

      // Click on first visit card
      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      // Wait for detail page
      await page.waitForSelector('[data-testid="visit-detail"]', { timeout: 5000 });

      // Click share button
      const shareButton = page.locator('button:has-text("Share")');
      await expect(shareButton).toBeVisible();
      await shareButton.click();

      // Modal should open
      await expect(page.locator('.modal.modal-open')).toBeVisible();
      await expect(page.locator('#share-modal-title')).toHaveText('Share Visit');
    });

    test('should display privacy notice in share modal', async ({ page }) => {
      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Check for privacy notice
      const privacyAlert = page.locator('.alert-info:has-text("Only venue name and date are shared")');
      await expect(privacyAlert).toBeVisible();
      await expect(privacyAlert).toContainText('No personal information');
    });

    test('should allow selection of expiration time', async ({ page }) => {
      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Check expiration dropdown
      const expirationSelect = page.locator('select[aria-label*="expiration"]');
      await expect(expirationSelect).toBeVisible();

      // Verify options
      await expect(expirationSelect).toContainText('Never expires');
      await expect(expirationSelect).toContainText('1 day');
      await expect(expirationSelect).toContainText('7 days');
      await expect(expirationSelect).toContainText('30 days');
      await expect(expirationSelect).toContainText('90 days');
    });

    test('should generate share link successfully', async ({ page }) => {
      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Select "Never expires"
      await page.selectOption('select[aria-label*="expiration"]', { value: 'null' });

      // Click generate button
      const generateButton = page.locator('button:has-text("Generate Share Link")');
      await generateButton.click();

      // Wait for share link to be generated
      await page.waitForSelector('input[aria-label="Share URL"]', { timeout: 5000 });

      // Verify share URL is displayed
      const shareUrlInput = page.locator('input[aria-label="Share URL"]');
      const shareUrl = await shareUrlInput.inputValue();

      expect(shareUrl).toContain('/shared/');
      expect(shareUrl).toMatch(/^https?:\/\//);

      // Verify share ID format
      const match = shareUrl.match(/\/shared\/([^/]+)/);
      expect(match).toBeTruthy();
    });

    test('should generate share link with 7-day expiration', async ({ page }) => {
      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Select "7 days"
      await page.selectOption('select[aria-label*="expiration"]', { value: '7' });

      // Generate link
      const generateButton = page.locator('button:has-text("Generate Share Link")');
      await generateButton.click();

      // Wait for generation
      await page.waitForSelector('input[aria-label="Share URL"]', { timeout: 5000 });

      // Check for expiration notice
      const expirationAlert = page.locator('.alert-warning:has-text("expire")');
      await expect(expirationAlert).toBeVisible();
    });

    test('should copy share link to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Generate link
      await page.selectOption('select[aria-label*="expiration"]', { value: 'null' });
      const generateButton = page.locator('button:has-text("Generate Share Link")');
      await generateButton.click();

      await page.waitForSelector('input[aria-label="Share URL"]', { timeout: 5000 });

      // Click copy button
      const copyButton = page.locator('button:has-text("Copy")');
      await copyButton.click();

      // Verify success message
      await expect(page.locator('p:has-text("Link copied to clipboard")')).toBeVisible({ timeout: 3000 });

      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('/shared/');
    });

    test('should allow sharing via Web Share API', async ({ page, browserName }) => {
      // Web Share API is primarily for mobile, may not work in all browsers
      test.skip(browserName === 'firefox', 'Web Share API not supported in Firefox');

      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Generate link
      await page.selectOption('select[aria-label*="expiration"]', { value: 'null' });
      await page.click('button:has-text("Generate Share Link")');

      await page.waitForSelector('input[aria-label="Share URL"]', { timeout: 5000 });

      // Click share button (may trigger native share dialog)
      const webShareButton = page.locator('button:has-text("Share")').last();
      await expect(webShareButton).toBeVisible();
    });

    test('should close modal when clicking Done', async ({ page }) => {
      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Modal should be open
      await expect(page.locator('.modal.modal-open')).toBeVisible();

      // Click Done or close button
      const doneButton = page.locator('button:has-text("Done"), button:has-text("Cancel")').first();
      await doneButton.click();

      // Modal should close
      await expect(page.locator('.modal.modal-open')).not.toBeVisible({ timeout: 3000 });
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/v1/visits/*/share', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto(`${baseUrl}/visits`);
      await page.waitForSelector('[data-testid="timeline-container"]');

      const firstVisit = page.locator('[data-testid="visit-card"]').first();
      await firstVisit.click();

      const shareButton = page.locator('button:has-text("Share")');
      await shareButton.click();

      // Try to generate link
      await page.click('button:has-text("Generate Share Link")');

      // Error message should appear
      await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.alert-error')).toContainText('Failed to generate share link');
    });
  });

  test.describe('T215: Public Shared Visit View', () => {
    test('should display shared visit without authentication', async ({ page, context: _context }) => {
      // Create a new incognito context (no cookies/auth)
      const incognitoContext = await page.context().browser()?.newContext();
      if (!incognitoContext) return;

      const incognitoPage = await incognitoContext.newPage();

      // Navigate directly to a shared visit URL (assuming we have a test share ID)
      const testShareUrl = `${baseUrl}/shared/test-share-123`;
      await incognitoPage.goto(testShareUrl);

      // Should load without auth
      await expect(incognitoPage.locator('h1')).toContainText(/.*Brewing|.*Winery/);

      // Should show privacy notice
      const privacyAlert = incognitoPage.locator('.alert-info:has-text("Privacy Notice")');
      await expect(privacyAlert).toBeVisible();

      await incognitoContext.close();
    });

    test('should display only venue name and city (no address)', async ({ page }) => {
      const testShareUrl = `${baseUrl}/shared/test-share-456`;
      await page.goto(testShareUrl);

      // Wait for page load
      await page.waitForSelector('h1', { timeout: 5000 });

      // Venue name should be visible
      const venueName = page.locator('h1');
      await expect(venueName).toBeVisible();

      // City should be visible
      const cityText = page.locator('p:has-text(/.*,.*/)');
      await expect(cityText).toBeVisible();

      // Full address should NOT be visible (privacy)
      const pageContent = await page.content();
      expect(pageContent).not.toContain('123 Street');
      expect(pageContent).not.toContain('Street');
    });

    test('should display visit date without time', async ({ page }) => {
      const testShareUrl = `${baseUrl}/shared/test-share-789`;
      await page.goto(testShareUrl);

      await page.waitForSelector('[class*="visit"]', { timeout: 5000 });

      // Find date display
      const dateDisplay = page.locator('text=/Visit Date|Visited/').locator('..').locator('text=/\\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/');

      const dateText = await dateDisplay.textContent();

      // Should not contain precise time (no colons for time)
      expect(dateText).not.toMatch(/\d{1,2}:\d{2}/);
      // Should contain date components
      expect(dateText).toMatch(/\d{4}/); // Year
    });

    test('should display view count', async ({ page }) => {
      const testShareUrl = `${baseUrl}/shared/test-share-view`;
      await page.goto(testShareUrl);

      await page.waitForSelector('[class*="view"]', { timeout: 5000 });

      // Find view count
      const viewCount = page.locator('text=/Views?/').locator('..').locator('text=/\\d+/');
      await expect(viewCount).toBeVisible();

      const count = await viewCount.textContent();
      expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should show 404 for non-existent share ID', async ({ page }) => {
      const invalidShareUrl = `${baseUrl}/shared/nonexistent-share-id-12345`;

      await page.goto(invalidShareUrl);

      // Should show error state
      await expect(page.locator('h2:has-text("Visit Not Found"), h2:has-text("Not Found")')).toBeVisible({ timeout: 5000 });
    });

    test('should show 410 Gone for expired share link', async ({ page }) => {
      // Mock expired share
      await page.route('**/api/v1/shared/expired-share', route => {
        route.fulfill({
          status: 410,
          body: JSON.stringify({ message: 'This shared visit has expired' }),
        });
      });

      const expiredShareUrl = `${baseUrl}/shared/expired-share`;
      await page.goto(expiredShareUrl);

      // Should show expiration message
      await expect(page.locator('h2:has-text("Share Link Expired"), h2:has-text("Expired")')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=/expired|no longer available/i')).toBeVisible();
    });

    test('should provide link to app homepage', async ({ page }) => {
      const testShareUrl = `${baseUrl}/shared/test-share-home`;
      await page.goto(testShareUrl);

      await page.waitForSelector('button:has-text("Visit Blastoise"), a:has-text("View App")', { timeout: 5000 });

      const homeLink = page.locator('button:has-text("Visit Blastoise"), a:has-text("View App")').first();
      await expect(homeLink).toBeVisible();
    });

    test('should NOT expose user information', async ({ page }) => {
      const testShareUrl = `${baseUrl}/shared/privacy-test`;
      await page.goto(testShareUrl);

      await page.waitForSelector('[class*="visit"]', { timeout: 5000 });

      const pageContent = await page.content();

      // Should NOT contain user identifiers
      expect(pageContent).not.toContain('user_id');
      expect(pageContent).not.toContain('user-');
      expect(pageContent).not.toContain('@'); // Email
      expect(pageContent).not.toContain('mailto');
    });

    test('should NOT expose GPS coordinates', async ({ page }) => {
      const testShareUrl = `${baseUrl}/shared/gps-test`;
      await page.goto(testShareUrl);

      await page.waitForSelector('[class*="visit"]', { timeout: 5000 });

      const pageContent = await page.content();

      // Should NOT contain coordinate patterns
      expect(pageContent).not.toMatch(/latitude|lat[^i]|lng|longitude/i);
      expect(pageContent).not.toMatch(/\d{1,3}\.\d{4,}/); // Decimal coordinates
      expect(pageContent).not.toContain('coordinates');
    });

    test('should increment view count on each page load', async ({ page, context: _context }) => {
      const testShareUrl = `${baseUrl}/shared/view-count-test`;

      // First view
      await page.goto(testShareUrl);
      await page.waitForSelector('[class*="view"]', { timeout: 5000 });
      const viewCount1 = page.locator('text=/Views?/').locator('..').locator('text=/\\d+/');
      const count1Text = await viewCount1.textContent();
      const count1 = parseInt(count1Text || '0');

      // Second view (reload page)
      await page.reload();
      await page.waitForSelector('[class*="view"]', { timeout: 5000 });
      const viewCount2 = page.locator('text=/Views?/').locator('..').locator('text=/\\d+/');
      const count2Text = await viewCount2.textContent();
      const count2 = parseInt(count2Text || '0');

      // View count should increment
      expect(count2).toBeGreaterThan(count1);
    });
  });

  test.describe('Privacy Validation', () => {
    test('should never include precise timestamps in shared data', async ({ page }) => {
      const testShareUrl = `${baseUrl}/shared/timestamp-privacy`;
      await page.goto(testShareUrl);

      const pageContent = await page.content();

      // Should not have ISO timestamps or time strings
      expect(pageContent).not.toMatch(/\d{2}:\d{2}:\d{2}/); // HH:MM:SS
      expect(pageContent).not.toMatch(/T\d{2}:\d{2}/); // ISO time component
    });

    test('should work without authentication cookies', async ({ page, context }) => {
      // Clear all cookies
      await context.clearCookies();

      const testShareUrl = `${baseUrl}/shared/no-auth-test`;
      const response = await page.goto(testShareUrl);

      // Should load successfully
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
    });
  });
});
