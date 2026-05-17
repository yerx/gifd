import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateId, now } from '@groundwork/shared';

const router = Router();

// ---------------------------------------------------------------------------
// Features 111-114: RRULE Parsing Utility
// Supports FREQ=DAILY, FREQ=WEEKLY;BYDAY=..., FREQ=MONTHLY;BYMONTHDAY=...
// ---------------------------------------------------------------------------

function parseRRule(rrule: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const segment of rrule.split(';')) {
    const [key, val] = segment.split('=');
    if (key && val) {
      parts[key.toUpperCase()] = val.toUpperCase();
    }
  }
  return parts;
}

function calculateNextDueDate(rrule: string, currentDueDate: string | null): string | null {
  const parts = parseRRule(rrule);
  const freq = parts['FREQ'];
  if (!freq) return null;

  // Start from current due date, or today if none
  const base = currentDueDate ? new Date(currentDueDate + 'T00:00:00') : new Date();
  base.setHours(0, 0, 0, 0);

  if (freq === 'DAILY') {
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    base.setDate(base.getDate() + interval);
    return formatDateISO(base);
  }

  if (freq === 'WEEKLY') {
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    const byDay = parts['BYDAY'];

    if (byDay) {
      const dayMap: Record<string, number> = {
        SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
      };
      const targetDays = byDay.split(',').map((d) => dayMap[d.trim()]).filter((d) => d !== undefined);
      if (targetDays.length === 0) {
        // Fallback: just add 7 * interval days
        base.setDate(base.getDate() + 7 * interval);
        return formatDateISO(base);
      }

      // Sort target days
      targetDays.sort((a, b) => a - b);
      const currentDay = base.getDay();

      // Find the next occurrence after today
      // First check if there's a later day in the same week
      const laterInWeek = targetDays.find((d) => d > currentDay);
      if (laterInWeek !== undefined) {
        base.setDate(base.getDate() + (laterInWeek - currentDay));
        return formatDateISO(base);
      }

      // Otherwise go to the first target day of the next interval week
      const daysUntilNextWeekStart = 7 * interval - currentDay;
      base.setDate(base.getDate() + daysUntilNextWeekStart + targetDays[0]);
      return formatDateISO(base);
    } else {
      // No BYDAY, just advance by interval weeks
      base.setDate(base.getDate() + 7 * interval);
      return formatDateISO(base);
    }
  }

  if (freq === 'MONTHLY') {
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    const byMonthDay = parts['BYMONTHDAY'];

    if (byMonthDay) {
      const targetDay = parseInt(byMonthDay, 10);
      // Move to next month(s) based on interval
      let newMonth = base.getMonth() + interval;
      let newYear = base.getFullYear();
      while (newMonth > 11) {
        newMonth -= 12;
        newYear++;
      }
      // Clamp to valid day for the month
      const daysInMonth = new Date(newYear, newMonth + 1, 0).getDate();
      const clampedDay = Math.min(targetDay, daysInMonth);
      return formatDateISO(new Date(newYear, newMonth, clampedDay));
    } else {
      // No BYMONTHDAY, keep the same day of month
      const currentDay = base.getDate();
      let newMonth = base.getMonth() + interval;
      let newYear = base.getFullYear();
      while (newMonth > 11) {
        newMonth -= 12;
        newYear++;
      }
      const daysInMonth = new Date(newYear, newMonth + 1, 0).getDate();
      const clampedDay = Math.min(currentDay, daysInMonth);
      return formatDateISO(new Date(newYear, newMonth, clampedDay));
    }
  }

  return null;
}

function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /api/tasks
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { project_id, status } = req.query;

  let sql = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
  const params: unknown[] = [];

  if (project_id) {
    sql += ' AND project_id = ?';
    params.push(project_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY sort_order';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// POST /api/tasks
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const {
    project_id, title, status, kanban_column, estimated_minutes,
    due_date, seasonal_window, depends_on, sort_order, notes,
    recurrence_rule, recurrence_parent_id
  } = req.body;

  if (!project_id || !title) {
    res.status(400).json({ error: 'project_id and title are required' });
    return;
  }

  const id = generateId();
  const timestamp = now();
  const depsJson = depends_on ? JSON.stringify(depends_on) : '[]';

  const createTask = db.transaction(() => {
    db.prepare(`
      INSERT INTO tasks (id, project_id, title, status, kanban_column, estimated_minutes,
        due_date, seasonal_window, depends_on, sort_order, notes,
        recurrence_rule, recurrence_parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, project_id, title,
      status ?? 'backlog',
      kanban_column ?? null,
      estimated_minutes ?? null,
      due_date ?? null,
      seasonal_window ?? null,
      depsJson,
      sort_order ?? 0.0,
      notes ?? null,
      recurrence_rule ?? null,
      recurrence_parent_id ?? null,
      timestamp, timestamp
    );

    // Log task_event for creation
    const eventId = generateId();
    db.prepare(`
      INSERT INTO task_events (id, task_id, event_type, new_value, occurred_at, created_at, updated_at)
      VALUES (?, ?, 'created', ?, ?, ?, ?)
    `).run(eventId, id, JSON.stringify({ title, project_id }), timestamp, timestamp, timestamp);

    // Update project last_touched_at
    db.prepare('UPDATE projects SET last_touched_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, timestamp, project_id);
  });

  createTask();

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(row);
});

// GET /api/tasks/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(row);
});

// PATCH /api/tasks/:id
router.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id) as Record<string, unknown> | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const timestamp = now();
  const updates: string[] = [];
  const params: unknown[] = [];

  const directFields = ['project_id', 'title', 'kanban_column', 'estimated_minutes',
    'due_date', 'seasonal_window', 'sort_order', 'notes',
    'recurrence_rule', 'recurrence_parent_id'];

  for (const field of directFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  // Handle depends_on as JSON
  if (req.body.depends_on !== undefined) {
    updates.push('depends_on = ?');
    params.push(JSON.stringify(req.body.depends_on));
  }

  // Collect event info for transactional inserts
  let statusEventType: string | null = null;
  let oldStatusJson: string | null = null;
  let newStatusJson: string | null = null;
  let dueDateChanged = false;
  let oldDueDate: string | null = null;
  let newDueDate: string | null = null;
  let estimateChanged = false;
  let oldEstimate: string | null = null;
  let newEstimate: string | null = null;

  // Detect due_date change for 'rescheduled' event
  if (req.body.due_date !== undefined && req.body.due_date !== existing.due_date) {
    dueDateChanged = true;
    oldDueDate = JSON.stringify(existing.due_date);
    newDueDate = JSON.stringify(req.body.due_date);
  }

  // Detect estimated_minutes change for 'estimate_changed' event
  if (req.body.estimated_minutes !== undefined && req.body.estimated_minutes !== existing.estimated_minutes) {
    estimateChanged = true;
    oldEstimate = JSON.stringify(existing.estimated_minutes);
    newEstimate = JSON.stringify(req.body.estimated_minutes);
  }

  // Handle status change with event logging
  if (req.body.status !== undefined && req.body.status !== existing.status) {
    const oldStatus = existing.status;
    const newStatus = req.body.status;
    updates.push('status = ?');
    params.push(newStatus);

    oldStatusJson = JSON.stringify(oldStatus);
    newStatusJson = JSON.stringify(newStatus);

    // If marking as done, set completed_at
    if (newStatus === 'done') {
      updates.push('completed_at = ?');
      params.push(timestamp);
      statusEventType = 'completed';
    }

    // If transitioning away from done, clear completed_at
    if (oldStatus === 'done' && newStatus !== 'done') {
      updates.push('completed_at = ?');
      params.push(null);
    }

    if (newStatus === 'dropped') {
      statusEventType = 'dropped';
    } else if (newStatus !== 'done') {
      statusEventType = 'status_changed';
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(req.params.id);

  const projectId = (req.body.project_id ?? existing.project_id) as string;

  const updateTask = db.transaction(() => {
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log status change event if applicable
    if (statusEventType && oldStatusJson && newStatusJson) {
      const eventId = generateId();
      db.prepare(`
        INSERT INTO task_events (id, task_id, event_type, old_value, new_value, occurred_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(eventId, req.params.id, statusEventType, oldStatusJson, newStatusJson, timestamp, timestamp, timestamp);
    }

    // Log rescheduled event if due_date changed
    if (dueDateChanged) {
      const eventId = generateId();
      db.prepare(`
        INSERT INTO task_events (id, task_id, event_type, old_value, new_value, occurred_at, created_at, updated_at)
        VALUES (?, ?, 'rescheduled', ?, ?, ?, ?, ?)
      `).run(eventId, req.params.id, oldDueDate, newDueDate, timestamp, timestamp, timestamp);
    }

    // Log estimate_changed event if estimated_minutes changed
    if (estimateChanged) {
      const eventId = generateId();
      db.prepare(`
        INSERT INTO task_events (id, task_id, event_type, old_value, new_value, occurred_at, created_at, updated_at)
        VALUES (?, ?, 'estimate_changed', ?, ?, ?, ?, ?)
      `).run(eventId, req.params.id, oldEstimate, newEstimate, timestamp, timestamp, timestamp);
    }

    // Update project last_touched_at
    db.prepare('UPDATE projects SET last_touched_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, timestamp, projectId);
  });

  updateTask();

  // ---------------------------------------------------------------------------
  // Feature 112: Clone-on-Complete for Recurring Tasks
  // When status changes to 'done' and task has a recurrence_rule, create next instance
  // ---------------------------------------------------------------------------
  let clonedTask: Record<string, unknown> | null = null;
  const updatedExisting = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Record<string, unknown>;

  if (
    req.body.status === 'done' &&
    updatedExisting &&
    updatedExisting.recurrence_rule &&
    typeof updatedExisting.recurrence_rule === 'string'
  ) {
    const rrule = updatedExisting.recurrence_rule as string;
    const currentDue = (updatedExisting.due_date as string | null) || null;
    const nextDueDate = calculateNextDueDate(rrule, currentDue);

    if (nextDueDate) {
      const cloneId = generateId();
      const cloneTimestamp = now();
      const parentId = (updatedExisting.recurrence_parent_id as string) || updatedExisting.id as string;

      const cloneTask = db.transaction(() => {
        db.prepare(`
          INSERT INTO tasks (id, project_id, title, status, kanban_column, estimated_minutes,
            due_date, seasonal_window, depends_on, sort_order, notes,
            recurrence_rule, recurrence_parent_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          cloneId,
          updatedExisting.project_id,
          updatedExisting.title,
          'backlog',
          updatedExisting.kanban_column ?? null,
          updatedExisting.estimated_minutes ?? null,
          nextDueDate,
          updatedExisting.seasonal_window ?? null,
          updatedExisting.depends_on ?? '[]',
          updatedExisting.sort_order ?? 0.0,
          updatedExisting.notes ?? null,
          rrule,
          parentId,
          cloneTimestamp,
          cloneTimestamp
        );

        // Log event for the cloned task
        const eventId = generateId();
        db.prepare(`
          INSERT INTO task_events (id, task_id, event_type, new_value, occurred_at, created_at, updated_at)
          VALUES (?, ?, 'created', ?, ?, ?, ?)
        `).run(eventId, cloneId, JSON.stringify({ title: updatedExisting.title, recurrence_clone: true }), cloneTimestamp, cloneTimestamp, cloneTimestamp);
      });

      cloneTask();
      clonedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(cloneId) as Record<string, unknown>;
    }
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({
    ...(row as Record<string, unknown>),
    ...(clonedTask ? { _next_recurring_task: clonedTask } : {}),
  });
});

// DELETE /api/tasks/:id (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const timestamp = now();
  db.prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, req.params.id);

  res.status(200).json({ deleted: true });
});

export default router;
