import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

const VALID_EVENT_TYPES = [
  'created', 'status_changed', 'assigned_to_plan', 'removed_from_plan',
  'rescheduled', 'completed', 'dropped', 'dependency_added',
  'dependency_removed', 'note_updated', 'estimate_changed'
];

// GET /api/task-events
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { task_id, daily_plan_id, event_type } = req.query;

  let sql = 'SELECT * FROM task_events WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (task_id) {
    sql += ' AND task_id = ?';
    params.push(task_id);
  }
  if (daily_plan_id) {
    sql += ' AND daily_plan_id = ?';
    params.push(daily_plan_id);
  }
  if (event_type) {
    sql += ' AND event_type = ?';
    params.push(event_type);
  }

  sql += ' ORDER BY occurred_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/task-events
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { task_id, event_type, old_value, new_value, occurred_at, daily_plan_id } = req.body;

  if (!task_id || !event_type) {
    res.status(400).json({ error: 'task_id and event_type are required' });
    return;
  }

  if (!VALID_EVENT_TYPES.includes(event_type)) {
    res.status(400).json({ error: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO task_events (id, task_id, event_type, old_value, new_value, occurred_at, daily_plan_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, task_id, event_type,
    old_value ?? null,
    new_value ?? null,
    occurred_at ?? timestamp,
    daily_plan_id ?? null,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM task_events WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/task-events/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM task_events WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Task event not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/task-events/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM task_events WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Task event not found' });
    return;
  }

  const VALID_EVENT_TYPES = [
    'created', 'status_changed', 'assigned_to_plan', 'removed_from_plan',
    'rescheduled', 'completed', 'dropped', 'dependency_added',
    'dependency_removed', 'note_updated', 'estimate_changed'
  ];

  if (req.body.event_type !== undefined && !VALID_EVENT_TYPES.includes(req.body.event_type)) {
    res.status(400).json({ error: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` });
    return;
  }

  const fields = ['event_type', 'old_value', 'new_value', 'occurred_at', 'daily_plan_id'];
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

  db.prepare(`UPDATE task_events SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM task_events WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/task-events/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM task_events WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Task event not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE task_events SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
