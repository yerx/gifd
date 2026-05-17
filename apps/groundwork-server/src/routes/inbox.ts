import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

const VALID_INBOX_TYPES = ['text', 'voice', 'photo'];

// GET /api/inbox
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { unprocessed } = req.query;

  let sql = 'SELECT * FROM inbox_items WHERE deleted_at IS NULL';
  if (unprocessed === 'true') {
    sql += ' AND processed_at IS NULL';
  }
  sql += ' ORDER BY created_at ASC';

  const rows = db.prepare(sql).all();
  res.json(rows);
});

// POST /api/inbox
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { type, raw_text, audio_path, photo_path, ocr_text, quick_note } = req.body;

  if (!type) {
    res.status(400).json({ error: 'type is required' });
    return;
  }

  if (!VALID_INBOX_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_INBOX_TYPES.join(', ')}` });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO inbox_items (id, type, raw_text, audio_path, photo_path, ocr_text, quick_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, type,
    raw_text ?? null,
    audio_path ?? null,
    photo_path ?? null,
    ocr_text ?? null,
    quick_note ?? null,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/inbox/count
router.get('/count', (_req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM inbox_items WHERE deleted_at IS NULL AND processed_at IS NULL'
  ).get() as { count: number };
  res.json({ count: result.count });
});

// GET /api/inbox/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM inbox_items WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Inbox item not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/inbox/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM inbox_items WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Inbox item not found' });
    return;
  }

  const fields = ['raw_text', 'audio_path', 'photo_path', 'ocr_text', 'quick_note',
    'processed_at', 'processed_to_task_id'];

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

  db.prepare(`UPDATE inbox_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/inbox/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM inbox_items WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Inbox item not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE inbox_items SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
