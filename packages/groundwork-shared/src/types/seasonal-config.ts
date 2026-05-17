export interface SeasonalConfig {
  id: string;
  key: string;
  value: string;
  year: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateSeasonalConfigInput {
  key: string;
  value: string;
  year?: number | null;
  notes?: string | null;
}

export interface UpdateSeasonalConfigInput {
  key?: string;
  value?: string;
  year?: number | null;
  notes?: string | null;
}
