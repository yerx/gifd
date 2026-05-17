export interface WeeklyThemeTemplate {
  id: string;
  name: string;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateWeeklyThemeTemplateInput {
  name: string;
  is_active?: number;
}

export interface UpdateWeeklyThemeTemplateInput {
  name?: string;
  is_active?: number;
}
