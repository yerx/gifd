import type { Domain, Task } from '@groundwork/shared';

// ---------------------------------------------------------------------------
// Recovery mode types
// ---------------------------------------------------------------------------

export type RecoveryMode = 'none' | 'catch-up' | 'fresh-start';

export interface OverdueByDomain {
  domain: Domain | null;
  domainId: string | null;
  tasks: Task[];
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

export const STAGES = [
  { step: 1, label: 'Review Yesterday', desc: 'Handle unfinished tasks' },
  { step: 2, label: "Check What's Due", desc: 'Due tasks and calendar events' },
  { step: 3, label: 'Scan Stalled Projects', desc: 'Projects with no recent activity' },
  { step: 4, label: 'Build Your Day', desc: 'Create time blocks and assign tasks' },
  { step: 5, label: 'Process Inbox', desc: 'Triage captured items' },
] as const;
