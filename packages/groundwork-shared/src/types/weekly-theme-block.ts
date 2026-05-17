export interface WeeklyThemeBlock {
  id: string;
  template_id: string;
  day_of_week: number; // 1 (Monday) through 7 (Sunday)
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  domain_id: string | null;
  theme: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateWeeklyThemeBlockInput {
  template_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  domain_id?: string | null;
  theme?: string | null;
  sort_order?: number;
}

export interface UpdateWeeklyThemeBlockInput {
  template_id?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  domain_id?: string | null;
  theme?: string | null;
  sort_order?: number;
}
