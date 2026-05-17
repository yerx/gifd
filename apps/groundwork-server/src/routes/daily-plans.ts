import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/daily-plans
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { date } = req.query;

  let sql = 'SELECT * FROM daily_plans WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (date) {
    sql += ' AND date = ?';
    params.push(date);
  }

  sql += ' ORDER BY date DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/daily-plans
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { date, available_minutes, buffer_percent } = req.body;

  if (!date) {
    res.status(400).json({ error: 'date is required' });
    return;
  }

  // Check for existing plan on this date
  const existing = db.prepare(
    'SELECT id FROM daily_plans WHERE date = ? AND deleted_at IS NULL'
  ).get(date);
  if (existing) {
    res.status(409).json({ error: 'A daily plan already exists for this date' });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO daily_plans (id, date, available_minutes, buffer_percent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id, date,
    available_minutes ?? 480,
    buffer_percent ?? 20,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/daily-plans/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM daily_plans WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Daily plan not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/daily-plans/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM daily_plans WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Daily plan not found' });
    return;
  }

  const fields = ['available_minutes', 'buffer_percent', 'reflection_note',
    'morning_ritual_completed_at', 'close_out_completed_at'];

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

  db.prepare(`UPDATE daily_plans SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/daily-plans/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM daily_plans WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Daily plan not found' });
    return;
  }

  const timestamp = now();

  const softDelete = db.transaction(() => {
    db.prepare('UPDATE daily_plans SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, timestamp, req.params.id);
    // Cascade: soft delete time blocks for this plan
    db.prepare('UPDATE time_blocks SET deleted_at = ?, updated_at = ? WHERE daily_plan_id = ? AND deleted_at IS NULL')
      .run(timestamp, timestamp, req.params.id);
  });

  softDelete();
  res.status(200).json({ deleted: true });
});

export default router;
