import { test, expect } from '@playwright/test';

test.describe('Projects API', () => {
  test.describe.configure({ mode: 'serial' });

  let domainId: string;
  let createdProjectId: string;

  test.beforeAll(async ({ request }) => {
    // Create a domain to hold projects
    const res = await request.post('/api/domains', {
      data: { name: 'Projects Test Domain', color: '#112233' },
    });
    const body = await res.json();
    domainId = body.id;
  });

  test.afterAll(async ({ request }) => {
    // Clean up: delete the domain (cascades to projects)
    await request.delete(`/api/domains/${domainId}`);
  });

  test('POST /api/projects - create a project', async ({ request }) => {
    const response = await request.post('/api/projects', {
      data: {
        domain_id: domainId,
        name: 'Test Project',
        description: 'A test project description',
        status: 'active',
        sort_order: 5,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.domain_id).toBe(domainId);
    expect(body.name).toBe('Test Project');
    expect(body.description).toBe('A test project description');
    expect(body.status).toBe('active');
    expect(body.sort_order).toBe(5);
    expect(body.created_at).toBeTruthy();
    expect(body.deleted_at).toBeNull();

    createdProjectId = body.id;
  });

  test('GET /api/projects/:id - read project back', async ({ request }) => {
    const response = await request.get(`/api/projects/${createdProjectId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(createdProjectId);
    expect(body.name).toBe('Test Project');
    expect(body.domain_id).toBe(domainId);
  });

  test('PATCH /api/projects/:id - update status', async ({ request }) => {
    const response = await request.patch(`/api/projects/${createdProjectId}`, {
      data: { status: 'someday' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('someday');
  });

  test('PATCH /api/projects/:id - update name and description', async ({ request }) => {
    const response = await request.patch(`/api/projects/${createdProjectId}`, {
      data: {
        name: 'Updated Project Name',
        description: 'Updated description',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Updated Project Name');
    expect(body.description).toBe('Updated description');
  });

  test('GET /api/projects?domain_id= - list projects by domain', async ({ request }) => {
    const response = await request.get(`/api/projects?domain_id=${domainId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);

    const found = body.find((p: { id: string }) => p.id === createdProjectId);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Updated Project Name');
  });

  test('GET /api/projects?status= - filter by status', async ({ request }) => {
    const response = await request.get('/api/projects?status=someday');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    const found = body.find((p: { id: string }) => p.id === createdProjectId);
    expect(found).toBeTruthy();
  });

  test('DELETE /api/projects/:id - soft delete project', async ({ request }) => {
    const response = await request.delete(`/api/projects/${createdProjectId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.deleted).toBe(true);
  });

  test('GET /api/projects/:id - deleted project returns 404', async ({ request }) => {
    const response = await request.get(`/api/projects/${createdProjectId}`);
    expect(response.status()).toBe(404);
  });

  test('GET /api/projects - deleted project not in list', async ({ request }) => {
    const response = await request.get(`/api/projects?domain_id=${domainId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const found = body.find((p: { id: string }) => p.id === createdProjectId);
    expect(found).toBeUndefined();
  });

  test('POST /api/projects - missing required fields returns 400', async ({ request }) => {
    const response = await request.post('/api/projects', {
      data: { name: 'No Domain' },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/projects - invalid domain_id returns 400', async ({ request }) => {
    const response = await request.post('/api/projects', {
      data: { domain_id: 'nonexistent', name: 'Bad Domain' },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
