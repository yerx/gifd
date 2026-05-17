import { test, expect } from '@playwright/test';

test.describe('Data Management API', () => {
  test('GET /api/data-management/db-size - returns database size', async ({ request }) => {
    const response = await request.get('/api/data-management/db-size');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body.size_bytes).toBe('number');
    expect(body.size_bytes).toBeGreaterThan(0);
    expect(typeof body.size_formatted).toBe('string');
    expect(body.size_formatted.length).toBeGreaterThan(0);
  });

  test('GET /api/data-management/export - returns all tables', async ({ request }) => {
    const response = await request.get('/api/data-management/export');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.exported_at).toBeTruthy();
    expect(body.version).toBe('1.0');
    expect(body.data).toBeTruthy();

    // Verify all expected tables are present
    const expectedTables = [
      'domains',
      'projects',
      'tasks',
      'materials',
      'daily_plans',
      'time_blocks',
      'inbox_items',
      'attachments',
      'task_events',
      'tags',
      'task_tags',
      'seasonal_config',
      'calendar_events',
      'weekly_theme_templates',
      'weekly_theme_blocks',
    ];

    for (const table of expectedTables) {
      expect(body.data).toHaveProperty(table);
      expect(Array.isArray(body.data[table])).toBe(true);
    }
  });

  test('GET /api/data-management/purge-preview - returns purge preview', async ({ request }) => {
    const response = await request.get('/api/data-management/purge-preview');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeGreaterThanOrEqual(0);
    expect(body.cutoff_date).toBeTruthy();

    // Verify the cutoff date is roughly 90 days ago
    const cutoff = new Date(body.cutoff_date);
    const now = new Date();
    const diffDays = (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(85);
    expect(diffDays).toBeLessThan(95);
  });
});
