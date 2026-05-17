import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/materials
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { project_id, status } = req.query;

  let sql = 'SELECT * FROM materials WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (project_id) {
    sql += ' AND project_id = ?';
    params.push(project_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sort_order';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/materials
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { project_id, name, quantity, unit_cost, source, status, blocks_tasks, photo_path, notes, sort_order } = req.body;

  if (!project_id || !name) {
    res.status(400).json({ error: 'project_id and name are required' });
    return;
  }

  const id = generateId();
  const timestamp = now();
  const blocksJson = blocks_tasks ? JSON.stringify(blocks_tasks) : '[]';

  db.prepare(`
    INSERT INTO materials (id, project_id, name, quantity, unit_cost, source, status, blocks_tasks, photo_path, notes, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, project_id, name,
    quantity ?? 1,
    unit_cost ?? null,
    source ?? null,
    status ?? 'needed',
    blocksJson,
    photo_path ?? null,
    notes ?? null,
    sort_order ?? 0.0,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/materials/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/materials/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  const directFields = ['project_id', 'name', 'quantity', 'unit_cost', 'source', 'status', 'photo_path', 'notes', 'sort_order'];
  for (const field of directFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (req.body.blocks_tasks !== undefined) {
    updates.push('blocks_tasks = ?');
    params.push(JSON.stringify(req.body.blocks_tasks));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const timestamp = now();
  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(req.params.id);

  db.prepare(`UPDATE materials SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/materials/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE materials SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
