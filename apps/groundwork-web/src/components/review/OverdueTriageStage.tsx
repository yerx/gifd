import type { Task, Domain } from '@groundwork/shared';
import type { OverdueDecision } from './types';
import { dateLabel, todayStr } from './helpers';
import StageNavButtons from './StageNavButtons';

interface OverdueTriageStageProps {
  overdueTasks: Task[];
  overdueDecisions: Map<string, OverdueDecision>;
  rescheduleDate: Map<string, string>;
  domainMap: Map<string, Domain>;
  projectMap: Map<string, import('@groundwork/shared').Project>;
  canProceedPastOverdue: boolean;
  untriagedCount: number;
  setOverdueAction: (taskId: string, action: OverdueDecision['action']) => void;
  setRescheduleDate: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  setOverdueDecisions: React.Dispatch<React.SetStateAction<Map<string, OverdueDecision>>>;
  applyOverdueDecisions: () => Promise<void>;
  goBack: () => void;
  goNext: () => void;
}

export default function OverdueTriageStage({
  overdueTasks,
  overdueDecisions,
  rescheduleDate,
  domainMap,
  projectMap,
  canProceedPastOverdue,
  untriagedCount,
  setOverdueAction,
  setRescheduleDate,
  setOverdueDecisions,
  applyOverdueDecisions,
  goBack,
  goNext,
}: OverdueTriageStageProps) {
  const getTaskDomain = (task: Task): Domain | undefined => {
    const project = projectMap.get(task.project_id);
    return project ? domainMap.get(project.domain_id) : undefined;
  };

  const groupOverdueByDomain = (): Map<string, Task[]> => {
    const groups = new Map<string, Task[]>();
    for (const task of overdueTasks) {
      const domain = getTaskDomain(task);
      const key = domain?.id || 'unassigned';
      const list = groups.get(key) || [];
      list.push(task);
      groups.set(key, list);
    }
    return groups;
  };

  function renderOverdueTask(task: Task) {
    const decision = overdueDecisions.get(task.id);
    const domain = getTaskDomain(task);
    const currentRescheduleDate = rescheduleDate.get(task.id) || '';

    return (
      <div
        key={task.id}
        className={`border rounded-lg p-3 transition-colors ${
          decision
            ? 'border-gw-green-200 bg-gw-green-50'
            : 'border-gw-stone-200 hover:border-gw-stone-300'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: domain?.color || '#ef4444' }}
          />
          <span className="flex-1 text-sm font-medium text-gw-stone-800">{task.title}</span>
          <span className="text-xs text-red-500">
            due {task.due_date ? dateLabel(task.due_date) : 'unknown'}
          </span>
          {decision && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gw-green-200 text-gw-green-800 font-medium">
              {decision.action === 'reschedule'
                ? `Rescheduled${decision.newDate ? ` to ${dateLabel(decision.newDate)}` : ''}`
                : decision.action === 'complete'
                  ? 'Completing'
                  : decision.action === 'backlog'
                    ? 'To Backlog'
                    : 'Dropping'}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 ml-5">
          {/* Reschedule */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOverdueAction(task.id, 'reschedule')}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                decision?.action === 'reschedule'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
              }`}
            >
              Reschedule
            </button>
            {(decision?.action === 'reschedule' || !decision) && (
              <input
                type="date"
                value={currentRescheduleDate}
                min={todayStr()}
                onChange={(e) => {
                  const val = e.target.value;
                  setRescheduleDate((prev) => {
                    const next = new Map(prev);
                    next.set(task.id, val);
                    return next;
                  });
                  // Auto-select reschedule when date is picked
                  setOverdueDecisions((prev) => {
                    const next = new Map(prev);
                    next.set(task.id, { action: 'reschedule', newDate: val });
                    return next;
                  });
                }}
                className="px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
              />
            )}
          </div>

          {/* Complete Now */}
          <button
            onClick={() => setOverdueAction(task.id, 'complete')}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              decision?.action === 'complete'
                ? 'bg-gw-green-100 border-gw-green-300 text-gw-green-700'
                : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
            }`}
          >
            Complete Now
          </button>

          {/* Push to Backlog */}
          <button
            onClick={() => setOverdueAction(task.id, 'backlog')}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              decision?.action === 'backlog'
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
            }`}
          >
            Push to Backlog
          </button>

          {/* Drop */}
          <button
            onClick={() => setOverdueAction(task.id, 'drop')}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              decision?.action === 'drop'
                ? 'bg-red-100 border-red-300 text-red-700'
                : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
            }`}
          >
            Drop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gw-stone-800">Overdue Triage</h2>
        {overdueTasks.length > 0 && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              canProceedPastOverdue
                ? 'bg-gw-green-100 text-gw-green-700'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {canProceedPastOverdue
              ? 'All triaged'
              : `${untriagedCount} remaining`}
          </span>
        )}
      </div>

      {overdueTasks.length === 0 ? (
        <p className="text-sm text-gw-stone-400 py-8 text-center">
          No overdue tasks -- you&apos;re all caught up!
        </p>
      ) : overdueTasks.length >= 5 ? (
        /* Feature 122: Grouped by domain when 5+ */
        <div className="space-y-6">
          {Array.from(groupOverdueByDomain().entries()).map(([domainId, tasks]) => {
            const domain = domainMap.get(domainId);
            return (
              <div key={domainId}>
                <div
                  className="flex items-center gap-2 mb-3 pb-2 border-b-2"
                  style={{ borderColor: domain?.color || '#a8a29e' }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: domain?.color || '#a8a29e' }}
                  />
                  <h3 className="text-sm font-semibold text-gw-stone-700">
                    {domain?.name || 'Unassigned'}
                  </h3>
                  <span className="text-xs text-gw-stone-400">
                    ({tasks.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {tasks.map((task) => renderOverdueTask(task))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat list when < 5 */
        <div className="space-y-2">
          {overdueTasks.map((task) => renderOverdueTask(task))}
        </div>
      )}

      <StageNavButtons
        showBack
        onBack={goBack}
        onNext={async () => {
          if (canProceedPastOverdue) {
            await applyOverdueDecisions();
            goNext();
          }
        }}
        nextDisabled={!canProceedPastOverdue}
        disabledReason={
          !canProceedPastOverdue
            ? `Triage all ${untriagedCount} overdue task${untriagedCount !== 1 ? 's' : ''} to proceed`
            : undefined
        }
      />
    </div>
  );
}
