import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.GROUNDWORK_DB_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'groundwork.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    -- =============================================
    -- TABLE 1: domains
    -- =============================================
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT,
      sort_order REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 2: projects
    -- =============================================
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'someday', 'completed', 'archived')),
      default_view TEXT NOT NULL DEFAULT 'list' CHECK (default_view IN ('list', 'kanban', 'timeline', 'materials')),
      last_touched_at TEXT,
      last_context_note TEXT,
      deadline TEXT,
      sort_order REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 3: tasks
    -- =============================================
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'active', 'done', 'dropped')),
      kanban_column TEXT,
      estimated_minutes INTEGER,
      due_date TEXT,
      seasonal_window TEXT,
      depends_on TEXT DEFAULT '[]',
      sort_order REAL NOT NULL DEFAULT 0.0,
      notes TEXT,
      completed_at TEXT,
      recurrence_rule TEXT,
      recurrence_parent_id TEXT REFERENCES tasks(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 4: materials
    -- =============================================
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id),
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_cost REAL,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'ordered', 'acquired')),
      blocks_tasks TEXT DEFAULT '[]',
      photo_path TEXT,
      notes TEXT,
      sort_order REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 5: daily_plans
    -- =============================================
    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      available_minutes INTEGER NOT NULL DEFAULT 480,
      buffer_percent INTEGER NOT NULL DEFAULT 20,
      reflection_note TEXT,
      morning_ritual_completed_at TEXT,
      close_out_completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 6: time_blocks
    -- =============================================
    CREATE TABLE IF NOT EXISTS time_blocks (
      id TEXT PRIMARY KEY NOT NULL,
      daily_plan_id TEXT NOT NULL REFERENCES daily_plans(id),
      domain_id TEXT REFERENCES domains(id),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      theme TEXT,
      task_ids TEXT DEFAULT '[]',
      sort_order REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 7: inbox_items
    -- =============================================
    CREATE TABLE IF NOT EXISTS inbox_items (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'photo')),
      raw_text TEXT,
      audio_path TEXT,
      photo_path TEXT,
      ocr_text TEXT,
      quick_note TEXT,
      processed_at TEXT,
      processed_to_task_id TEXT REFERENCES tasks(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 8: attachments
    -- =============================================
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('photo', 'audio', 'document', 'other')),
      file_path TEXT NOT NULL,
      file_name TEXT,
      mime_type TEXT,
      file_size_bytes INTEGER,
      task_id TEXT REFERENCES tasks(id),
      project_id TEXT REFERENCES projects(id),
      inbox_item_id TEXT REFERENCES inbox_items(id),
      material_id TEXT REFERENCES materials(id),
      sort_order REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 9: task_events
    -- =============================================
    CREATE TABLE IF NOT EXISTS task_events (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      event_type TEXT NOT NULL CHECK (event_type IN (
        'created', 'status_changed', 'assigned_to_plan', 'removed_from_plan',
        'rescheduled', 'completed', 'dropped', 'dependency_added',
        'dependency_removed', 'note_updated', 'estimate_changed'
      )),
      old_value TEXT,
      new_value TEXT,
      occurred_at TEXT NOT NULL,
      daily_plan_id TEXT REFERENCES daily_plans(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 10: tags
    -- =============================================
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      sort_order REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 11: task_tags
    -- =============================================
    CREATE TABLE IF NOT EXISTS task_tags (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      tag_id TEXT NOT NULL REFERENCES tags(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 12: seasonal_config
    -- =============================================
    CREATE TABLE IF NOT EXISTS seasonal_config (
      id TEXT PRIMARY KEY NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      year INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 13: calendar_events
    -- =============================================
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_rule TEXT,
      source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'caldav', 'ical_import')),
      external_id TEXT,
      domain_id TEXT REFERENCES domains(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 14: weekly_theme_templates
    -- =============================================
    CREATE TABLE IF NOT EXISTS weekly_theme_templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    -- =============================================
    -- TABLE 15: weekly_theme_blocks
    -- =============================================
    CREATE TABLE IF NOT EXISTS weekly_theme_blocks (
      id TEXT PRIMARY KEY NOT NULL,
      template_id TEXT NOT NULL REFERENCES weekly_theme_templates(id),
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      domain_id TEXT REFERENCES domains(id),
      theme TEXT,
      sort_order REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // =============================================
  // INDEXES
  // =============================================
  db.exec(`
    -- domains indexes
    CREATE INDEX IF NOT EXISTS idx_domains_sort ON domains(sort_order)
      WHERE deleted_at IS NULL;

    -- projects indexes
    CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain_id, sort_order)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_projects_last_touched ON projects(last_touched_at)
      WHERE deleted_at IS NULL AND status = 'active';
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)
      WHERE deleted_at IS NULL;

    -- tasks indexes
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, sort_order)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)
      WHERE deleted_at IS NULL AND due_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at)
      WHERE deleted_at IS NULL AND completed_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence_parent_id)
      WHERE deleted_at IS NULL AND recurrence_parent_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_seasonal ON tasks(seasonal_window)
      WHERE deleted_at IS NULL AND seasonal_window IS NOT NULL;

    -- materials indexes
    CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id, sort_order)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status)
      WHERE deleted_at IS NULL;

    -- daily_plans indexes
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(date)
      WHERE deleted_at IS NULL;

    -- time_blocks indexes
    CREATE INDEX IF NOT EXISTS idx_time_blocks_plan ON time_blocks(daily_plan_id, start_time)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_time_blocks_domain ON time_blocks(domain_id)
      WHERE deleted_at IS NULL AND domain_id IS NOT NULL;

    -- inbox_items indexes
    CREATE INDEX IF NOT EXISTS idx_inbox_unprocessed ON inbox_items(created_at)
      WHERE deleted_at IS NULL AND processed_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_inbox_type ON inbox_items(type)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_inbox_processed_task ON inbox_items(processed_to_task_id)
      WHERE deleted_at IS NULL AND processed_to_task_id IS NOT NULL;

    -- attachments indexes
    CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id, sort_order)
      WHERE deleted_at IS NULL AND task_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_attachments_project ON attachments(project_id, sort_order)
      WHERE deleted_at IS NULL AND project_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_attachments_inbox ON attachments(inbox_item_id, sort_order)
      WHERE deleted_at IS NULL AND inbox_item_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_attachments_material ON attachments(material_id, sort_order)
      WHERE deleted_at IS NULL AND material_id IS NOT NULL;

    -- task_events indexes
    CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id, occurred_at)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_task_events_plan ON task_events(daily_plan_id, occurred_at)
      WHERE deleted_at IS NULL AND daily_plan_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_task_events_type ON task_events(event_type, occurred_at)
      WHERE deleted_at IS NULL;

    -- tags indexes
    CREATE INDEX IF NOT EXISTS idx_tags_sort ON tags(sort_order)
      WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name ON tags(name)
      WHERE deleted_at IS NULL;

    -- task_tags indexes
    CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id)
      WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_task_tags_unique ON task_tags(task_id, tag_id)
      WHERE deleted_at IS NULL;

    -- seasonal_config indexes
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seasonal_config_key ON seasonal_config(key, year)
      WHERE deleted_at IS NULL;

    -- calendar_events indexes
    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date, start_time)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(source, external_id)
      WHERE deleted_at IS NULL AND external_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_calendar_events_domain ON calendar_events(domain_id)
      WHERE deleted_at IS NULL AND domain_id IS NOT NULL;

    -- weekly_theme_templates indexes
    CREATE INDEX IF NOT EXISTS idx_weekly_templates_active ON weekly_theme_templates(is_active)
      WHERE deleted_at IS NULL;

    -- weekly_theme_blocks indexes
    CREATE INDEX IF NOT EXISTS idx_weekly_blocks_template ON weekly_theme_blocks(template_id, day_of_week, start_time)
      WHERE deleted_at IS NULL;
  `);

  // =============================================
  // FTS5 VIRTUAL TABLES
  // =============================================
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
      title,
      notes,
      kanban_column,
      content='tasks',
      content_rowid='rowid'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
      name,
      description,
      last_context_note,
      content='projects',
      content_rowid='rowid'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS inbox_items_fts USING fts5(
      raw_text,
      ocr_text,
      quick_note,
      content='inbox_items',
      content_rowid='rowid'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5(
      name,
      source,
      notes,
      content='materials',
      content_rowid='rowid'
    );
  `);

  // =============================================
  // FTS5 SYNC TRIGGERS
  // =============================================
  // Tasks FTS triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
      INSERT INTO tasks_fts(rowid, title, notes, kanban_column)
      VALUES (new.rowid, new.title, new.notes, new.kanban_column);
    END;

    CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
      INSERT INTO tasks_fts(tasks_fts, rowid, title, notes, kanban_column)
      VALUES ('delete', old.rowid, old.title, old.notes, old.kanban_column);
    END;

    CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
      INSERT INTO tasks_fts(tasks_fts, rowid, title, notes, kanban_column)
      VALUES ('delete', old.rowid, old.title, old.notes, old.kanban_column);
      INSERT INTO tasks_fts(rowid, title, notes, kanban_column)
      VALUES (new.rowid, new.title, new.notes, new.kanban_column);
    END;
  `);

  // Projects FTS triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
      INSERT INTO projects_fts(rowid, name, description, last_context_note)
      VALUES (new.rowid, new.name, new.description, new.last_context_note);
    END;

    CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
      INSERT INTO projects_fts(projects_fts, rowid, name, description, last_context_note)
      VALUES ('delete', old.rowid, old.name, old.description, old.last_context_note);
    END;

    CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
      INSERT INTO projects_fts(projects_fts, rowid, name, description, last_context_note)
      VALUES ('delete', old.rowid, old.name, old.description, old.last_context_note);
      INSERT INTO projects_fts(rowid, name, description, last_context_note)
      VALUES (new.rowid, new.name, new.description, new.last_context_note);
    END;
  `);

  // Inbox items FTS triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS inbox_items_ai AFTER INSERT ON inbox_items BEGIN
      INSERT INTO inbox_items_fts(rowid, raw_text, ocr_text, quick_note)
      VALUES (new.rowid, new.raw_text, new.ocr_text, new.quick_note);
    END;

    CREATE TRIGGER IF NOT EXISTS inbox_items_ad AFTER DELETE ON inbox_items BEGIN
      INSERT INTO inbox_items_fts(inbox_items_fts, rowid, raw_text, ocr_text, quick_note)
      VALUES ('delete', old.rowid, old.raw_text, old.ocr_text, old.quick_note);
    END;

    CREATE TRIGGER IF NOT EXISTS inbox_items_au AFTER UPDATE ON inbox_items BEGIN
      INSERT INTO inbox_items_fts(inbox_items_fts, rowid, raw_text, ocr_text, quick_note)
      VALUES ('delete', old.rowid, old.raw_text, old.ocr_text, old.quick_note);
      INSERT INTO inbox_items_fts(rowid, raw_text, ocr_text, quick_note)
      VALUES (new.rowid, new.raw_text, new.ocr_text, new.quick_note);
    END;
  `);

  // Materials FTS triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS materials_ai AFTER INSERT ON materials BEGIN
      INSERT INTO materials_fts(rowid, name, source, notes)
      VALUES (new.rowid, new.name, new.source, new.notes);
    END;

    CREATE TRIGGER IF NOT EXISTS materials_ad AFTER DELETE ON materials BEGIN
      INSERT INTO materials_fts(materials_fts, rowid, name, source, notes)
      VALUES ('delete', old.rowid, old.name, old.source, old.notes);
    END;

    CREATE TRIGGER IF NOT EXISTS materials_au AFTER UPDATE ON materials BEGIN
      INSERT INTO materials_fts(materials_fts, rowid, name, source, notes)
      VALUES ('delete', old.rowid, old.name, old.source, old.notes);
      INSERT INTO materials_fts(rowid, name, source, notes)
      VALUES (new.rowid, new.name, new.source, new.notes);
    END;
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
