import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/seasonal-config
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM seasonal_config WHERE deleted_at IS NULL ORDER BY key'
  ).all();
  res.json(rows);
});

// POST /api/seasonal-config
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { key, value, year, notes } = req.body;

  if (!key || !value) {
    res.status(400).json({ error: 'key and value are required' });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO seasonal_config (id, key, value, year, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, key, value, year ?? null, notes ?? null, timestamp, timestamp);

  const row = db.prepare('SELECT * FROM seasonal_config WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/seasonal-config/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM seasonal_config WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Config not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/seasonal-config/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM seasonal_config WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Config not found' });
    return;
  }

  const fields = ['key', 'value', 'year', 'notes'];
  const updates: string[] = [];
  const params: unknown[] = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const timestamp = now();
  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(req.params.id);

  db.prepare(`UPDATE seasonal_config SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM seasonal_config WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/seasonal-config/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM seasonal_config WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Config not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE seasonal_config SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
