'use client';

import { useState } from 'react';
import type { Domain, Task } from '@groundwork/shared';
import type { OverdueByDomain } from './types';

// ---------------------------------------------------------------------------
// Feature 135/136: Catch-Up Mode (1-6 day absence)
// ---------------------------------------------------------------------------

export function CatchUpMode({
  daysMissed,
  overdueDomainGroups,
  inboxCount,
  stalledProjects,
  domainMap,
  onRescheduleAllToToday,
  onRescheduleTask,
  onDropTask,
  onMarkDone,
  onSweepToBacklog,
  onDismiss,
}: {
  daysMissed: number;
  overdueDomainGroups: OverdueByDomain[];
  inboxCount: number;
  stalledProjects: { id: string; name: string }[];
  domainMap: Map<string, Domain>;
  onRescheduleAllToToday: (domainId: string | null) => void;
  onRescheduleTask: (taskId: string) => void;
  onDropTask: (taskId: string) => void;
  onMarkDone: (taskId: string) => void;
  onSweepToBacklog: (domainId: string | null) => void;
  onDismiss: () => void;
}) {
  const [step, setStep] = useState<'welcome' | 'triage' | 'done'>('welcome');
  const totalOverdue = overdueDomainGroups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <div className="card mb-6 border-2 border-blue-200">
      {step === 'welcome' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gw-stone-800 mb-2">Welcome back</h2>
          <p className="text-sm text-gw-stone-500 mb-1">
            It&apos;s been {daysMissed} day{daysMissed === 1 ? '' : 's'} since your last daily plan.
          </p>
          <p className="text-sm text-gw-stone-400 mb-6">
            Let&apos;s get you caught up quickly -- this should take less than 10 minutes.
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
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{inboxCount}</p>
              <p className="text-xs text-blue-700">Inbox</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setStep('triage')}
              className="btn-primary flex items-center gap-2"
            >
              Start Catch-Up
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

      {step === 'triage' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gw-stone-800">Overdue Triage</h2>
              <p className="text-xs text-gw-stone-400">
                {totalOverdue} overdue task{totalOverdue === 1 ? '' : 's'} across {overdueDomainGroups.length} domain{overdueDomainGroups.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {overdueDomainGroups.length === 0 ? (
            <div className="text-center py-6">
              <svg className="w-12 h-12 mx-auto text-gw-green-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gw-stone-500">No overdue tasks -- you&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {overdueDomainGroups.map((group) => {
                const domain = group.domain;
                const borderColor = domain?.color || '#a8a29e';
                return (
                  <div
                    key={group.domainId || 'none'}
                    className="rounded-lg border border-gw-stone-200 overflow-hidden"
                    style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
                  >
                    {/* Domain header with bulk actions */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gw-stone-50">
                      <div className="flex items-center gap-2">
                        {domain && (
                          <span
                            className="inline-block px-2 py-0.5 text-xs font-medium rounded"
                            style={{ backgroundColor: `${domain.color}20`, color: domain.color }}
                          >
                            {domain.name}
                          </span>
                        )}
                        {!domain && (
                          <span className="text-xs font-medium text-gw-stone-500">No Domain</span>
                        )}
                        <span className="text-xs text-gw-stone-400">
                          {group.tasks.length} task{group.tasks.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRescheduleAllToToday(group.domainId)}
                          className="text-xs px-2.5 py-1 rounded bg-gw-green-50 text-gw-green-700 hover:bg-gw-green-100 font-medium transition-colors"
                        >
                          Reschedule all to today
                        </button>
                        <button
                          onClick={() => onSweepToBacklog(group.domainId)}
                          className="text-xs px-2.5 py-1 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
                        >
                          All to backlog
                        </button>
                      </div>
                    </div>

                    {/* Individual tasks */}
                    <div className="divide-y divide-gw-stone-100">
                      {group.tasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                          <span className="flex-1 text-sm text-gw-stone-700 truncate">{t.title}</span>
                          {t.due_date && (
                            <span className="text-xs text-red-500 flex-shrink-0">
                              due {t.due_date}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => onRescheduleTask(t.id)}
                              className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              Today
                            </button>
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
                );
              })}
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
              onClick={() => setStep('done')}
              className="btn-primary flex items-center gap-2"
            >
              Continue
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gw-green-50 mb-4">
            <svg className="w-8 h-8 text-gw-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gw-stone-800 mb-2">Catch-up complete</h2>
          <p className="text-sm text-gw-stone-500 mb-6">
            You&apos;re back on track. Let&apos;s plan today.
          </p>
          <button
            onClick={onDismiss}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            Start Today&apos;s Plan
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
