import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/weekly-theme-blocks
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { template_id } = req.query;

  let sql = 'SELECT * FROM weekly_theme_blocks WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (template_id) {
    sql += ' AND template_id = ?';
    params.push(template_id);
  }

  sql += ' ORDER BY day_of_week, start_time, sort_order';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/weekly-theme-blocks
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { template_id, day_of_week, start_time, end_time, domain_id, theme, sort_order } = req.body;

  if (!template_id || day_of_week === undefined || !start_time || !end_time) {
    res.status(400).json({ error: 'template_id, day_of_week, start_time, and end_time are required' });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO weekly_theme_blocks (id, template_id, day_of_week, start_time, end_time, domain_id, theme, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, template_id, day_of_week, start_time, end_time,
    domain_id ?? null,
    theme ?? null,
    sort_order ?? 0.0,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM weekly_theme_blocks WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/weekly-theme-blocks/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM weekly_theme_blocks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Block not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/weekly-theme-blocks/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM weekly_theme_blocks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Block not found' });
    return;
  }

  const fields = ['template_id', 'day_of_week', 'start_time', 'end_time', 'domain_id', 'theme', 'sort_order'];
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

  db.prepare(`UPDATE weekly_theme_blocks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM weekly_theme_blocks WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/weekly-theme-blocks/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM weekly_theme_blocks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Block not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE weekly_theme_blocks SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
