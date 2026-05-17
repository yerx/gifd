export type ProjectStatus = "active" | "someday" | "completed" | "archived";
export type ProjectView = "list" | "kanban" | "timeline" | "materials";

export interface Project {
  id: string;
  domain_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  default_view: ProjectView;
  last_touched_at: string | null;
  last_context_note: string | null;
  deadline: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateProjectInput {
  domain_id: string;
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  default_view?: ProjectView;
  deadline?: string | null;
  sort_order?: number;
}

export interface UpdateProjectInput {
  domain_id?: string;
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  default_view?: ProjectView;
  last_touched_at?: string | null;
  last_context_note?: string | null;
  deadline?: string | null;
  sort_order?: number;
}
