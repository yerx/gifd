export interface TaskTag {
  id: string;
  task_id: string;
  tag_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTaskTagInput {
  task_id: string;
  tag_id: string;
}
