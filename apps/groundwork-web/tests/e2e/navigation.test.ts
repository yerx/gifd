import { test, expect } from '@playwright/test';

test.describe('Navigation - Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inbox');
    // Wait for the sidebar to render (SSR renders the sidebar immediately)
    await expect(page.locator('aside[role="navigation"]')).toBeVisible({ timeout: 15000 });
  });

  test('sidebar renders with app branding', async ({ page }) => {
    const branding = page.locator('aside h1');
    await expect(branding).toBeVisible();
    await expect(branding).toHaveText('GROUNDWORK');
  });

  test('sidebar renders all navigation links', async ({ page }) => {
    const nav = page.locator('aside[role="navigation"] nav');
    await expect(nav).toBeVisible();

    // Check all five nav items exist (SSR-rendered)
    await expect(nav.getByText('Inbox')).toBeVisible();
    await expect(nav.getByText('Cockpit')).toBeVisible();
    await expect(nav.getByText('Projects')).toBeVisible();
    await expect(nav.getByText('Review')).toBeVisible();
    await expect(nav.getByText('Settings')).toBeVisible();
  });

  test('Cockpit nav link points to /cockpit', async ({ page }) => {
    const link = page.locator('aside a[href="/cockpit"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/cockpit');
  });

  test('Projects nav link navigates to /projects', async ({ page }) => {
    // Click the Projects link to navigate
    await page.locator('aside a[href="/projects"]').click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('Inbox nav link navigates to /inbox', async ({ page }) => {
    // Navigate to settings first, then back to inbox
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 15000 });

    await page.locator('aside a[href="/inbox"]').click();
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('Review nav link navigates to /review', async ({ page }) => {
    await page.locator('aside a[href="/review"]').click();
    await expect(page).toHaveURL(/\/review/);
    await expect(page.getByRole('heading', { name: 'Weekly Review' })).toBeVisible({ timeout: 15000 });
  });

  test('Settings nav link navigates to /settings', async ({ page }) => {
    await page.locator('aside a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('active nav item is highlighted with aria-current', async ({ page }) => {
    // On /inbox, the Inbox link should have aria-current="page"
    const inboxLink = page.locator('aside a[href="/inbox"]');
    await expect(inboxLink).toHaveAttribute('aria-current', 'page');

    // Other links should NOT have aria-current="page"
    const settingsLink = page.locator('aside a[href="/settings"]');
    await expect(settingsLink).not.toHaveAttribute('aria-current', 'page');
  });

  test('active nav link changes when navigating to a different page', async ({ page }) => {
    // Currently on /inbox - inbox should be active
    await expect(page.locator('aside a[href="/inbox"]')).toHaveAttribute('aria-current', 'page');

    // Navigate to Projects
    await page.locator('aside a[href="/projects"]').click();
    await expect(page).toHaveURL(/\/projects/);

    // Now Projects link should have aria-current="page"
    await expect(page.locator('aside a[href="/projects"]')).toHaveAttribute('aria-current', 'page');

    // Inbox link should no longer be active
    await expect(page.locator('aside a[href="/inbox"]')).not.toHaveAttribute('aria-current', 'page');
  });

  test('sidebar has a search button', async ({ page }) => {
    const searchBtn = page.locator('aside button[aria-label="Open search"]');
    await expect(searchBtn).toBeVisible();
  });

  test('sidebar shows sync status indicator', async ({ page }) => {
    // The sidebar shows "Local only" sync status (SSR rendered)
    await expect(page.locator('aside').getByText('Local only')).toBeVisible();
  });

  test('sidebar has domains section', async ({ page }) => {
    // The "Domains" heading in the sidebar - use the h3 element specifically
    const domainsHeading = page.locator('aside h3', { hasText: 'Domains' });
    await expect(domainsHeading).toBeVisible();
  });
});
