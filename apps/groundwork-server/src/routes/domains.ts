import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/domains
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM domains WHERE deleted_at IS NULL ORDER BY sort_order'
  ).all();
  res.json(rows);
});

// POST /api/domains
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, color, icon, sort_order } = req.body;

  if (!name || !color) {
    res.status(400).json({ error: 'name and color are required' });
    return;
  }

  const id = generateId();
  const timestamp = now();
  const sortOrder = sort_order ?? 0.0;

  db.prepare(`
    INSERT INTO domains (id, name, color, icon, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, color, icon ?? null, sortOrder, timestamp, timestamp);

  const row = db.prepare('SELECT * FROM domains WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/domains/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM domains WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/domains/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM domains WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id) as Record<string, unknown> | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  const fields = ['name', 'color', 'icon', 'sort_order'];
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

  db.prepare(`UPDATE domains SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM domains WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/domains/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM domains WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  // Prevent deleting the last domain
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM domains WHERE deleted_at IS NULL'
  ).get() as { count: number };
  if (count.count <= 1) {
    res.status(400).json({ error: 'Cannot delete the last domain. At least one domain must exist.' });
    return;
  }

  const timestamp = now();

  // Soft delete domain and cascade to projects, tasks, materials, attachments
  const softDelete = db.transaction(() => {
    db.prepare('UPDATE domains SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, timestamp, req.params.id);

    // Cascade: soft delete projects
    const projects = db.prepare(
      'SELECT id FROM projects WHERE domain_id = ? AND deleted_at IS NULL'
    ).all(req.params.id) as Array<{ id: string }>;

    for (const project of projects) {
      db.prepare('UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?')
        .run(timestamp, timestamp, project.id);

      // Get task IDs for this project before soft deleting
      const taskIds = db.prepare(
        'SELECT id FROM tasks WHERE project_id = ? AND deleted_at IS NULL'
      ).all(project.id) as Array<{ id: string }>;

      db.prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL')
        .run(timestamp, timestamp, project.id);

      // Get material IDs for this project before soft deleting
      const materialIds = db.prepare(
        'SELECT id FROM materials WHERE project_id = ? AND deleted_at IS NULL'
      ).all(project.id) as Array<{ id: string }>;

      db.prepare('UPDATE materials SET deleted_at = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL')
        .run(timestamp, timestamp, project.id);

      // Cascade to attachments for tasks
      for (const task of taskIds) {
        db.prepare('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE task_id = ? AND deleted_at IS NULL')
          .run(timestamp, timestamp, task.id);
      }

      // Cascade to attachments for the project
      db.prepare('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL')
        .run(timestamp, timestamp, project.id);

      // Cascade to attachments for materials
      for (const material of materialIds) {
        db.prepare('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE material_id = ? AND deleted_at IS NULL')
          .run(timestamp, timestamp, material.id);
      }
    }
  });

  softDelete();
  res.status(200).json({ deleted: true });
});

export default router;
