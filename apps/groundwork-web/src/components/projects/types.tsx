export interface DomainData {
  id: string;
  name: string;
  color: string;
}

export interface ProjectData {
  id: string;
  domain_id: string;
  name: string;
  description: string | null;
  status: string;
  default_view: string;
  deadline: string | null;
  last_touched_at: string | null;
}

export interface TaskData {
  id: string;
  title: string;
  status: string;
  project_id: string;
  due_date: string | null;
  estimated_minutes: number | null;
  notes: string | null;
  sort_order: number;
  depends_on: string; // JSON array of task ULIDs
}

export interface MaterialData {
  id: string;
  project_id: string;
  name: string;
  quantity: number;
  unit_cost: number | null;
  source: string | null;
  status: string; // 'needed' | 'ordered' | 'acquired'
  blocks_tasks: string; // JSON array of task ULIDs
  photo_path: string | null;
  notes: string | null;
  sort_order: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: string; // maps to task status
  isCustom: boolean;
}

export const MATERIAL_STATUSES = ['needed', 'ordered', 'acquired'] as const;

export const MATERIAL_STATUS_STYLES: Record<string, string> = {
  needed: 'bg-red-100 text-red-700',
  ordered: 'bg-yellow-100 text-yellow-700',
  acquired: 'bg-gw-green-100 text-gw-green-700',
};

export const PROJECT_STATUSES = ['active', 'someday', 'completed', 'archived'] as const;
export const PROJECT_VIEWS = ['list', 'kanban', 'timeline', 'materials'] as const;

export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-gw-green-100 text-gw-green-700',
  someday: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gw-stone-100 text-gw-stone-500',
};

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'col-backlog', title: 'Backlog', status: 'backlog', isCustom: false },
  { id: 'col-active', title: 'In Progress', status: 'active', isCustom: false },
  { id: 'col-done', title: 'Done', status: 'done', isCustom: false },
];

// View icons for the view switcher
export const VIEW_ICONS: Record<string, JSX.Element> = {
  list: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  kanban: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  timeline: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  materials: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
};

// Dependency helpers
export function parseDependsOn(task: TaskData): string[] {
  if (!task.depends_on) return [];
  try {
    const parsed = JSON.parse(task.depends_on);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Circular dependency detection using DFS
export function wouldCreateCycle(fromTaskId: string, toTaskId: string, tasks: TaskData[]): string[] | null {
  const adjMap = new Map<string, string[]>();
  for (const t of tasks) {
    const deps = parseDependsOn(t);
    for (const dep of deps) {
      if (!adjMap.has(dep)) adjMap.set(dep, []);
      adjMap.get(dep)!.push(t.id);
    }
  }
  if (!adjMap.has(fromTaskId)) adjMap.set(fromTaskId, []);
  adjMap.get(fromTaskId)!.push(toTaskId);

  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): boolean {
    if (current === fromTaskId) {
      path.push(current);
      return true;
    }
    if (visited.has(current)) return false;
    visited.add(current);
    path.push(current);
    for (const next of adjMap.get(current) || []) {
      if (dfs(next)) return true;
    }
    path.pop();
    return false;
  }

  if (dfs(toTaskId)) {
    return path;
  }
  return null;
}
