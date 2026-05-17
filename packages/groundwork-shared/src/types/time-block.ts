export interface TimeBlock {
  id: string;
  daily_plan_id: string;
  domain_id: string | null;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  theme: string | null;
  task_ids: string; // JSON array of task ULIDs
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTimeBlockInput {
  daily_plan_id: string;
  domain_id?: string | null;
  start_time: string;
  end_time: string;
  theme?: string | null;
  task_ids?: string[];
  sort_order?: number;
}

export interface UpdateTimeBlockInput {
  daily_plan_id?: string;
  domain_id?: string | null;
  start_time?: string;
  end_time?: string;
  theme?: string | null;
  task_ids?: string[];
  sort_order?: number;
}
