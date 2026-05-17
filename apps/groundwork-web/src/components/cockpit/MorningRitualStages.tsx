import Link from 'next/link';
import type {
  DailyPlan,
  TimeBlock,
  Task,
  Domain,
  Project,
  InboxItem,
  WeeklyThemeBlock,
  WeeklyThemeTemplate,
} from '@groundwork/shared';
import { ProgressBar } from './ProgressBar';
import { StageNavButtons } from './StageNavButtons';
import { TaskRow } from './TaskRow';
import { AddTimeBlockForm } from './AddTimeBlockForm';
import { minutesBetween, formatTime } from './helpers';
import { STAGES } from './types';

export function MorningRitualStages({
  stage,
  plan,
  blocks,
  allDomains,
  domainMap,
  projectMap,
  completedYesterday,
  uncompletedYesterday,
  dueToday,
  overdue,
  stalledProjects,
  inboxCount,
  inboxItems,
  unassignedTasks,
  assignTaskToBlock,
  assignedMinutes,
  computedAvailableMinutes,
  calendarMinutesUsed,
  acknowledgedTasks,
  rescheduleTaskId,
  rescheduleDate,
  activeTemplate,
  todayTemplateBlocks,
  today,
  onBack,
  onNext,
  onQuickStart,
  onCompleteRitual,
  onRescheduleToToday,
  onPushToLater,
  onReturnToBacklog,
  onAcknowledge,
  onRescheduleTask,
  onSetRescheduleTaskId,
  onSetRescheduleDate,
  onCompleteNow,
  onTouchProject,
  onSomedayProject,
  onArchiveProject,
  onLoadTemplateBlocks,
  onReloadBlocks,
  onSetAssignTaskToBlock,
  onAssignTaskToBlock,
  onInboxCreateTask,
  onInboxReference,
  onInboxDelete,
}: {
  stage: number;
  plan: DailyPlan | null;
  blocks: TimeBlock[];
  allDomains: Domain[];
  domainMap: Map<string, Domain>;
  projectMap: Map<string, Project>;
  completedYesterday: Task[];
  uncompletedYesterday: Task[];
  dueToday: Task[];
  overdue: Task[];
  stalledProjects: Project[];
  inboxCount: number;
  inboxItems: InboxItem[];
  unassignedTasks: Task[];
  assignTaskToBlock: string | null;
  assignedMinutes: number;
  computedAvailableMinutes: number;
  calendarMinutesUsed: number;
  acknowledgedTasks: Set<string>;
  rescheduleTaskId: string | null;
  rescheduleDate: string;
  activeTemplate: WeeklyThemeTemplate | null;
  todayTemplateBlocks: WeeklyThemeBlock[];
  today: string;
  onBack: () => void;
  onNext: () => void;
  onQuickStart: () => void;
  onCompleteRitual: () => void;
  onRescheduleToToday: (taskId: string) => void;
  onPushToLater: (taskId: string) => void;
  onReturnToBacklog: (taskId: string) => void;
  onAcknowledge: (taskId: string) => void;
  onRescheduleTask: (taskId: string, newDate: string) => void;
  onSetRescheduleTaskId: (taskId: string | null) => void;
  onSetRescheduleDate: (date: string) => void;
  onCompleteNow: (taskId: string) => void;
  onTouchProject: (projectId: string) => void;
  onSomedayProject: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onLoadTemplateBlocks: () => void;
  onReloadBlocks: () => void;
  onSetAssignTaskToBlock: (taskId: string | null) => void;
  onAssignTaskToBlock: (taskId: string, blockId: string) => void;
  onInboxCreateTask: (item: InboxItem) => void;
  onInboxReference: (item: InboxItem) => void;
  onInboxDelete: (item: InboxItem) => void;
}) {
  return (
    <>
      {/* Stage label */}
      <div className="text-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gw-green-600">
          Morning Ritual
        </span>
        <h2 className="text-lg font-semibold text-gw-stone-800 mt-1">
          Stage {stage}: {STAGES[stage - 1].label}
        </h2>
        <p className="text-sm text-gw-stone-400">{STAGES[stage - 1].desc}</p>
      </div>

      {/* Feature 64: Quick Start button */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={onQuickStart}
          className="text-xs px-4 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors border border-amber-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Start
        </button>
      </div>

      {/* Progress bar */}
      <ProgressBar current={stage} total={5} />

      {/* Stage content */}
      <div className="card mb-6">
        {/* ---- Stage 1: Review Yesterday ---- */}
        {stage === 1 && (
          <div>
            <h3 className="text-base font-semibold text-gw-stone-800 mb-4">Yesterday&apos;s Tasks</h3>

            {completedYesterday.length === 0 && uncompletedYesterday.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gw-stone-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gw-stone-500">No tasks from yesterday</p>
              </div>
            ) : (
              <>
                {completedYesterday.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-gw-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gw-green-700">
                        Completed ({completedYesterday.length})
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {completedYesterday.map((t) => (
                        <TaskRow key={t.id} task={t} variant="completed" />
                      ))}
                    </div>
                  </div>
                )}

                {uncompletedYesterday.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm font-medium text-red-600">
                        Uncompleted ({uncompletedYesterday.length})
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {uncompletedYesterday.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          variant="uncompleted"
                          actions={
                            <>
                              <button
                                onClick={() => onRescheduleToToday(t.id)}
                                className="text-xs px-2 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                              >
                                Reschedule to today
                              </button>
                              <button
                                onClick={() => onPushToLater(t.id)}
                                className="text-xs px-2 py-1 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
                              >
                                Push to later
                              </button>
                              <button
                                onClick={() => onReturnToBacklog(t.id)}
                                className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium transition-colors"
                              >
                                Return to backlog
                              </button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <StageNavButtons stage={1} onBack={onBack} onNext={onNext} />
          </div>
        )}

        {/* ---- Stage 2: Check What's Due ---- */}
        {stage === 2 && (
          <div>
            <h3 className="text-base font-semibold text-gw-stone-800 mb-4">What&apos;s Due</h3>

            {dueToday.length === 0 && overdue.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gw-stone-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gw-stone-500">Nothing due today and no overdue tasks</p>
              </div>
            ) : (
              <>
                {overdue.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-red-600">
                        Overdue ({overdue.length})
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {overdue.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          variant="overdue"
                          actions={
                            <>
                              {acknowledgedTasks.has(t.id) ? (
                                <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 font-medium">
                                  Acknowledged
                                </span>
                              ) : (
                                <button
                                  onClick={() => onAcknowledge(t.id)}
                                  className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                                >
                                  Acknowledge
                                </button>
                              )}
                              {rescheduleTaskId === t.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => onSetRescheduleDate(e.target.value)}
                                    className="text-xs px-1.5 py-0.5 rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => rescheduleDate && onRescheduleTask(t.id, rescheduleDate)}
                                    disabled={!rescheduleDate}
                                    className="text-xs px-2 py-1 rounded bg-gw-green-600 text-white font-medium disabled:opacity-50"
                                  >
                                    Set
                                  </button>
                                  <button
                                    onClick={() => { onSetRescheduleTaskId(null); onSetRescheduleDate(''); }}
                                    className="text-xs px-1.5 py-1 rounded text-gw-stone-400 hover:text-gw-stone-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => onSetRescheduleTaskId(t.id)}
                                  className="text-xs px-2 py-1 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
                                >
                                  Reschedule
                                </button>
                              )}
                              <button
                                onClick={() => onCompleteNow(t.id)}
                                className="text-xs px-2 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                              >
                                Complete now
                              </button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {dueToday.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-gw-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gw-stone-700">
                        Due Today ({dueToday.length})
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dueToday.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          variant="due"
                          actions={
                            <>
                              {acknowledgedTasks.has(t.id) ? (
                                <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 font-medium">
                                  Acknowledged
                                </span>
                              ) : (
                                <button
                                  onClick={() => onAcknowledge(t.id)}
                                  className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                                >
                                  Acknowledge
                                </button>
                              )}
                              {rescheduleTaskId === t.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => onSetRescheduleDate(e.target.value)}
                                    className="text-xs px-1.5 py-0.5 rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => rescheduleDate && onRescheduleTask(t.id, rescheduleDate)}
                                    disabled={!rescheduleDate}
                                    className="text-xs px-2 py-1 rounded bg-gw-green-600 text-white font-medium disabled:opacity-50"
                                  >
                                    Set
                                  </button>
                                  <button
                                    onClick={() => { onSetRescheduleTaskId(null); onSetRescheduleDate(''); }}
                                    className="text-xs px-1.5 py-1 rounded text-gw-stone-400 hover:text-gw-stone-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => onSetRescheduleTaskId(t.id)}
                                  className="text-xs px-2 py-1 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
                                >
                                  Reschedule
                                </button>
                              )}
                              <button
                                onClick={() => onCompleteNow(t.id)}
                                className="text-xs px-2 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                              >
                                Complete now
                              </button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <StageNavButtons stage={2} onBack={onBack} onNext={onNext} />
          </div>
        )}

        {/* ---- Stage 3: Scan Stalled Projects (Feature 60 Enhanced) ---- */}
        {stage === 3 && (
          <div>
            <h3 className="text-base font-semibold text-gw-stone-800 mb-4">Stalled Projects</h3>
            <p className="text-xs text-gw-stone-400 mb-4">Active projects with no activity in the last 7 days</p>

            {stalledProjects.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gw-green-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gw-stone-500">All projects have recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stalledProjects.map((p) => {
                  const domain = domainMap.get(p.domain_id);
                  const daysSince = p.last_touched_at
                    ? Math.floor((new Date().getTime() - new Date(p.last_touched_at).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div key={p.id} className="rounded-lg border border-gw-stone-100 overflow-hidden">
                      <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-gw-stone-50 transition-colors">
                        {domain && (
                          <div
                            className="w-2 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: domain.color }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gw-stone-800 truncate">{p.name}</p>
                          {domain && (
                            <span className="text-xs text-gw-stone-400">{domain.name}</span>
                          )}
                        </div>
                        <span className="text-xs text-gw-stone-400 flex-shrink-0">
                          {daysSince !== null ? `${daysSince}d ago` : 'Never touched'}
                        </span>
                      </div>
                      {/* Feature 60: Interactive actions for stalled projects */}
                      <div className="flex items-center gap-2 px-3 pb-2.5 ml-5">
                        <button
                          onClick={() => onTouchProject(p.id)}
                          className="text-xs px-2 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                        >
                          Mark as touched
                        </button>
                        <button
                          onClick={() => onSomedayProject(p.id)}
                          className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                        >
                          Move to Someday
                        </button>
                        <button
                          onClick={() => onArchiveProject(p.id)}
                          className="text-xs px-2 py-1 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <StageNavButtons stage={3} onBack={onBack} onNext={onNext} />
          </div>
        )}

        {/* ---- Stage 4: Build Your Day (Feature 61 + 94 Enhanced) ---- */}
        {stage === 4 && (
          <div>
            <h3 className="text-base font-semibold text-gw-stone-800 mb-4">Build Your Day</h3>

            {/* Feature 61: Weekly theme template blocks preview */}
            {activeTemplate && todayTemplateBlocks.length > 0 && blocks.length === 0 && (
              <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Template: {activeTemplate.name}</p>
                    <p className="text-xs text-blue-600">{todayTemplateBlocks.length} blocks for today</p>
                  </div>
                  <button
                    onClick={onLoadTemplateBlocks}
                    className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
                  >
                    Load Template
                  </button>
                </div>
                {/* Visual preview of template blocks */}
                <div className="space-y-1.5">
                  {todayTemplateBlocks.map((tb) => {
                    const domain = tb.domain_id ? domainMap.get(tb.domain_id) : null;
                    const dur = minutesBetween(tb.start_time, tb.end_time);
                    return (
                      <div key={tb.id} className="flex items-center gap-3 py-1.5 px-2 rounded bg-white/70 text-sm">
                        {domain && (
                          <div className="w-2 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: domain.color }} />
                        )}
                        <span className="text-blue-700 text-xs">{formatTime(tb.start_time)} - {formatTime(tb.end_time)}</span>
                        {domain && <span className="text-xs text-blue-600">{domain.name}</span>}
                        {tb.theme && <span className="text-xs font-medium text-blue-800">{tb.theme}</span>}
                        <span className="text-xs text-blue-500 ml-auto">{dur}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left column: blocks and form */}
              <div>
                {/* Current blocks summary */}
                {blocks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gw-stone-500 mb-2 uppercase tracking-wider">
                      Current Blocks ({blocks.length})
                    </p>
                    <div className="space-y-1.5 mb-4">
                      {[...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((b) => {
                        const domain = b.domain_id ? domainMap.get(b.domain_id) : null;
                        const dur = minutesBetween(b.start_time, b.end_time);
                        return (
                          <div key={b.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg bg-gw-stone-50 text-sm ${
                            assignTaskToBlock === null ? '' : 'cursor-pointer hover:bg-gw-green-50 hover:ring-1 hover:ring-gw-green-300'
                          }`}
                            onClick={() => {
                              if (assignTaskToBlock) {
                                onAssignTaskToBlock(assignTaskToBlock, b.id);
                              }
                            }}
                          >
                            {domain && (
                              <div className="w-2 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: domain.color }} />
                            )}
                            <span className="text-gw-stone-600">{formatTime(b.start_time)} - {formatTime(b.end_time)}</span>
                            {b.theme && <span className="text-gw-stone-800 font-medium">{b.theme}</span>}
                            <span className="text-xs text-gw-stone-400 ml-auto">{dur}m</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mini capacity bar */}
                    {plan && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gw-stone-400 mb-1">
                          <span>{assignedMinutes}m assigned</span>
                          <span>{Math.round(Math.max(0, (computedAvailableMinutes - calendarMinutesUsed) * (1 - plan.buffer_percent / 100)))}m usable</span>
                        </div>
                        <div className="w-full bg-gw-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              assignedMinutes > (computedAvailableMinutes - calendarMinutesUsed) * (1 - plan.buffer_percent / 100)
                                ? 'bg-gw-capacity-red'
                                : assignedMinutes > (computedAvailableMinutes - calendarMinutesUsed) * (1 - plan.buffer_percent / 100) * 0.8
                                  ? 'bg-gw-capacity-amber'
                                  : 'bg-gw-capacity-green'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                computedAvailableMinutes > 0
                                  ? (assignedMinutes / (Math.max(1, (computedAvailableMinutes - calendarMinutesUsed) * (1 - plan.buffer_percent / 100)))) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add new block */}
                {plan && (
                  <AddTimeBlockForm
                    planId={plan.id}
                    domains={allDomains}
                    onCreated={onReloadBlocks}
                  />
                )}
              </div>

              {/* Feature 94: Right column - Available Tasks Panel */}
              <div>
                <div className="bg-gw-stone-50 rounded-lg p-4 border border-gw-stone-100">
                  <p className="text-sm font-medium text-gw-stone-700 mb-3">Available Tasks</p>

                  {assignTaskToBlock && (
                    <div className="mb-3 p-2 rounded bg-gw-green-50 border border-gw-green-200">
                      <p className="text-xs text-gw-green-700">Click a block on the left to assign this task.</p>
                      <button
                        onClick={() => onSetAssignTaskToBlock(null)}
                        className="text-xs text-gw-stone-500 hover:text-gw-stone-700 mt-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {unassignedTasks.length === 0 ? (
                    <p className="text-xs text-gw-stone-400 text-center py-4">No unassigned tasks available</p>
                  ) : (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {/* Due today */}
                      {unassignedTasks.filter((t) => t.due_date === today).length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gw-accent mb-1">Due Today</p>
                          {unassignedTasks.filter((t) => t.due_date === today).map((t) => {
                            const project = projectMap.get(t.project_id);
                            const domain = project ? domainMap.get(project.domain_id) : null;
                            return (
                              <div
                                key={t.id}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors ${
                                  assignTaskToBlock === t.id
                                    ? 'bg-gw-green-100 ring-1 ring-gw-green-300'
                                    : 'hover:bg-white cursor-pointer'
                                }`}
                                onClick={() => onSetAssignTaskToBlock(assignTaskToBlock === t.id ? null : t.id)}
                              >
                                {domain && (
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: domain.color }} />
                                )}
                                <span className="flex-1 text-gw-stone-700 truncate">{t.title}</span>
                                {t.estimated_minutes && <span className="text-gw-stone-400">{t.estimated_minutes}m</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Overdue */}
                      {unassignedTasks.filter((t) => t.due_date && t.due_date < today).length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-red-500 mb-1">Overdue</p>
                          {unassignedTasks.filter((t) => t.due_date && t.due_date < today).map((t) => {
                            const project = projectMap.get(t.project_id);
                            const domain = project ? domainMap.get(project.domain_id) : null;
                            return (
                              <div
                                key={t.id}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors ${
                                  assignTaskToBlock === t.id
                                    ? 'bg-gw-green-100 ring-1 ring-gw-green-300'
                                    : 'hover:bg-white cursor-pointer'
                                }`}
                                onClick={() => onSetAssignTaskToBlock(assignTaskToBlock === t.id ? null : t.id)}
                              >
                                {domain && (
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: domain.color }} />
                                )}
                                <span className="flex-1 text-gw-stone-700 truncate">{t.title}</span>
                                {t.estimated_minutes && <span className="text-gw-stone-400">{t.estimated_minutes}m</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Active (no specific due date or future) */}
                      {unassignedTasks.filter((t) => t.status === 'active' && (!t.due_date || t.due_date > today)).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gw-stone-500 mb-1">Active</p>
                          {unassignedTasks.filter((t) => t.status === 'active' && (!t.due_date || t.due_date > today)).map((t) => {
                            const project = projectMap.get(t.project_id);
                            const domain = project ? domainMap.get(project.domain_id) : null;
                            return (
                              <div
                                key={t.id}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors ${
                                  assignTaskToBlock === t.id
                                    ? 'bg-gw-green-100 ring-1 ring-gw-green-300'
                                    : 'hover:bg-white cursor-pointer'
                                }`}
                                onClick={() => onSetAssignTaskToBlock(assignTaskToBlock === t.id ? null : t.id)}
                              >
                                {domain && (
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: domain.color }} />
                                )}
                                <span className="flex-1 text-gw-stone-700 truncate">{t.title}</span>
                                {t.estimated_minutes && <span className="text-gw-stone-400">{t.estimated_minutes}m</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <StageNavButtons stage={4} onBack={onBack} onNext={onNext} />
          </div>
        )}

        {/* ---- Stage 5: Process Inbox (Feature 62 Enhanced) ---- */}
        {stage === 5 && (
          <div>
            <h3 className="text-base font-semibold text-gw-stone-800 mb-4">Process Inbox</h3>

            <div className="text-center py-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                inboxCount > 0 ? 'bg-gw-capacity-amber/10' : 'bg-gw-green-50'
              }`}>
                <span className={`text-2xl font-bold ${
                  inboxCount > 0 ? 'text-gw-capacity-amber' : 'text-gw-green-600'
                }`}>
                  {inboxCount}
                </span>
              </div>
              <p className="text-sm text-gw-stone-600 mb-1">
                {inboxCount > 0
                  ? `You have ${inboxCount} unprocessed item${inboxCount === 1 ? '' : 's'}`
                  : 'Inbox zero!'}
              </p>
            </div>

            {/* Feature 62: Inline inbox processing */}
            {inboxItems.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider mb-2">Inbox Items</p>
                {inboxItems.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border border-gw-stone-200 bg-white">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        item.type === 'text' ? 'bg-blue-50 text-blue-500' :
                        item.type === 'voice' ? 'bg-purple-50 text-purple-500' :
                        'bg-green-50 text-green-500'
                      }`}>
                        {item.type === 'text' ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                        ) : item.type === 'voice' ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gw-stone-800 break-words">
                          {item.raw_text || item.quick_note || item.ocr_text || 'No content'}
                        </p>
                        <p className="text-xs text-gw-stone-400 mt-1">
                          {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 ml-9">
                      <button
                        onClick={() => onInboxCreateTask(item)}
                        className="text-xs px-2 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                      >
                        Create Task
                      </button>
                      <button
                        onClick={() => onInboxReference(item)}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                      >
                        Reference
                      </button>
                      <button
                        onClick={() => onInboxDelete(item)}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inboxCount > 0 && inboxItems.length === 0 && (
              <div className="text-center mt-2">
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gw-accent hover:underline"
                >
                  Go to Inbox
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Complete ritual button instead of regular nav */}
            <div className="flex justify-between mt-6 pt-4 border-t border-gw-stone-100">
              <button onClick={onBack} className="btn-secondary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={onCompleteRitual}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Complete Ritual
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
