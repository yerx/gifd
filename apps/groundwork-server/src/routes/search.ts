import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';

const router = Router();

interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'inbox' | 'material';
  title: string;
  snippet: string;
  domain_id: string | null;
  project_id: string | null;
  status: string | null;
}

// GET /api/search?q=keyword&type=task,project,inbox,material&limit=20
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const query = (req.query.q as string || '').trim();
  const typeFilter = req.query.type as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  if (!query) {
    res.json({ results: [], query: '', elapsed_ms: 0 });
    return;
  }

  const startTime = Date.now();

  // Sanitize the FTS5 query: escape special characters and append *
  const ftsQuery = query
    .replace(/['"]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term}"*`)
    .join(' ');

  if (!ftsQuery) {
    res.json({ results: [], query, elapsed_ms: 0 });
    return;
  }

  const allowedTypes = typeFilter
    ? typeFilter.split(',').map((t) => t.trim())
    : ['task', 'project', 'inbox', 'material'];

  const results: SearchResult[] = [];

  // Search tasks via FTS5
  if (allowedTypes.includes('task')) {
    try {
      const rows = db.prepare(`
        SELECT
          t.id,
          'task' as type,
          t.title,
          snippet(tasks_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          p.domain_id,
          t.project_id,
          t.status
        FROM tasks_fts
        JOIN tasks t ON t.rowid = tasks_fts.rowid
        LEFT JOIN projects p ON p.id = t.project_id
        WHERE tasks_fts MATCH ?
          AND t.deleted_at IS NULL
        ORDER BY rank
        LIMIT ?
      `).all(ftsQuery, limit) as SearchResult[];
      results.push(...rows);
    } catch {
      // FTS query error, skip
    }
  }

  // Search projects via FTS5
  if (allowedTypes.includes('project')) {
    try {
      const rows = db.prepare(`
        SELECT
          p.id,
          'project' as type,
          p.name as title,
          snippet(projects_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          p.domain_id,
          NULL as project_id,
          p.status
        FROM projects_fts
        JOIN projects p ON p.rowid = projects_fts.rowid
        WHERE projects_fts MATCH ?
          AND p.deleted_at IS NULL
        ORDER BY rank
        LIMIT ?
      `).all(ftsQuery, limit) as SearchResult[];
      results.push(...rows);
    } catch {
      // FTS query error, skip
    }
  }

  // Search inbox items via FTS5
  if (allowedTypes.includes('inbox')) {
    try {
      const rows = db.prepare(`
        SELECT
          i.id,
          'inbox' as type,
          COALESCE(i.quick_note, substr(i.raw_text, 1, 80)) as title,
          snippet(inbox_items_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          NULL as domain_id,
          NULL as project_id,
          CASE WHEN i.processed_at IS NOT NULL THEN 'processed' ELSE 'unprocessed' END as status
        FROM inbox_items_fts
        JOIN inbox_items i ON i.rowid = inbox_items_fts.rowid
        WHERE inbox_items_fts MATCH ?
          AND i.deleted_at IS NULL
        ORDER BY rank
        LIMIT ?
      `).all(ftsQuery, limit) as SearchResult[];
      results.push(...rows);
    } catch {
      // FTS query error, skip
    }
  }

  // Search materials via FTS5
  if (allowedTypes.includes('material')) {
    try {
      const rows = db.prepare(`
        SELECT
          m.id,
          'material' as type,
          m.name as title,
          snippet(materials_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          NULL as domain_id,
          m.project_id,
          m.status
        FROM materials_fts
        JOIN materials m ON m.rowid = materials_fts.rowid
        WHERE materials_fts MATCH ?
          AND m.deleted_at IS NULL
        ORDER BY rank
        LIMIT ?
      `).all(ftsQuery, limit) as SearchResult[];
      results.push(...rows);
    } catch {
      // FTS query error, skip
    }
  }

  const elapsed_ms = Date.now() - startTime;

  res.json({
    results: results.slice(0, limit),
    query,
    elapsed_ms,
  });
});

export default router;
