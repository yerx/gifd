export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD
  available_minutes: number;
  buffer_percent: number;
  reflection_note: string | null;
  morning_ritual_completed_at: string | null;
  close_out_completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateDailyPlanInput {
  date: string;
  available_minutes?: number;
  buffer_percent?: number;
}

export interface UpdateDailyPlanInput {
  available_minutes?: number;
  buffer_percent?: number;
  reflection_note?: string | null;
  morning_ritual_completed_at?: string | null;
  close_out_completed_at?: string | null;
}
