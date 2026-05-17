import type { TimeBlock, Task } from '@groundwork/shared';
import { todayStr } from './helpers';

// ---------------------------------------------------------------------------
// Feature 69: End-of-Day Close-out
// ---------------------------------------------------------------------------

export function CloseOutView({
  tasks: allTasks,
  blocks,
  taskMap,
  onReschedule,
  onPushToBacklog,
  onMarkDone,
  onCompleteCloseOut,
}: {
  tasks: Task[];
  blocks: TimeBlock[];
  taskMap: Map<string, Task>;
  onReschedule: (taskId: string) => void;
  onPushToBacklog: (taskId: string) => void;
  onMarkDone: (taskId: string) => void;
  onCompleteCloseOut: () => void;
}) {
  // Gather all task IDs from today's blocks
  const todayTaskIds = new Set<string>();
  blocks.forEach((b) => {
    try {
      const ids = JSON.parse(b.task_ids || '[]') as string[];
      ids.forEach((id) => todayTaskIds.add(id));
    } catch { /* empty */ }
  });

  const todayTasks = Array.from(todayTaskIds)
    .map((id) => taskMap.get(id))
    .filter(Boolean) as Task[];

  // Also include tasks due today
  const today = todayStr();
  const dueTodayTasks = allTasks.filter(
    (t) => t.due_date === today && !todayTaskIds.has(t.id) && t.status !== 'dropped'
  );
  const allRelevant = [...todayTasks, ...dueTodayTasks];

  const completed = allRelevant.filter((t) => t.status === 'done');
  const inProgress = allRelevant.filter((t) => t.status === 'active');
  const notStarted = allRelevant.filter((t) => t.status === 'backlog');
  const incomplete = [...inProgress, ...notStarted];

  return (
    <div className="card mb-4">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">End-of-Day Close-out</h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 rounded-lg bg-gw-green-50">
          <p className="text-2xl font-bold text-gw-green-600">{completed.length}</p>
          <p className="text-xs text-gw-green-700">Completed</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-blue-50">
          <p className="text-2xl font-bold text-blue-600">{inProgress.length}</p>
          <p className="text-xs text-blue-700">In Progress</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-gw-stone-50">
          <p className="text-2xl font-bold text-gw-stone-600">{notStarted.length}</p>
          <p className="text-xs text-gw-stone-500">Not Started</p>
        </div>
      </div>

      {/* Completed tasks */}
      {completed.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gw-green-600 uppercase tracking-wider mb-2">Completed</p>
          <div className="space-y-1">
            {completed.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm text-gw-stone-500 line-through opacity-60 py-1">
                <svg className="w-4 h-4 text-gw-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incomplete tasks - force decision */}
      {incomplete.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-2">
            Needs Decision ({incomplete.length})
          </p>
          <div className="space-y-2">
            {incomplete.map((t) => (
              <div key={t.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <p className="text-sm font-medium text-gw-stone-800 mb-2">{t.title}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onReschedule(t.id)}
                    className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
                  >
                    Reschedule to tomorrow
                  </button>
                  <button
                    onClick={() => onPushToBacklog(t.id)}
                    className="text-xs px-2.5 py-1 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
                  >
                    Push to backlog
                  </button>
                  <button
                    onClick={() => onMarkDone(t.id)}
                    className="text-xs px-2.5 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                  >
                    Mark as done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gw-stone-100">
        <button
          onClick={onCompleteCloseOut}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Complete Close-out
        </button>
      </div>
    </div>
  );
}
