import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/projects
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { domain_id, status } = req.query;

  let sql = 'SELECT * FROM projects WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (domain_id) {
    sql += ' AND domain_id = ?';
    params.push(domain_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sort_order';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/projects
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { domain_id, name, description, status, default_view, deadline, sort_order } = req.body;

  if (!domain_id || !name) {
    res.status(400).json({ error: 'domain_id and name are required' });
    return;
  }

  // Verify domain exists
  const domain = db.prepare('SELECT id FROM domains WHERE id = ? AND deleted_at IS NULL').get(domain_id);
  if (!domain) {
    res.status(400).json({ error: 'Domain not found' });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO projects (id, domain_id, name, description, status, default_view, deadline, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, domain_id, name,
    description ?? null,
    status ?? 'active',
    default_view ?? 'list',
    deadline ?? null,
    sort_order ?? 0.0,
    timestamp, timestamp
  );

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/projects/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/projects/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const fields = ['domain_id', 'name', 'description', 'status', 'default_view',
    'last_touched_at', 'last_context_note', 'deadline', 'sort_order'];

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

  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/projects/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const timestamp = now();

  const softDelete = db.transaction(() => {
    db.prepare('UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, timestamp, req.params.id);

    // Get task IDs before soft deleting
    const taskIds = db.prepare(
      'SELECT id FROM tasks WHERE project_id = ? AND deleted_at IS NULL'
    ).all(req.params.id) as Array<{ id: string }>;

    db.prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL')
      .run(timestamp, timestamp, req.params.id);

    // Get material IDs before soft deleting
    const materialIds = db.prepare(
      'SELECT id FROM materials WHERE project_id = ? AND deleted_at IS NULL'
    ).all(req.params.id) as Array<{ id: string }>;

    db.prepare('UPDATE materials SET deleted_at = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL')
      .run(timestamp, timestamp, req.params.id);

    // Cascade to attachments for tasks
    for (const task of taskIds) {
      db.prepare('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE task_id = ? AND deleted_at IS NULL')
        .run(timestamp, timestamp, task.id);
    }

    // Cascade to attachments for the project
    db.prepare('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL')
      .run(timestamp, timestamp, req.params.id);

    // Cascade to attachments for materials
    for (const material of materialIds) {
      db.prepare('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE material_id = ? AND deleted_at IS NULL')
        .run(timestamp, timestamp, material.id);
    }
  });

  softDelete();
  res.status(200).json({ deleted: true });
});

export default router;
