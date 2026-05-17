import { test, expect } from '@playwright/test';

test.describe('Search API (FTS5)', () => {
  test.describe.configure({ mode: 'serial' });

  let domainId: string;
  let projectId: string;
  let taskId: string;

  test.beforeAll(async ({ request }) => {
    // Create entities with known unique text for search testing
    const domainRes = await request.post('/api/domains', {
      data: { name: 'Search Test Domain', color: '#990011' },
    });
    const domain = await domainRes.json();
    domainId = domain.id;

    const projectRes = await request.post('/api/projects', {
      data: {
        domain_id: domainId,
        name: 'Xylophonic Project Alpha',
        description: 'A project about xylophonic instruments',
      },
    });
    const project = await projectRes.json();
    projectId = project.id;

    const taskRes = await request.post('/api/tasks', {
      data: {
        project_id: projectId,
        title: 'Zamboni maintenance schedule',
        notes: 'Check the zamboni fluid levels',
      },
    });
    const task = await taskRes.json();
    taskId = task.id;
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`/api/tasks/${taskId}`);
    await request.delete(`/api/domains/${domainId}`);
  });

  test('GET /api/search?q= - empty query returns empty results', async ({ request }) => {
    const response = await request.get('/api/search?q=');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.results).toEqual([]);
    expect(body.query).toBe('');
  });

  test('GET /api/search?q=zamboni - finds the task', async ({ request }) => {
    const response = await request.get('/api/search?q=zamboni');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.results.length).toBeGreaterThanOrEqual(1);

    const taskResult = body.results.find(
      (r: { id: string; type: string }) => r.id === taskId && r.type === 'task'
    );
    expect(taskResult).toBeTruthy();
    expect(taskResult.title).toContain('Zamboni');
  });

  test('GET /api/search?q=xylophonic - finds the project', async ({ request }) => {
    const response = await request.get('/api/search?q=xylophonic');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.results.length).toBeGreaterThanOrEqual(1);

    const projectResult = body.results.find(
      (r: { id: string; type: string }) => r.id === projectId && r.type === 'project'
    );
    expect(projectResult).toBeTruthy();
  });

  test('GET /api/search?q=zamboni&type=task - type filter works', async ({ request }) => {
    const response = await request.get('/api/search?q=zamboni&type=task');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.results.length).toBeGreaterThanOrEqual(1);

    // All results should be tasks
    for (const r of body.results) {
      expect(r.type).toBe('task');
    }
  });

  test('GET /api/search?q=zamboni&type=project - type filter excludes non-matching types', async ({ request }) => {
    const response = await request.get('/api/search?q=zamboni&type=project');
    expect(response.status()).toBe(200);

    const body = await response.json();
    // Should not find the task when filtering to projects only
    const taskResult = body.results.find(
      (r: { id: string; type: string }) => r.id === taskId
    );
    expect(taskResult).toBeUndefined();
  });

  test('GET /api/search?q=nonexistenttermxyz - no results for unknown term', async ({ request }) => {
    const response = await request.get('/api/search?q=nonexistenttermxyz');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.results).toEqual([]);
  });

  test('Search response includes elapsed_ms', async ({ request }) => {
    const response = await request.get('/api/search?q=zamboni');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body.elapsed_ms).toBe('number');
    expect(body.query).toBe('zamboni');
  });
});
