import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import path from 'path';
import fs from 'fs';

const router = Router();

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'groundwork.db');

// GET /api/data-management/db-size
// Feature 147: Return the SQLite database file size
router.get('/db-size', (_req: Request, res: Response) => {
  try {
    const stats = fs.statSync(DB_PATH);
    const sizeBytes = stats.size;

    res.json({
      size_bytes: sizeBytes,
      size_formatted: formatBytes(sizeBytes),
    });
  } catch {
    res.json({
      size_bytes: 0,
      size_formatted: '0 B',
    });
  }
});

// GET /api/data-management/export
// Feature 148: Export all data as JSON
router.get('/export', (_req: Request, res: Response) => {
  const db = getDb();

  const tables = [
    'domains',
    'projects',
    'tasks',
    'materials',
    'daily_plans',
    'time_blocks',
    'inbox_items',
    'attachments',
    'task_events',
    'tags',
    'task_tags',
    'seasonal_config',
    'calendar_events',
    'weekly_theme_templates',
    'weekly_theme_blocks',
  ];

  const exportData: Record<string, unknown[]> = {};

  for (const table of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      exportData[table] = rows;
    } catch {
      exportData[table] = [];
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="groundwork-export-${new Date().toISOString().split('T')[0]}.json"`
  );
  res.json({
    exported_at: new Date().toISOString(),
    version: '1.0',
    data: exportData,
  });
});

// POST /api/data-management/purge
// Feature 149: Purge soft-deleted rows older than 90 days
router.post('/purge', (_req: Request, res: Response) => {
  const db = getDb();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffISO = cutoffDate.toISOString();

  const tables = [
    'domains',
    'projects',
    'tasks',
    'materials',
    'daily_plans',
    'time_blocks',
    'inbox_items',
    'attachments',
    'task_events',
    'tags',
    'task_tags',
    'seasonal_config',
    'calendar_events',
    'weekly_theme_templates',
    'weekly_theme_blocks',
  ];

  let totalPurged = 0;
  const purgedByTable: Record<string, number> = {};

  const purge = db.transaction(() => {
    for (const table of tables) {
      try {
        const result = db.prepare(
          `DELETE FROM ${table} WHERE deleted_at IS NOT NULL AND deleted_at < ?`
        ).run(cutoffISO);
        const count = result.changes;
        if (count > 0) {
          purgedByTable[table] = count;
          totalPurged += count;
        }
      } catch {
        // Skip tables that might have FK constraints; they'll be cleaned up after parent rows are deleted
      }
    }
  });

  purge();

  res.json({
    total_purged: totalPurged,
    purged_by_table: purgedByTable,
  });
});

// GET /api/data-management/purge-preview
// Feature 149: Preview count of soft-deleted items eligible for purge
router.get('/purge-preview', (_req: Request, res: Response) => {
  const db = getDb();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffISO = cutoffDate.toISOString();

  const tables = [
    'domains',
    'projects',
    'tasks',
    'materials',
    'daily_plans',
    'time_blocks',
    'inbox_items',
    'attachments',
    'task_events',
    'tags',
    'task_tags',
    'seasonal_config',
    'calendar_events',
    'weekly_theme_templates',
    'weekly_theme_blocks',
  ];

  let totalCount = 0;

  for (const table of tables) {
    try {
      const row = db.prepare(
        `SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NOT NULL AND deleted_at < ?`
      ).get(cutoffISO) as { count: number };
      totalCount += row.count;
    } catch {
      // skip
    }
  }

  res.json({
    count: totalCount,
    cutoff_date: cutoffISO,
  });
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export default router;
