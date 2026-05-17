export type TaskEventType =
  | "created"
  | "status_changed"
  | "assigned_to_plan"
  | "removed_from_plan"
  | "rescheduled"
  | "completed"
  | "dropped"
  | "dependency_added"
  | "dependency_removed"
  | "note_updated"
  | "estimate_changed";

export interface TaskEvent {
  id: string;
  task_id: string;
  event_type: TaskEventType;
  old_value: string | null;
  new_value: string | null;
  occurred_at: string;
  daily_plan_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTaskEventInput {
  task_id: string;
  event_type: TaskEventType;
  old_value?: string | null;
  new_value?: string | null;
  occurred_at?: string;
  daily_plan_id?: string | null;
}
