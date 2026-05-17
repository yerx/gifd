export type CalendarEventSource = "manual" | "caldav" | "ical_import";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_minutes: number;
  is_recurring: number; // 0 or 1
  recurrence_rule: string | null;
  source: CalendarEventSource;
  external_id: string | null;
  domain_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateCalendarEventInput {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_recurring?: number;
  recurrence_rule?: string | null;
  source?: CalendarEventSource;
  external_id?: string | null;
  domain_id?: string | null;
}

export interface UpdateCalendarEventInput {
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  is_recurring?: number;
  recurrence_rule?: string | null;
  source?: CalendarEventSource;
  external_id?: string | null;
  domain_id?: string | null;
}
