import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

const VALID_ATTACHMENT_TYPES = ['photo', 'audio', 'document', 'other'];

// GET /api/attachments (filter by task_id, project_id, inbox_item_id, or material_id)
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { task_id, project_id, inbox_item_id, material_id } = req.query;

  let sql = 'SELECT * FROM attachments WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (task_id) {
    sql += ' AND task_id = ?';
    params.push(task_id);
  }
  if (project_id) {
    sql += ' AND project_id = ?';
    params.push(project_id);
  }
  if (inbox_item_id) {
    sql += ' AND inbox_item_id = ?';
    params.push(inbox_item_id);
  }
  if (material_id) {
    sql += ' AND material_id = ?';
    params.push(material_id);
  }

  sql += ' ORDER BY sort_order';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/attachments
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const {
    type, file_path, file_name, mime_type, file_size_bytes,
    task_id, project_id, inbox_item_id, material_id, sort_order
  } = req.body;

  if (!type || !file_path) {
    res.status(400).json({ error: 'type and file_path are required' });
    return;
  }

  if (!VALID_ATTACHMENT_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_ATTACHMENT_TYPES.join(', ')}` });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO attachments (id, type, file_path, file_name, mime_type, file_size_bytes,
      task_id, project_id, inbox_item_id, material_id, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, type, file_path,
    file_name ?? null,
    mime_type ?? null,
    file_size_bytes ?? null,
    task_id ?? null,
    project_id ?? null,
    inbox_item_id ?? null,
    material_id ?? null,
    sort_order ?? 0.0,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/attachments/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM attachments WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Attachment not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/attachments/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM attachments WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Attachment not found' });
    return;
  }

  const fields = ['file_name', 'mime_type', 'sort_order'];
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

  db.prepare(`UPDATE attachments SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/attachments/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM attachments WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Attachment not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
