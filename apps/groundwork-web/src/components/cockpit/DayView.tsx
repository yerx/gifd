import type {
  DailyPlan,
  TimeBlock,
  Task,
  Domain,
  Project,
} from '@groundwork/shared';
import { CapacityBar } from './CapacityBar';
import { TimeBlockTimeline } from './TimeBlockTimeline';
import { ContextSwitchingCard } from './ContextSwitchingCard';
import { BlockExecutionPanel } from './BlockExecutionPanel';
import { CloseOutView } from './CloseOutView';

export function DayView({
  plan,
  blocks,
  allTasks,
  allProjects,
  domainMap,
  taskMap,
  projectMap,
  assignedMinutes,
  computedAvailableMinutes,
  calendarMinutesUsed,
  quickStartUsed,
  showDeferredStages,
  executingBlockId,
  executingBlock,
  showContextCard,
  showInterruptionPrompt,
  interruptionNote,
  showCloseOut,
  uncompletedYesterday,
  overdue,
  dueToday,
  stalledProjects,
  inboxCount,
  today,
  onToggleDeferredStages,
  onDismissDeferredStages,
  onRescheduleToToday,
  onPushToLater,
  onBlockClick,
  onDismissContextCard,
  onTaskToggle,
  onInterruption,
  onEndBlockExecution,
  onPullFromBacklog,
  onStartNextBlock,
  onSetInterruptionNote,
  onLogInterruption,
  onCancelInterruption,
  onShowCloseOut,
  onCloseOutReschedule,
  onCloseOutBacklog,
  onCloseOutDone,
  onCompleteCloseOut,
}: {
  plan: DailyPlan | null;
  blocks: TimeBlock[];
  allTasks: Task[];
  allProjects: Project[];
  domainMap: Map<string, Domain>;
  taskMap: Map<string, Task>;
  projectMap: Map<string, Project>;
  assignedMinutes: number;
  computedAvailableMinutes: number;
  calendarMinutesUsed: number;
  quickStartUsed: boolean;
  showDeferredStages: boolean;
  executingBlockId: string | null;
  executingBlock: TimeBlock | undefined | null;
  showContextCard: boolean;
  showInterruptionPrompt: boolean;
  interruptionNote: string;
  showCloseOut: boolean;
  uncompletedYesterday: Task[];
  overdue: Task[];
  dueToday: Task[];
  stalledProjects: Project[];
  inboxCount: number;
  today: string;
  onToggleDeferredStages: () => void;
  onDismissDeferredStages: () => void;
  onRescheduleToToday: (taskId: string) => void;
  onPushToLater: (taskId: string) => void;
  onBlockClick: (block: TimeBlock) => void;
  onDismissContextCard: () => void;
  onTaskToggle: (taskId: string) => void;
  onInterruption: () => void;
  onEndBlockExecution: () => void;
  onPullFromBacklog: () => void;
  onStartNextBlock: () => void;
  onSetInterruptionNote: (note: string) => void;
  onLogInterruption: () => void;
  onCancelInterruption: () => void;
  onShowCloseOut: () => void;
  onCloseOutReschedule: (taskId: string) => void;
  onCloseOutBacklog: (taskId: string) => void;
  onCloseOutDone: (taskId: string) => void;
  onCompleteCloseOut: () => void;
}) {
  return (
    <>
      {/* Feature 65: Quick Start amber banner */}
      {quickStartUsed && (
        <div
          className="flex items-center gap-2 mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={onToggleDeferredStages}
        >
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Quick Start was used -- some ritual stages were skipped.</span>
          <span className="text-amber-600 text-xs ml-auto font-medium">
            {showDeferredStages ? 'Hide' : 'Review'} stages
          </span>
        </div>
      )}

      {/* Feature 65: Deferred stages condensed view */}
      {showDeferredStages && (
        <div className="card mb-4 border border-amber-200">
          <h3 className="text-base font-semibold text-gw-stone-800 mb-4">Deferred Ritual Stages</h3>
          <div className="space-y-4">
            {/* Stage 1 summary */}
            <div className="p-3 rounded-lg bg-gw-stone-50">
              <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider mb-2">Stage 1: Review Yesterday</p>
              {uncompletedYesterday.length > 0 ? (
                <div className="space-y-1">
                  {uncompletedYesterday.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="text-gw-stone-700 flex-1">{t.title}</span>
                      <button onClick={() => onRescheduleToToday(t.id)} className="text-xs px-1.5 py-0.5 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100">Today</button>
                      <button onClick={() => onPushToLater(t.id)} className="text-xs px-1.5 py-0.5 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200">Later</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gw-stone-400">Nothing from yesterday</p>
              )}
            </div>

            {/* Stage 2 summary */}
            <div className="p-3 rounded-lg bg-gw-stone-50">
              <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider mb-2">Stage 2: Due / Overdue</p>
              {overdue.length + dueToday.length > 0 ? (
                <div className="space-y-1">
                  {[...overdue, ...dueToday].slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${t.due_date && t.due_date < today ? 'bg-red-500' : 'bg-gw-accent'}`} />
                      <span className="text-gw-stone-700 flex-1">{t.title}</span>
                      <span className="text-gw-stone-400">{t.due_date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gw-stone-400">Nothing due</p>
              )}
            </div>

            {/* Stage 3 summary */}
            <div className="p-3 rounded-lg bg-gw-stone-50">
              <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider mb-2">Stage 3: Stalled Projects</p>
              {stalledProjects.length > 0 ? (
                <p className="text-xs text-amber-600">{stalledProjects.length} stalled project{stalledProjects.length === 1 ? '' : 's'}</p>
              ) : (
                <p className="text-xs text-gw-stone-400">All projects active</p>
              )}
            </div>

            {/* Stage 5 summary */}
            <div className="p-3 rounded-lg bg-gw-stone-50">
              <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider mb-2">Stage 5: Inbox</p>
              {inboxCount > 0 ? (
                <p className="text-xs text-amber-600">{inboxCount} unprocessed item{inboxCount === 1 ? '' : 's'}</p>
              ) : (
                <p className="text-xs text-gw-green-600">Inbox zero!</p>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gw-stone-100">
            <button
              onClick={onDismissDeferredStages}
              className="text-xs text-gw-stone-500 hover:text-gw-stone-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Ritual complete badge */}
      <div className="flex items-center gap-2 mb-6 text-sm text-gw-green-700 bg-gw-green-50 border border-gw-green-200 rounded-lg px-4 py-2.5">
        <svg className="w-5 h-5 text-gw-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Morning ritual completed</span>
        {plan?.morning_ritual_completed_at && (
          <span className="text-gw-green-500 text-xs ml-auto">
            at {new Date(plan.morning_ritual_completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Feature 63: Capacity bar with proper calculation */}
      {plan && (
        <CapacityBar
          assignedMinutes={assignedMinutes}
          availableMinutes={computedAvailableMinutes}
          bufferPercent={plan.buffer_percent}
          calendarMinutes={calendarMinutesUsed}
        />
      )}

      {/* Feature 68: Interruption prompt modal */}
      {showInterruptionPrompt && (
        <div className="card mb-4 border-2 border-amber-300">
          <h3 className="text-base font-semibold text-amber-800 mb-3">Log Interruption</h3>
          <div className="mb-3">
            <label className="block text-xs text-gw-stone-500 mb-1">What happened?</label>
            <input
              type="text"
              value={interruptionNote}
              onChange={(e) => onSetInterruptionNote(e.target.value)}
              placeholder="e.g. Phone call, urgent request..."
              className="w-full px-3 py-2 rounded-lg border border-gw-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onLogInterruption}
              className="text-xs px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 font-medium transition-colors"
            >
              Log & Continue
            </button>
            <button
              onClick={onCancelInterruption}
              className="text-xs px-3 py-1.5 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feature 66: Context Switching Card */}
      {showContextCard && executingBlock && (() => {
        const domain = executingBlock.domain_id ? domainMap.get(executingBlock.domain_id) : null;
        const domainProjects = domain
          ? allProjects.filter((p) => p.domain_id === domain.id && p.status === 'active')
          : [];
        const domainProject = domainProjects[0] || null;
        const domainTasks = domain
          ? allTasks.filter((t) => {
              const proj = projectMap.get(t.project_id);
              return proj && proj.domain_id === domain.id;
            })
          : [];
        return (
          <div>
            <ContextSwitchingCard
              block={executingBlock}
              domain={domain ?? null}
              tasks={domainTasks}
              project={domainProject}
            />
            <div className="flex justify-end mb-2">
              <button
                onClick={onDismissContextCard}
                className="text-xs text-gw-stone-500 hover:text-gw-stone-700"
              >
                Dismiss context card
              </button>
            </div>
          </div>
        );
      })()}

      {/* Feature 67: Block Execution Panel */}
      {executingBlock && (
        <BlockExecutionPanel
          block={executingBlock}
          domain={executingBlock.domain_id ? domainMap.get(executingBlock.domain_id) || null : null}
          allTasks={allTasks}
          taskMap={taskMap}
          onTaskToggle={onTaskToggle}
          onInterruption={onInterruption}
          onEndBlock={onEndBlockExecution}
          onPullFromBacklog={onPullFromBacklog}
          onStartNextBlock={onStartNextBlock}
        />
      )}

      {/* Feature 69: Close-out view */}
      {showCloseOut && (
        <CloseOutView
          tasks={allTasks}
          blocks={blocks}
          taskMap={taskMap}
          onReschedule={onCloseOutReschedule}
          onPushToBacklog={onCloseOutBacklog}
          onMarkDone={onCloseOutDone}
          onCompleteCloseOut={onCompleteCloseOut}
        />
      )}

      {/* Time blocks timeline */}
      <TimeBlockTimeline
        blocks={blocks}
        domainMap={domainMap}
        taskMap={taskMap}
        onBlockClick={onBlockClick}
        executingBlockId={executingBlockId}
      />

      {/* Feature 69: End Day button */}
      <div className="mt-6 flex justify-end">
        {plan?.close_out_completed_at ? (
          <div className="flex items-center gap-2 text-sm text-gw-green-700 bg-gw-green-50 border border-gw-green-200 rounded-lg px-4 py-2.5">
            <svg className="w-4 h-4 text-gw-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Day closed out at {new Date(plan.close_out_completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        ) : (
          <button
            onClick={onShowCloseOut}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            End Day
          </button>
        )}
      </div>
    </>
  );
}
