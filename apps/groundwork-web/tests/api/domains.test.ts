import { test, expect } from '@playwright/test';

test.describe('Domains API', () => {
  test.describe.configure({ mode: 'serial' });

  let createdDomainId: string;

  test('POST /api/domains - create a domain', async ({ request }) => {
    const response = await request.post('/api/domains', {
      data: {
        name: 'Test Domain',
        color: '#ff5500',
        icon: 'star',
        sort_order: 10,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe('Test Domain');
    expect(body.color).toBe('#ff5500');
    expect(body.icon).toBe('star');
    expect(body.sort_order).toBe(10);
    expect(body.created_at).toBeTruthy();
    expect(body.updated_at).toBeTruthy();
    expect(body.deleted_at).toBeNull();

    createdDomainId = body.id;
  });

  test('GET /api/domains/:id - read domain back', async ({ request }) => {
    const response = await request.get(`/api/domains/${createdDomainId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(createdDomainId);
    expect(body.name).toBe('Test Domain');
    expect(body.color).toBe('#ff5500');
  });

  test('PATCH /api/domains/:id - update name and color', async ({ request }) => {
    const response = await request.patch(`/api/domains/${createdDomainId}`, {
      data: {
        name: 'Updated Domain',
        color: '#00aaff',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(createdDomainId);
    expect(body.name).toBe('Updated Domain');
    expect(body.color).toBe('#00aaff');
  });

  test('GET /api/domains - list all domains includes created domain', async ({ request }) => {
    const response = await request.get('/api/domains');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    const found = body.find((d: { id: string }) => d.id === createdDomainId);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Updated Domain');
  });

  test('DELETE /api/domains/:id - soft delete domain', async ({ request }) => {
    const deleteResponse = await request.delete(`/api/domains/${createdDomainId}`);
    expect(deleteResponse.status()).toBe(200);

    const deleteBody = await deleteResponse.json();
    expect(deleteBody.deleted).toBe(true);
  });

  test('GET /api/domains/:id - deleted domain returns 404', async ({ request }) => {
    const response = await request.get(`/api/domains/${createdDomainId}`);
    expect(response.status()).toBe(404);
  });

  test('GET /api/domains - deleted domain not in list', async ({ request }) => {
    const response = await request.get('/api/domains');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const found = body.find((d: { id: string }) => d.id === createdDomainId);
    expect(found).toBeUndefined();
  });

  test('POST /api/domains - missing required fields returns 400', async ({ request }) => {
    const response = await request.post('/api/domains', {
      data: { name: 'No Color' },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('PATCH /api/domains/:id - no fields returns 400', async ({ request }) => {
    // Create a temporary domain for this test
    const createRes = await request.post('/api/domains', {
      data: { name: 'Temp', color: '#000000' },
    });
    const tempDomain = await createRes.json();

    const response = await request.patch(`/api/domains/${tempDomain.id}`, {
      data: {},
    });
    expect(response.status()).toBe(400);

    // Clean up
    await request.delete(`/api/domains/${tempDomain.id}`);
  });

  test('GET /api/domains/:id - non-existent id returns 404', async ({ request }) => {
    const response = await request.get('/api/domains/nonexistent-id');
    expect(response.status()).toBe(404);
  });
});
