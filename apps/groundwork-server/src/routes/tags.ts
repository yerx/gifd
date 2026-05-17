import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/tags
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY sort_order'
  ).all();
  res.json(rows);
});

// POST /api/tags
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, color, sort_order } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO tags (id, name, color, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, color ?? null, sort_order ?? 0.0, timestamp, timestamp);

  const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/tags/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM tags WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/tags/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM tags WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  const fields = ['name', 'color', 'sort_order'];
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

  db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/tags/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM tags WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  const timestamp = now();

  const softDelete = db.transaction(() => {
    db.prepare('UPDATE tags SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, timestamp, req.params.id);
    db.prepare('UPDATE task_tags SET deleted_at = ?, updated_at = ? WHERE tag_id = ? AND deleted_at IS NULL')
      .run(timestamp, timestamp, req.params.id);
  });

  softDelete();
  res.status(200).json({ deleted: true });
});

export default router;
