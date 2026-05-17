'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  tasks as tasksApi,
  projects as projectsApi,
  domains as domainsApi,
  inbox as inboxApi,
  timeBlocks as timeBlocksApi,
  dailyPlans as dailyPlansApi,
  weeklyThemeTemplates as templatesApi,
  weeklyThemeBlocks as themeBlocksApi,
  taskEvents as taskEventsApi,
} from '@/lib/api';
import type {
  Task,
  Project,
  Domain,
  DailyPlan,
} from '@groundwork/shared';

import {
  ProgressBar,
  DigestStage,
  OverdueTriageStage,
  StalledProjectsStage,
  HorizonCheckStage,
  SomedayScanStage,
  ThemeAdjustmentsStage,
  CompleteStage,
  STAGES,
  todayStr,
  getWeekRange,
  minutesBetween,
  daysAgo,
} from '@/components/review';

import type {
  ReviewStage,
  OverdueDecision,
  StalledDecision,
  SomedayDecision,
  ThemeOverride,
} from '@/components/review';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ReviewPage() {
  // --- State ---
  const [stage, setStage] = useState<ReviewStage>('digest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [domainList, setDomainList] = useState<Domain[]>([]);
  const [domainMap, setDomainMap] = useState<Map<string, Domain>>(new Map());
  const [projectMap, setProjectMap] = useState<Map<string, Project>>(new Map());
  const [inboxCount, setInboxCount] = useState(0);

  // Computed review data
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [completedByDomain, setCompletedByDomain] = useState<Map<string, number>>(new Map());
  const [stalledProjects, setStalledProjects] = useState<Project[]>([]);
  const [somedayProjects, setSomedayProjects] = useState<Project[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [domainTimeMinutes, setDomainTimeMinutes] = useState<Map<string, number>>(new Map());

  // Decisions
  const [overdueDecisions, setOverdueDecisions] = useState<Map<string, OverdueDecision>>(new Map());
  const [stalledDecisions, setStalledDecisions] = useState<Map<string, StalledDecision>>(new Map());
  const [somedayDecisions, setSomedayDecisions] = useState<Map<string, SomedayDecision>>(new Map());

  // Theme overrides
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverride[]>([]);

  // Completion
  const [completionTimestamp, setCompletionTimestamp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Overdue triage date picker state
  const [rescheduleDate, setRescheduleDate] = useState<Map<string, string>>(new Map());

  // Stalled project note input state
  const [stalledNotes, setStalledNotes] = useState<Map<string, string>>(new Map());
  const [stalledFollowups, setStalledFollowups] = useState<Map<string, string>>(new Map());

  // --- Load data ---
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        tasksData,
        projectsData,
        domainsData,
        inboxCountData,
        timeBlocksData,
        templatesData,
        blocksData,
      ] = await Promise.all([
        tasksApi.list(),
        projectsApi.list(),
        domainsApi.list(),
        inboxApi.count(),
        timeBlocksApi.list(),
        templatesApi.list(),
        themeBlocksApi.list(),
      ]);

      setDomainList(domainsData);
      setInboxCount(inboxCountData.count);

      // Build maps
      const dMap = new Map(domainsData.map((d) => [d.id, d]));
      setDomainMap(dMap);
      const pMap = new Map(projectsData.map((p) => [p.id, p]));
      setProjectMap(pMap);

      // Compute: overdue tasks
      const today = todayStr();
      const overdue = tasksData.filter(
        (t) => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'dropped'
      );
      setOverdueTasks(overdue);

      // Compute: completed tasks per domain (past 7 days)
      const { start } = getWeekRange();
      const completedTasks = tasksData.filter(
        (t) => t.status === 'done' && t.completed_at && t.completed_at >= start
      );
      const byDomain = new Map<string, number>();
      for (const t of completedTasks) {
        const project = pMap.get(t.project_id);
        const domainId = project?.domain_id || 'unknown';
        byDomain.set(domainId, (byDomain.get(domainId) || 0) + 1);
      }
      setCompletedByDomain(byDomain);

      // Compute: stalled projects (active, last_touched_at > 7 days ago)
      const stalled = projectsData.filter(
        (p) => p.status === 'active' && daysAgo(p.last_touched_at) > 7
      );
      setStalledProjects(stalled);

      // Compute: someday projects
      const someday = projectsData.filter((p) => p.status === 'someday');
      setSomedayProjects(someday);

      // Compute: upcoming deadlines (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
      const upcoming = tasksData.filter(
        (t) =>
          t.due_date &&
          t.due_date >= today &&
          t.due_date <= nextWeekStr &&
          t.status !== 'done' &&
          t.status !== 'dropped'
      );
      setUpcomingDeadlines(upcoming);

      // Compute: domain time distribution from time blocks (past 7 days)
      const domainTime = new Map<string, number>();
      for (const block of timeBlocksData) {
        const domainId = block.domain_id || 'unassigned';
        const mins = minutesBetween(block.start_time, block.end_time);
        if (mins > 0) {
          domainTime.set(domainId, (domainTime.get(domainId) || 0) + mins);
        }
      }
      setDomainTimeMinutes(domainTime);

      // Initialize theme overrides from active template blocks
      const activeTemplate = templatesData.find((t) => t.is_active === 1);
      if (activeTemplate) {
        const activeBlocks = blocksData.filter((b) => b.template_id === activeTemplate.id);
        setThemeOverrides(
          activeBlocks.map((b) => ({
            blockId: b.id,
            domain_id: b.domain_id,
            theme: b.theme,
            start_time: b.start_time,
            end_time: b.end_time,
            day_of_week: b.day_of_week,
            dirty: false,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Navigation ---
  const stageIdx = STAGES.findIndex((s) => s.key === stage);

  const goNext = () => {
    if (stageIdx < STAGES.length - 1) {
      setStage(STAGES[stageIdx + 1].key);
    }
  };

  const goBack = () => {
    if (stageIdx > 0) {
      setStage(STAGES[stageIdx - 1].key);
    }
  };

  // --- Overdue triage ---
  const untriagedCount = overdueTasks.filter((t) => !overdueDecisions.has(t.id)).length;
  const canProceedPastOverdue = untriagedCount === 0;

  const setOverdueAction = (taskId: string, action: OverdueDecision['action']) => {
    setOverdueDecisions((prev) => {
      const next = new Map(prev);
      const existing = next.get(taskId);
      next.set(taskId, {
        action,
        newDate: action === 'reschedule' ? existing?.newDate || rescheduleDate.get(taskId) : undefined,
      });
      return next;
    });
  };

  const applyOverdueDecisions = async () => {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      for (const [taskId, decision] of overdueDecisions) {
        switch (decision.action) {
          case 'reschedule':
            if (decision.newDate) {
              promises.push(tasksApi.update(taskId, { due_date: decision.newDate }));
              promises.push(
                taskEventsApi.create({
                  task_id: taskId,
                  event_type: 'rescheduled',
                  new_value: decision.newDate,
                })
              );
            }
            break;
          case 'complete':
            promises.push(tasksApi.update(taskId, { status: 'done' }));
            promises.push(
              taskEventsApi.create({
                task_id: taskId,
                event_type: 'completed',
              })
            );
            break;
          case 'backlog':
            promises.push(tasksApi.update(taskId, { status: 'backlog', due_date: null }));
            promises.push(
              taskEventsApi.create({
                task_id: taskId,
                event_type: 'status_changed',
                old_value: 'active',
                new_value: 'backlog',
              })
            );
            break;
          case 'drop':
            promises.push(tasksApi.update(taskId, { status: 'dropped' }));
            promises.push(
              taskEventsApi.create({
                task_id: taskId,
                event_type: 'dropped',
              })
            );
            break;
        }
      }
      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply overdue decisions');
    } finally {
      setSaving(false);
    }
  };

  // --- Stalled project actions ---
  const applyStalledDecisions = async () => {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      for (const [projectId, decision] of stalledDecisions) {
        switch (decision.action) {
          case 'acknowledge':
            promises.push(
              projectsApi.update(projectId, { last_touched_at: new Date().toISOString() })
            );
            break;
          case 'pause':
            promises.push(projectsApi.update(projectId, { status: 'someday' }));
            break;
          case 'archive':
            promises.push(projectsApi.update(projectId, { status: 'archived' }));
            break;
          case 'note':
            if (decision.note) {
              promises.push(
                projectsApi.update(projectId, {
                  last_context_note: decision.note,
                  last_touched_at: new Date().toISOString(),
                })
              );
            }
            break;
          case 'followup':
            if (decision.followupTitle) {
              promises.push(
                tasksApi.create({
                  project_id: projectId,
                  title: decision.followupTitle,
                  status: 'active',
                })
              );
              promises.push(
                projectsApi.update(projectId, { last_touched_at: new Date().toISOString() })
              );
            }
            break;
        }
      }
      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply stalled decisions');
    } finally {
      setSaving(false);
    }
  };

  // --- Someday actions ---
  const applySomedayDecisions = async () => {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      for (const [projectId, decision] of somedayDecisions) {
        switch (decision.action) {
          case 'promote':
            promises.push(projectsApi.update(projectId, { status: 'active' }));
            break;
          case 'archive':
            promises.push(projectsApi.update(projectId, { status: 'archived' }));
            break;
          // 'keep' does nothing
        }
      }
      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply someday decisions');
    } finally {
      setSaving(false);
    }
  };

  // --- Theme adjustments ---
  const applyThemeOverrides = async () => {
    setSaving(true);
    try {
      const dirtyOverrides = themeOverrides.filter((o) => o.dirty);
      const promises: Promise<unknown>[] = [];
      for (const override of dirtyOverrides) {
        promises.push(
          themeBlocksApi.update(override.blockId, {
            domain_id: override.domain_id,
            theme: override.theme,
            start_time: override.start_time,
            end_time: override.end_time,
            day_of_week: override.day_of_week,
          })
        );
      }
      await Promise.all(promises);
      setThemeOverrides((prev) => prev.map((o) => ({ ...o, dirty: false })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save theme adjustments');
    } finally {
      setSaving(false);
    }
  };

  // --- Complete review ---
  const completeReview = async () => {
    setSaving(true);
    try {
      // Apply any pending decisions
      await applyOverdueDecisions();
      await applyStalledDecisions();
      await applySomedayDecisions();
      await applyThemeOverrides();

      // Record completion timestamp via daily plan update
      const today = todayStr();
      let todayPlan: DailyPlan | null = null;
      try {
        const plans = await dailyPlansApi.list({ date: today });
        todayPlan = plans.length > 0 ? plans[0] : null;
      } catch {
        // Plan may not exist yet
      }

      const now = new Date().toISOString();
      if (todayPlan) {
        await dailyPlansApi.update(todayPlan.id, {
          reflection_note: `Weekly review completed at ${now}`,
        });
      } else {
        await dailyPlansApi.create({ date: today });
      }

      setCompletionTimestamp(now);
      setStage('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete review');
    } finally {
      setSaving(false);
    }
  };

  // --- Helpers for grouping ---
  const getTaskDomain = (task: Task): Domain | undefined => {
    const project = projectMap.get(task.project_id);
    return project ? domainMap.get(project.domain_id) : undefined;
  };

  // --- Theme override update ---
  const updateThemeOverride = (
    blockId: string,
    updates: Partial<Pick<ThemeOverride, 'domain_id' | 'theme' | 'start_time' | 'end_time'>>
  ) => {
    setThemeOverrides((prev) =>
      prev.map((o) =>
        o.blockId === blockId ? { ...o, ...updates, dirty: true } : o
      )
    );
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="p-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-gw-stone-900 mb-4">Weekly Review</h1>
        <div className="card flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gw-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gw-stone-500">Loading review data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-gw-stone-900 mb-4">Weekly Review</h1>
        <div className="card border-red-200 bg-red-50 py-8 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={loadData} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Completed task total
  const totalCompleted = Array.from(completedByDomain.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gw-stone-900">Weekly Review</h1>
        <p className="text-sm text-gw-stone-500 mt-1">
          Reflect on the past week and prepare for the next
        </p>
      </div>

      {/* Progress Bar */}
      <ProgressBar current={stage} stages={STAGES} />

      {/* STAGE: DIGEST */}
      {stage === 'digest' && (
        <DigestStage
          totalCompleted={totalCompleted}
          overdueCount={overdueTasks.length}
          stalledCount={stalledProjects.length}
          inboxCount={inboxCount}
          completedByDomain={completedByDomain}
          domainList={domainList}
          upcomingDeadlines={upcomingDeadlines}
          getTaskDomain={getTaskDomain}
          goBack={goBack}
          goNext={goNext}
        />
      )}

      {/* STAGE: OVERDUE TRIAGE */}
      {stage === 'overdue' && (
        <OverdueTriageStage
          overdueTasks={overdueTasks}
          overdueDecisions={overdueDecisions}
          rescheduleDate={rescheduleDate}
          domainMap={domainMap}
          projectMap={projectMap}
          canProceedPastOverdue={canProceedPastOverdue}
          untriagedCount={untriagedCount}
          setOverdueAction={setOverdueAction}
          setRescheduleDate={setRescheduleDate}
          setOverdueDecisions={setOverdueDecisions}
          applyOverdueDecisions={applyOverdueDecisions}
          goBack={goBack}
          goNext={goNext}
        />
      )}

      {/* STAGE: STALLED PROJECTS */}
      {stage === 'stalled' && (
        <StalledProjectsStage
          stalledProjects={stalledProjects}
          stalledDecisions={stalledDecisions}
          setStalledDecisions={setStalledDecisions}
          stalledNotes={stalledNotes}
          setStalledNotes={setStalledNotes}
          stalledFollowups={stalledFollowups}
          setStalledFollowups={setStalledFollowups}
          domainMap={domainMap}
          applyStalledDecisions={applyStalledDecisions}
          goBack={goBack}
          goNext={goNext}
        />
      )}

      {/* STAGE: HORIZON CHECK */}
      {stage === 'horizon' && (
        <HorizonCheckStage
          domainTimeMinutes={domainTimeMinutes}
          domainMap={domainMap}
          goBack={goBack}
          goNext={goNext}
        />
      )}

      {/* STAGE: SOMEDAY/MAYBE SCAN */}
      {stage === 'someday' && (
        <SomedayScanStage
          somedayProjects={somedayProjects}
          somedayDecisions={somedayDecisions}
          setSomedayDecisions={setSomedayDecisions}
          domainMap={domainMap}
          applySomedayDecisions={applySomedayDecisions}
          goBack={goBack}
          goNext={goNext}
        />
      )}

      {/* STAGE: THEME ADJUSTMENTS */}
      {stage === 'themes' && (
        <ThemeAdjustmentsStage
          themeOverrides={themeOverrides}
          domainMap={domainMap}
          domainList={domainList}
          saving={saving}
          updateThemeOverride={updateThemeOverride}
          completeReview={completeReview}
          goBack={goBack}
        />
      )}

      {/* STAGE: COMPLETE */}
      {stage === 'complete' && (
        <CompleteStage
          completionTimestamp={completionTimestamp}
          overdueDecisionsSize={overdueDecisions.size}
          stalledDecisionsSize={stalledDecisions.size}
          somedayDecisionsSize={somedayDecisions.size}
          themeOverrides={themeOverrides}
          onStartNewReview={() => {
            setStage('digest');
            setOverdueDecisions(new Map());
            setStalledDecisions(new Map());
            setSomedayDecisions(new Map());
            setStalledNotes(new Map());
            setStalledFollowups(new Map());
            setCompletionTimestamp(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
