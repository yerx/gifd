export type TaskStatus = "backlog" | "active" | "done" | "dropped";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  kanban_column: string | null;
  estimated_minutes: number | null;
  due_date: string | null;
  seasonal_window: string | null;
  depends_on: string; // JSON array of task ULIDs
  sort_order: number;
  notes: string | null;
  completed_at: string | null;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  status?: TaskStatus;
  kanban_column?: string | null;
  estimated_minutes?: number | null;
  due_date?: string | null;
  seasonal_window?: string | null;
  depends_on?: string[];
  sort_order?: number;
  notes?: string | null;
  recurrence_rule?: string | null;
  recurrence_parent_id?: string | null;
}

export interface UpdateTaskInput {
  project_id?: string;
  title?: string;
  status?: TaskStatus;
  kanban_column?: string | null;
  estimated_minutes?: number | null;
  due_date?: string | null;
  seasonal_window?: string | null;
  depends_on?: string[];
  sort_order?: number;
  notes?: string | null;
  recurrence_rule?: string | null;
  recurrence_parent_id?: string | null;
}
