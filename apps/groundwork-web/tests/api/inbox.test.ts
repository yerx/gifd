import { test, expect } from '@playwright/test';

test.describe('Inbox API', () => {
  test.describe.configure({ mode: 'serial' });

  let createdItemId: string;

  test('POST /api/inbox - create an inbox item', async ({ request }) => {
    const response = await request.post('/api/inbox', {
      data: {
        type: 'text',
        raw_text: 'Remember to buy groceries',
        quick_note: 'Groceries reminder',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.type).toBe('text');
    expect(body.raw_text).toBe('Remember to buy groceries');
    expect(body.quick_note).toBe('Groceries reminder');
    expect(body.processed_at).toBeNull();
    expect(body.deleted_at).toBeNull();

    createdItemId = body.id;
  });

  test('GET /api/inbox - list inbox items', async ({ request }) => {
    const response = await request.get('/api/inbox');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    const found = body.find((i: { id: string }) => i.id === createdItemId);
    expect(found).toBeTruthy();
    expect(found.type).toBe('text');
  });

  test('GET /api/inbox/:id - read inbox item', async ({ request }) => {
    const response = await request.get(`/api/inbox/${createdItemId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(createdItemId);
    expect(body.raw_text).toBe('Remember to buy groceries');
  });

  test('GET /api/inbox?unprocessed=true - list unprocessed items', async ({ request }) => {
    const response = await request.get('/api/inbox?unprocessed=true');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    const found = body.find((i: { id: string }) => i.id === createdItemId);
    expect(found).toBeTruthy();
  });

  test('GET /api/inbox/count - get unprocessed count', async ({ request }) => {
    const response = await request.get('/api/inbox/count');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeGreaterThanOrEqual(1);
  });

  test('PATCH /api/inbox/:id - mark as processed', async ({ request }) => {
    const timestamp = new Date().toISOString();
    const response = await request.patch(`/api/inbox/${createdItemId}`, {
      data: { processed_at: timestamp },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.processed_at).toBeTruthy();
  });

  test('GET /api/inbox?unprocessed=true - processed item not in unprocessed list', async ({ request }) => {
    const response = await request.get('/api/inbox?unprocessed=true');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const found = body.find((i: { id: string }) => i.id === createdItemId);
    expect(found).toBeUndefined();
  });

  test('DELETE /api/inbox/:id - soft delete', async ({ request }) => {
    const response = await request.delete(`/api/inbox/${createdItemId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.deleted).toBe(true);
  });

  test('GET /api/inbox/:id - deleted item returns 404', async ({ request }) => {
    const response = await request.get(`/api/inbox/${createdItemId}`);
    expect(response.status()).toBe(404);
  });

  test('POST /api/inbox - missing type returns 400', async ({ request }) => {
    const response = await request.post('/api/inbox', {
      data: { raw_text: 'No type' },
    });
    expect(response.status()).toBe(400);
  });

  test('POST /api/inbox - invalid type returns 400', async ({ request }) => {
    const response = await request.post('/api/inbox', {
      data: { type: 'invalid' },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('type must be one of');
  });
});
