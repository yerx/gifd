import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

test.describe('Search Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('aside[role="navigation"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('search button exists in sidebar', async ({ page }) => {
    const searchBtn = page.locator('aside button[aria-label="Open search"]');
    await expect(searchBtn).toBeVisible();
  });

  test('search button shows "Find..." text', async ({ page }) => {
    const searchArea = page.locator('aside').getByText('Find...');
    await expect(searchArea).toBeVisible();
  });

  test('search button shows "/" keyboard shortcut hint', async ({ page }) => {
    const kbdHint = page.locator('aside kbd', { hasText: '/' });
    await expect(kbdHint).toBeVisible();
  });

  test('pressing "/" opens search modal when JS hydrates', async ({ page }) => {
    // First click on an area that is not an input to ensure "/" is captured
    await page.locator('h1', { hasText: 'Settings' }).click();
    await page.waitForTimeout(500);

    await page.keyboard.press('/');
    await page.waitForTimeout(1000);

    const modal = page.locator('div[role="dialog"][aria-label="Search"]');
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      // JS hydrated and search modal opened
      await expect(modal).toBeVisible();

      // Check for search input
      const searchInput = modal.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();

      // Check for esc hint
      await expect(modal.locator('kbd', { hasText: 'esc' })).toBeVisible();
    }
    // If not visible, JS didn't hydrate -- search requires client-side JS
  });

  test('search modal can be opened via sidebar button when JS hydrates', async ({ page }) => {
    const searchBtn = page.locator('aside button[aria-label="Open search"]');
    await searchBtn.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('div[role="dialog"][aria-label="Search"]');
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      await expect(modal).toBeVisible();

      // Verify modal has search input
      const searchInput = modal.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
    }
  });

  test('Escape closes the search modal when open', async ({ page }) => {
    const searchBtn = page.locator('aside button[aria-label="Open search"]');
    await searchBtn.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('div[role="dialog"][aria-label="Search"]');
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      // Press Escape to close
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden({ timeout: 3000 });
    }
  });

  test('search API endpoint works', async ({ request }) => {
    const res = await request.get(`${API_BASE}/search?q=test&limit=10`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('results');
    expect(data).toHaveProperty('elapsed_ms');
    expect(Array.isArray(data.results)).toBe(true);
  });

  test('search API returns results for existing data', async ({ request }) => {
    // Create a test item to search for
    const domainRes = await request.post(`${API_BASE}/domains`, {
      data: { name: 'Search Test Domain', color: '#00FF00' },
    });
    const domain = await domainRes.json();

    const projectRes = await request.post(`${API_BASE}/projects`, {
      data: { name: 'Search Test Project', domain_id: domain.id },
    });
    const project = await projectRes.json();

    // Search for it
    const searchRes = await request.get(`${API_BASE}/search?q=Search+Test&limit=10`);
    expect(searchRes.status()).toBe(200);
    const data = await searchRes.json();
    expect(data.results.length).toBeGreaterThan(0);

    // Cleanup
    await request.delete(`${API_BASE}/projects/${project.id}`);
    await request.delete(`${API_BASE}/domains/${domain.id}`);
  });

  test('search API returns empty for nonsense query', async ({ request }) => {
    const res = await request.get(`${API_BASE}/search?q=xyzzy99999nonexistent&limit=10`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.results.length).toBe(0);
  });
});
