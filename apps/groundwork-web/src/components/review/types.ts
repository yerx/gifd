import type { Domain } from '@groundwork/shared';

export type ReviewStage =
  | 'digest'
  | 'overdue'
  | 'stalled'
  | 'horizon'
  | 'someday'
  | 'themes'
  | 'complete';

export const STAGES: { key: ReviewStage; label: string; desc: string }[] = [
  { key: 'digest', label: 'Review Digest', desc: 'Week-at-a-glance stats' },
  { key: 'overdue', label: 'Overdue Triage', desc: 'Address every overdue task' },
  { key: 'stalled', label: 'Stalled Projects', desc: 'Decide on inactive projects' },
  { key: 'horizon', label: 'Horizon Check', desc: 'Domain balance analysis' },
  { key: 'someday', label: 'Someday/Maybe', desc: 'Scan deferred projects' },
  { key: 'themes', label: 'Theme Adjustments', desc: 'Tune next week themes' },
  { key: 'complete', label: 'Complete', desc: 'Review finished' },
];

export interface OverdueDecision {
  action: 'reschedule' | 'complete' | 'backlog' | 'drop';
  newDate?: string;
}

export interface StalledDecision {
  action: 'acknowledge' | 'pause' | 'archive' | 'note' | 'followup';
  note?: string;
  followupTitle?: string;
}

export interface SomedayDecision {
  action: 'keep' | 'promote' | 'archive';
}

export interface ThemeOverride {
  blockId: string;
  domain_id: string | null;
  theme: string | null;
  start_time: string;
  end_time: string;
  day_of_week: number;
  dirty: boolean;
}
