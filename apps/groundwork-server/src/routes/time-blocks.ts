import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/time-blocks
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { daily_plan_id } = req.query;

  let sql = 'SELECT * FROM time_blocks WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (daily_plan_id) {
    sql += ' AND daily_plan_id = ?';
    params.push(daily_plan_id);
  }

  sql += ' ORDER BY start_time, sort_order';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/time-blocks
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { daily_plan_id, domain_id, start_time, end_time, theme, task_ids, sort_order } = req.body;

  if (!daily_plan_id || !start_time || !end_time) {
    res.status(400).json({ error: 'daily_plan_id, start_time, and end_time are required' });
    return;
  }

  const id = generateId();
  const timestamp = now();
  const taskIdsJson = task_ids ? JSON.stringify(task_ids) : '[]';

  db.prepare(`
    INSERT INTO time_blocks (id, daily_plan_id, domain_id, start_time, end_time, theme, task_ids, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, daily_plan_id,
    domain_id ?? null,
    start_time, end_time,
    theme ?? null,
    taskIdsJson,
    sort_order ?? 0.0,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/time-blocks/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM time_blocks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Time block not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/time-blocks/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM time_blocks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Time block not found' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  const directFields = ['daily_plan_id', 'domain_id', 'start_time', 'end_time', 'theme', 'sort_order'];
  for (const field of directFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (req.body.task_ids !== undefined) {
    updates.push('task_ids = ?');
    params.push(JSON.stringify(req.body.task_ids));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const timestamp = now();
  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(req.params.id);

  db.prepare(`UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/time-blocks/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM time_blocks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Time block not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE time_blocks SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
