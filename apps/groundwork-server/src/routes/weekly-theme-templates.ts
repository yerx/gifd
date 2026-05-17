import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// GET /api/weekly-theme-templates
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM weekly_theme_templates WHERE deleted_at IS NULL ORDER BY created_at'
  ).all();
  res.json(rows);
});

// POST /api/weekly-theme-templates
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, is_active } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = generateId();
  const timestamp = now();

  db.prepare(`
    INSERT INTO weekly_theme_templates (id, name, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, is_active ?? 1, timestamp, timestamp);

  const row = db.prepare('SELECT * FROM weekly_theme_templates WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/weekly-theme-templates/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM weekly_theme_templates WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/weekly-theme-templates/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM weekly_theme_templates WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const fields = ['name', 'is_active'];
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

  db.prepare(`UPDATE weekly_theme_templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM weekly_theme_templates WHERE id = ?').get(req.params.id);
  res.json(row);
});

// DELETE /api/weekly-theme-templates/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM weekly_theme_templates WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const timestamp = now();

  const softDelete = db.transaction(() => {
    db.prepare('UPDATE weekly_theme_templates SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, timestamp, req.params.id);
    db.prepare('UPDATE weekly_theme_blocks SET deleted_at = ?, updated_at = ? WHERE template_id = ? AND deleted_at IS NULL')
      .run(timestamp, timestamp, req.params.id);
  });

  softDelete();
  res.status(200).json({ deleted: true });
});

export default router;
