export interface DomainData {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
}

export interface WorkDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export interface TemplateData {
  id: string;
  name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BlockData {
  id: string;
  template_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  domain_id: string | null;
  theme: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TagData {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

export interface YearOverride {
  id: string;
  year: number;
  key: string;
  value: string;
}

export const DEFAULT_WORK_HOURS: WorkDay[] = [
  { day: 'Monday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Tuesday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Wednesday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Thursday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Friday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Saturday', enabled: false, start: '08:00', end: '13:00' },
  { day: 'Sunday', enabled: false, start: '08:00', end: '12:00' },
];

export const ICON_OPTIONS = ['💼', '🏠', '💻', '🎨', '📚', '🏋️', '🌱', '🎵', '✈️', '🔧', '📊', '🎯'];

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const PLANTING_ZONES = ['1a','1b','2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b','11a','11b','12a','12b','13a','13b'];

export const SEASONAL_KEY_LABELS: Record<string, string> = {
  planting_zone: 'Planting Zone',
  last_frost_date: 'Last Frost Date',
  first_frost_date: 'First Frost Date',
};
