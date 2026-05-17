'use client';

import { useState } from 'react';
import type { Domain, Project } from '@groundwork/shared';
import type { OverdueByDomain } from './types';

// ---------------------------------------------------------------------------
// Feature 137/138: Fresh Start Mode (7+ day absence)
// ---------------------------------------------------------------------------

export function FreshStartMode({
  daysMissed,
  overdueDomainGroups,
  stalledProjects,
  allProjects,
  inboxCount,
  domainMap,
  onBulkSweep,
  onRescheduleAllToToday,
  onDropTask,
  onMarkDone,
  onTouchProject,
  onArchiveProject,
  onSomedayProject,
  onDismiss,
}: {
  daysMissed: number;
  overdueDomainGroups: OverdueByDomain[];
  stalledProjects: Project[];
  allProjects: Project[];
  inboxCount: number;
  domainMap: Map<string, Domain>;
  onBulkSweep: () => void;
  onRescheduleAllToToday: (domainId: string | null) => void;
  onDropTask: (taskId: string) => void;
  onMarkDone: (taskId: string) => void;
  onTouchProject: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onSomedayProject: (projectId: string) => void;
  onDismiss: () => void;
}) {
  const [step, setStep] = useState<'welcome' | 'sweep' | 'health' | 'done'>('welcome');
  const [sweepDone, setSweepDone] = useState(false);

  const totalOverdue = overdueDomainGroups.reduce((sum, g) => sum + g.tasks.length, 0);
  const allOverdueTasks = overdueDomainGroups.flatMap((g) => g.tasks);

  const activeProjects = allProjects.filter((p) => p.status === 'active');

  return (
    <div className="card mb-6 border-2 border-purple-200">
      {step === 'welcome' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 mb-4">
            <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gw-stone-800 mb-2">Fresh Start</h2>
          <p className="text-sm text-gw-stone-500 mb-1">
            It&apos;s been {daysMissed} days since your last plan.
          </p>
          <p className="text-sm text-gw-stone-400 mb-6">
            No worries -- let&apos;s do a quick reset and get things moving again.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
            <div className="text-center p-3 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
              <p className="text-xs text-red-700">Overdue</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50">
              <p className="text-2xl font-bold text-amber-600">{stalledProjects.length}</p>
              <p className="text-xs text-amber-700">Stalled</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50">
              <p className="text-2xl font-bold text-purple-600">{activeProjects.length}</p>
              <p className="text-xs text-purple-700">Active Projects</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setStep('sweep')}
              className="btn-primary flex items-center gap-2"
            >
              Begin Fresh Start
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={onDismiss}
              className="btn-secondary text-sm"
            >
              Skip to today
            </button>
          </div>
        </div>
      )}

      {step === 'sweep' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gw-stone-800">Bulk Overdue Sweep</h2>
            <p className="text-xs text-gw-stone-400">
              Move non-deadline overdue tasks to project backlogs in one action. Tasks with deadlines stay visible.
            </p>
          </div>

          {/* Feature 138: One-action bulk sweep */}
          {!sweepDone ? (
            <div className="mb-4">
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-800 mb-1">
                      {totalOverdue} overdue task{totalOverdue === 1 ? '' : 's'} will be moved to project backlogs
                    </p>
                    <p className="text-xs text-purple-600">
                      Due dates will be cleared. You can rescue individual tasks below before sweeping.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { onBulkSweep(); setSweepDone(true); }}
                  className="mt-3 w-full text-sm px-4 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Sweep all {totalOverdue} tasks to backlogs
                </button>
              </div>

              {/* Show overdue tasks with rescue options */}
              {allOverdueTasks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-2">
                    Overdue Tasks ({allOverdueTasks.length})
                  </p>
                  <p className="text-xs text-gw-stone-400 mb-2">
                    Mark done or drop individual tasks before sweeping the rest.
                  </p>
                  <div className="space-y-1">
                    {allOverdueTasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-red-50/50">
                        <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gw-stone-700 truncate">{t.title}</span>
                        {t.due_date && (
                          <span className="text-xs text-red-500">due {t.due_date}</span>
                        )}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => onMarkDone(t.id)}
                            className="text-xs px-2 py-0.5 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 transition-colors"
                          >
                            Done
                          </button>
                          <button
                            onClick={() => onDropTask(t.id)}
                            className="text-xs px-2 py-0.5 rounded bg-gw-stone-100 text-gw-stone-500 hover:bg-gw-stone-200 transition-colors"
                          >
                            Drop
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-gw-green-50 border border-gw-green-200 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gw-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium text-gw-green-700">
                  Sweep complete! All overdue tasks moved to backlogs.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t border-gw-stone-100">
            <button
              onClick={() => setStep('welcome')}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => setStep('health')}
              className="btn-primary flex items-center gap-2"
            >
              Project Health Check
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {step === 'health' && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gw-stone-800">Project Health Check</h2>
            <p className="text-xs text-gw-stone-400">
              Review your active projects. Archive or pause anything you&apos;re no longer working on.
            </p>
          </div>

          {activeProjects.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gw-stone-500">No active projects found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProjects.map((p) => {
                const domain = domainMap.get(p.domain_id);
                const isStalled = stalledProjects.some((sp) => sp.id === p.id);
                const daysSince = p.last_touched_at
                  ? Math.floor((new Date().getTime() - new Date(p.last_touched_at).getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={p.id}
                    className={`rounded-lg border overflow-hidden ${
                      isStalled ? 'border-amber-200 bg-amber-50/30' : 'border-gw-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 py-2.5 px-3">
                      {domain && (
                        <div
                          className="w-2 h-8 rounded-full flex-shrink-0"
                          style={{ backgroundColor: domain.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gw-stone-800 truncate">{p.name}</p>
                          {isStalled && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                              Stalled
                            </span>
                          )}
                        </div>
                        {domain && (
                          <span className="text-xs text-gw-stone-400">{domain.name}</span>
                        )}
                      </div>
                      <span className="text-xs text-gw-stone-400 flex-shrink-0">
                        {daysSince !== null ? `${daysSince}d ago` : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 pb-2.5 ml-5">
                      <button
                        onClick={() => onTouchProject(p.id)}
                        className="text-xs px-2 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                      >
                        Keep active
                      </button>
                      <button
                        onClick={() => onSomedayProject(p.id)}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                      >
                        Someday
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

          <div className="flex justify-between mt-6 pt-4 border-t border-gw-stone-100">
            <button
              onClick={() => setStep('sweep')}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => setStep('done')}
              className="btn-primary flex items-center gap-2"
            >
              Finish
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 mb-4">
            <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gw-stone-800 mb-2">Fresh start complete</h2>
          <p className="text-sm text-gw-stone-500 mb-6">
            Your workspace is cleaned up. Let&apos;s build a simple plan for today.
          </p>
          <button
            onClick={onDismiss}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            Plan Today
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
