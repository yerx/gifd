import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/task-tags (filter by task_id or tag_id)
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { task_id, tag_id } = req.query;

  let sql = 'SELECT * FROM task_tags WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (task_id) {
    sql += ' AND task_id = ?';
    params.push(task_id);
  }
  if (tag_id) {
    sql += ' AND tag_id = ?';
    params.push(tag_id);
  }

  sql += ' ORDER BY created_at';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/task-tags
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { task_id, tag_id } = req.body;

  if (!task_id || !tag_id) {
    res.status(400).json({ error: 'task_id and tag_id are required' });
    return;
  }

  // Verify task exists
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND deleted_at IS NULL').get(task_id);
  if (!task) {
    res.status(400).json({ error: 'Task not found' });
    return;
  }

  // Verify tag exists
  const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND deleted_at IS NULL').get(tag_id);
  if (!tag) {
    res.status(400).json({ error: 'Tag not found' });
    return;
  }

  // Check for existing active link
  const existing = db.prepare(
    'SELECT id FROM task_tags WHERE task_id = ? AND tag_id = ? AND deleted_at IS NULL'
  ).get(task_id, tag_id);
  if (existing) {
    res.status(409).json({ error: 'This task-tag association already exists' });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO task_tags (id, task_id, tag_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, task_id, tag_id, timestamp, timestamp);

  const row = db.prepare('SELECT * FROM task_tags WHERE id = ?').get(id);
  res.status(201).json(row);
});

// DELETE /api/task-tags/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM task_tags WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Task-tag association not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE task_tags SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
