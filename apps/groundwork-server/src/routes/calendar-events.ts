import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

const VALID_SOURCES = ['manual', 'caldav', 'ical_import'];

// GET /api/calendar-events
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { date, domain_id } = req.query;

  let sql = 'SELECT * FROM calendar_events WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (date) {
    sql += ' AND date = ?';
    params.push(date);
  }
  if (domain_id) {
    sql += ' AND domain_id = ?';
    params.push(domain_id);
  }

  sql += ' ORDER BY date, start_time';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/calendar-events
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const {
    title, date, start_time, end_time, duration_minutes,
    is_recurring, recurrence_rule, source, external_id, domain_id
  } = req.body;

  if (!title || !date || !start_time || !end_time || duration_minutes === undefined) {
    res.status(400).json({ error: 'title, date, start_time, end_time, and duration_minutes are required' });
    return;
  }

  if (source !== undefined && !VALID_SOURCES.includes(source)) {
    res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(', ')}` });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO calendar_events (id, title, date, start_time, end_time, duration_minutes,
      is_recurring, recurrence_rule, source, external_id, domain_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, date, start_time, end_time, duration_minutes,
    is_recurring ?? 0,
    recurrence_rule ?? null,
    source ?? 'manual',
    external_id ?? null,
    domain_id ?? null,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
  res.status(201).json(row);
});

// PATCH /api/calendar-events/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Calendar event not found' });
    return;
  }

  if (req.body.source !== undefined && !VALID_SOURCES.includes(req.body.source)) {
    res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(', ')}` });
    return;
  }

  const fields = ['title', 'date', 'start_time', 'end_time', 'duration_minutes',
    'is_recurring', 'recurrence_rule', 'source', 'external_id', 'domain_id'];
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

  db.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/calendar-events/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM calendar_events WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Calendar event not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE calendar_events SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
