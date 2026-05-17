'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  dailyPlans,
  timeBlocks as timeBlocksApi,
  tasks as tasksApi,
  domains as domainsApi,
  projects as projectsApi,
  inbox as inboxApi,
  weeklyThemeTemplates,
  weeklyThemeBlocks,
  calendarEvents as calendarEventsApi,
  seasonalConfig as seasonalConfigApi,
  taskEvents as taskEventsApi,
} from '@/lib/api';
import type {
  DailyPlan,
  TimeBlock,
  Task,
  Domain,
  Project,
  InboxItem,
  WeeklyThemeTemplate,
  WeeklyThemeBlock,
  CalendarEvent,
  SeasonalConfig,
} from '@groundwork/shared';

import {
  CatchUpMode,
  FreshStartMode,
  MorningRitualStages,
  DayView,
  todayStr,
  yesterdayStr,
  tomorrowStr,
  dateLabel,
  minutesBetween,
  getTodayDayOfWeek,
  nowTimeStr,
  timeToMinutesFromMidnight,
  daysBetweenDates,
} from '@/components/cockpit';
import type { RecoveryMode, OverdueByDomain } from '@/components/cockpit';

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CockpitPage() {
  // Core state
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [stage, setStage] = useState(1);
  const [ritualDone, setRitualDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data state
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allDomains, setAllDomains] = useState<Domain[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [inboxCount, setInboxCount] = useState(0);

  // Feature 61/64: Weekly theme template data
  const [activeTemplate, setActiveTemplate] = useState<WeeklyThemeTemplate | null>(null);
  const [templateBlocks, setTemplateBlocks] = useState<WeeklyThemeBlock[]>([]);

  // Feature 62: Inbox items for inline processing
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);

  // Feature 63: Calendar events and work hours for capacity calculation
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [workHoursConfig, setWorkHoursConfig] = useState<SeasonalConfig | null>(null);

  // Feature 64/65: Quick Start
  const [quickStartUsed, setQuickStartUsed] = useState(false);
  const [showDeferredStages, setShowDeferredStages] = useState(false);

  // Feature 66/67: Block execution
  const [executingBlockId, setExecutingBlockId] = useState<string | null>(null);
  const [showContextCard, setShowContextCard] = useState(false);

  // Feature 68: Interruption
  const [showInterruptionPrompt, setShowInterruptionPrompt] = useState(false);
  const [interruptionNote, setInterruptionNote] = useState('');

  // Feature 69: Close-out
  const [showCloseOut, setShowCloseOut] = useState(false);

  // Feature 94: Available tasks panel in stage 4
  const [assignTaskToBlock, setAssignTaskToBlock] = useState<string | null>(null);

  // Feature 135-139: Recovery mode state
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>('none');
  const [daysMissed, setDaysMissed] = useState(0);

  // Index 44: local acknowledged state and reschedule date picker
  const [acknowledgedTasks, setAcknowledgedTasks] = useState<Set<string>>(new Set());
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const today = todayStr();
  const yesterday = yesterdayStr();
  const tomorrow = tomorrowStr();

  // ------ Data fetching ------

  const loadPlan = useCallback(async (): Promise<DailyPlan> => {
    const plans = await dailyPlans.list({ date: today });
    if (plans.length > 0) {
      return plans[0];
    }
    return await dailyPlans.create({ date: today, available_minutes: 480, buffer_percent: 20 });
  }, [today]);

  const loadBlocks = useCallback(async (planId: string) => {
    const data = await timeBlocksApi.list({ daily_plan_id: planId });
    setBlocks(data);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [p, taskData, domainData, projectData, inboxCountData] = await Promise.all([
        loadPlan(),
        tasksApi.list(),
        domainsApi.list(),
        projectsApi.list(),
        inboxApi.count().catch(() => ({ count: 0 })),
      ]);

      setPlan(p);
      setAllTasks(taskData);
      setAllDomains(domainData);
      setAllProjects(projectData);
      setInboxCount(inboxCountData.count);

      // Feature 135-137: Detect absence
      const allPlans = await dailyPlans.list().catch(() => [] as DailyPlan[]);
      const plansBeforeToday = allPlans.filter((pl) => pl.date < today);
      if (plansBeforeToday.length > 0 && !p.morning_ritual_completed_at) {
        plansBeforeToday.sort((a, b) => b.date.localeCompare(a.date));
        const lastPlanDate = plansBeforeToday[0].date;
        const gap = daysBetweenDates(lastPlanDate, today);
        const missed = gap - 1;
        if (missed >= 7) {
          setRecoveryMode('fresh-start');
          setDaysMissed(missed);
        } else if (missed >= 1) {
          setRecoveryMode('catch-up');
          setDaysMissed(missed);
        }
      }

      // Load additional data in parallel
      const [templatesData, inboxItemsData, calendarData, seasonalData] = await Promise.all([
        weeklyThemeTemplates.list().catch(() => [] as WeeklyThemeTemplate[]),
        inboxApi.list().catch(() => [] as InboxItem[]),
        calendarEventsApi.list({ date: today }).catch(() => [] as CalendarEvent[]),
        seasonalConfigApi.list().catch(() => [] as SeasonalConfig[]),
      ]);

      const active = templatesData.find((t) => t.is_active === 1) || null;
      setActiveTemplate(active);
      if (active) {
        const tBlocks = await weeklyThemeBlocks.list({ template_id: active.id }).catch(() => [] as WeeklyThemeBlock[]);
        setTemplateBlocks(tBlocks);
      }

      const unprocessed = inboxItemsData.filter((item) => !item.processed_at);
      setInboxItems(unprocessed);

      setCalendarEvents(calendarData);
      const whConfig = seasonalData.find((c) => c.key === 'work_hours') || null;
      setWorkHoursConfig(whConfig);

      if (p.morning_ritual_completed_at) {
        setRitualDone(true);
        setRecoveryMode('none');
        const ritualTime = new Date(p.morning_ritual_completed_at).getTime();
        const planTime = new Date(p.created_at).getTime();
        if (ritualTime - planTime < 60000) {
          setQuickStartUsed(true);
        }
      }

      await loadBlocks(p.id);
    } catch {
      // API may not be running
    } finally {
      setLoading(false);
    }
  }, [loadPlan, loadBlocks, today]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ------ Derived data ------

  const completedYesterday = allTasks.filter((t) => {
    if (!t.completed_at) return false;
    return t.completed_at.startsWith(yesterday);
  });
  const uncompletedYesterday = allTasks.filter((t) => {
    return t.due_date === yesterday && t.status !== 'done' && t.status !== 'dropped';
  });

  const dueToday = allTasks.filter((t) => {
    return t.due_date === today && t.status !== 'done' && t.status !== 'dropped';
  });
  const overdue = allTasks.filter((t) => {
    return t.due_date != null && t.due_date < today && t.status !== 'done' && t.status !== 'dropped';
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

  const stalledProjects = allProjects.filter((p) => {
    if (p.status !== 'active') return false;
    if (!p.last_touched_at) return true;
    return p.last_touched_at < sevenDaysAgoStr;
  });

  const domainMap = new Map(allDomains.map((d) => [d.id, d]));
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  const assignedMinutes = blocks.reduce((sum, b) => sum + minutesBetween(b.start_time, b.end_time), 0);

  const calendarMinutesUsed = calendarEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const computedAvailableMinutes = (() => {
    if (workHoursConfig) {
      try {
        const parsed = JSON.parse(workHoursConfig.value);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayDayName = dayNames[new Date().getDay()];
        const mins = parsed[todayDayName] ?? parsed['default'] ?? 480;
        return mins;
      } catch {
        return plan?.available_minutes || 480;
      }
    }
    return plan?.available_minutes || 480;
  })();

  const todayDow = getTodayDayOfWeek();
  const todayTemplateBlocks = templateBlocks
    .filter((tb) => tb.day_of_week === todayDow)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const availableTasksForDay = allTasks.filter((t) => {
    if (t.status === 'done' || t.status === 'dropped') return false;
    if (t.due_date === today) return true;
    if (t.due_date && t.due_date < today) return true;
    if (t.status === 'active') return true;
    return false;
  });

  const assignedTaskIds = new Set<string>();
  blocks.forEach((b) => {
    try {
      const ids = JSON.parse(b.task_ids || '[]') as string[];
      ids.forEach((id) => assignedTaskIds.add(id));
    } catch { /* empty */ }
  });

  const unassignedTasks = availableTasksForDay.filter((t) => !assignedTaskIds.has(t.id));

  const executingBlock = executingBlockId ? blocks.find((b) => b.id === executingBlockId) : null;

  const overdueDomainGroups: OverdueByDomain[] = (() => {
    const groups = new Map<string | null, Task[]>();
    overdue.forEach((t) => {
      const project = allProjects.find((p) => p.id === t.project_id);
      const domainId = project?.domain_id || null;
      if (!groups.has(domainId)) {
        groups.set(domainId, []);
      }
      groups.get(domainId)!.push(t);
    });
    return Array.from(groups.entries()).map(([domainId, tasks]) => ({
      domainId,
      domain: domainId ? domainMap.get(domainId) || null : null,
      tasks,
    }));
  })();

  // ------ Handlers ------

  function handleNext() { if (stage < 5) setStage(stage + 1); }
  function handleBack() { if (stage > 1) setStage(stage - 1); }

  async function handleCompleteRitual() {
    if (!plan) return;
    try {
      const updated = await dailyPlans.update(plan.id, {
        morning_ritual_completed_at: new Date().toISOString(),
      });
      setPlan(updated);
      setRitualDone(true);
    } catch { /* silently fail */ }
  }

  async function handleQuickStart() {
    if (!plan) return;
    try {
      if (activeTemplate && todayTemplateBlocks.length > 0) {
        for (const tb of todayTemplateBlocks) {
          await timeBlocksApi.create({
            daily_plan_id: plan.id,
            domain_id: tb.domain_id || null,
            start_time: tb.start_time,
            end_time: tb.end_time,
            theme: tb.theme || null,
          });
        }
      }
      const updated = await dailyPlans.update(plan.id, {
        morning_ritual_completed_at: new Date().toISOString(),
      });
      setPlan(updated);
      setQuickStartUsed(true);
      setRitualDone(true);
      await loadBlocks(plan.id);
    } catch { /* silently fail */ }
  }

  async function handleReloadBlocks() {
    if (!plan) return;
    await loadBlocks(plan.id);
  }

  async function handleRescheduleToToday(taskId: string) {
    try { await tasksApi.update(taskId, { due_date: today }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handlePushToLater(taskId: string) {
    try { await tasksApi.update(taskId, { due_date: null }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleReturnToBacklog(taskId: string) {
    try { await tasksApi.update(taskId, { status: 'backlog' }); await loadAll(); } catch { /* silently fail */ }
  }

  function handleAcknowledge(taskId: string) {
    setAcknowledgedTasks((prev) => { const next = new Set(prev); next.add(taskId); return next; });
  }

  async function handleRescheduleTask(taskId: string, newDate: string) {
    try {
      await tasksApi.update(taskId, { due_date: newDate });
      setRescheduleTaskId(null);
      setRescheduleDate('');
      await loadAll();
    } catch { /* silently fail */ }
  }

  async function handleCompleteNow(taskId: string) {
    try { await tasksApi.update(taskId, { status: 'done' }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleTouchProject(projectId: string) {
    try { await projectsApi.update(projectId, { last_touched_at: new Date().toISOString() }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleArchiveProject(projectId: string) {
    try { await projectsApi.update(projectId, { status: 'archived' }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleSomedayProject(projectId: string) {
    try { await projectsApi.update(projectId, { status: 'someday' }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleLoadTemplateBlocks() {
    if (!plan || !activeTemplate) return;
    try {
      for (const tb of todayTemplateBlocks) {
        await timeBlocksApi.create({
          daily_plan_id: plan.id,
          domain_id: tb.domain_id || null,
          start_time: tb.start_time,
          end_time: tb.end_time,
          theme: tb.theme || null,
        });
      }
      await loadBlocks(plan.id);
    } catch { /* silently fail */ }
  }

  async function handleInboxCreateTask(item: InboxItem) {
    try {
      const defaultProject = allProjects.find((p) => p.status === 'active');
      if (!defaultProject) return;
      const task = await tasksApi.create({
        project_id: defaultProject.id,
        title: item.raw_text || item.quick_note || 'Untitled task',
        status: 'active',
        due_date: today,
      });
      await inboxApi.update(item.id, { processed_at: new Date().toISOString(), processed_to_task_id: task.id });
      setInboxItems((prev) => prev.filter((i) => i.id !== item.id));
      setInboxCount((prev) => Math.max(0, prev - 1));
      await loadAll();
    } catch { /* silently fail */ }
  }

  async function handleInboxReference(item: InboxItem) {
    try {
      await inboxApi.update(item.id, { processed_at: new Date().toISOString() });
      setInboxItems((prev) => prev.filter((i) => i.id !== item.id));
      setInboxCount((prev) => Math.max(0, prev - 1));
    } catch { /* silently fail */ }
  }

  async function handleInboxDelete(item: InboxItem) {
    try {
      await inboxApi.delete(item.id);
      setInboxItems((prev) => prev.filter((i) => i.id !== item.id));
      setInboxCount((prev) => Math.max(0, prev - 1));
    } catch { /* silently fail */ }
  }

  function handleBlockClick(block: TimeBlock) {
    if (executingBlockId === block.id) return;
    setExecutingBlockId(block.id);
    setShowContextCard(true);
  }

  function handleEndBlockExecution() {
    setExecutingBlockId(null);
    setShowContextCard(false);
  }

  async function handleTaskToggle(taskId: string) {
    const task = taskMap.get(taskId);
    if (!task) return;
    try {
      const newStatus = task.status === 'done' ? 'active' : 'done';
      await tasksApi.update(taskId, { status: newStatus });
      await loadAll();
    } catch { /* silently fail */ }
  }

  async function handleLogInterruption() {
    if (!plan || !executingBlockId) return;
    try {
      const now = nowTimeStr();
      const nowMins = timeToMinutesFromMidnight(now);
      const interruptEndMins = Math.min(nowMins + 15, 23 * 60 + 59);
      const interruptEndTime = `${String(Math.floor(interruptEndMins / 60)).padStart(2, '0')}:${String(interruptEndMins % 60).padStart(2, '0')}`;

      await timeBlocksApi.create({
        daily_plan_id: plan.id, domain_id: null, start_time: now, end_time: interruptEndTime, theme: 'Interruption',
      });

      const currentBlock = blocks.find((b) => b.id === executingBlockId);
      if (currentBlock) {
        let blockTaskIds: string[] = [];
        try { blockTaskIds = JSON.parse(currentBlock.task_ids || '[]'); } catch { /* empty */ }
        const activeTaskId = blockTaskIds.find((id) => { const t = taskMap.get(id); return t && t.status !== 'done'; });
        if (activeTaskId) {
          await taskEventsApi.create({
            task_id: activeTaskId,
            event_type: 'note_updated' as const,
            old_value: null,
            new_value: JSON.stringify({ type: 'interruption', note: interruptionNote || 'Interruption logged', occurred_at: new Date().toISOString(), block_id: executingBlockId }),
            daily_plan_id: plan.id,
          });
        }
      }

      setShowInterruptionPrompt(false);
      setInterruptionNote('');
      await loadBlocks(plan.id);
    } catch { /* silently fail */ }
  }

  async function handlePullFromBacklog() {
    if (!executingBlockId) return;
    const block = blocks.find((b) => b.id === executingBlockId);
    if (!block) return;
    const domainId = block.domain_id;
    const backlogTask = allTasks.find((t) => {
      if (t.status !== 'backlog' && t.status !== 'active') return false;
      if (assignedTaskIds.has(t.id)) return false;
      if (domainId) { const project = allProjects.find((p) => p.id === t.project_id); return project?.domain_id === domainId; }
      return true;
    });
    if (backlogTask) {
      try {
        let blockTaskIds: string[] = [];
        try { blockTaskIds = JSON.parse(block.task_ids || '[]'); } catch { /* empty */ }
        blockTaskIds.push(backlogTask.id);
        await timeBlocksApi.update(block.id, { task_ids: blockTaskIds });
        await loadAll();
      } catch { /* silently fail */ }
    }
  }

  function handleStartNextBlockEarly() {
    const sorted = [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const currentIdx = sorted.findIndex((b) => b.id === executingBlockId);
    if (currentIdx >= 0 && currentIdx < sorted.length - 1) {
      const nextBlock = sorted[currentIdx + 1];
      setExecutingBlockId(nextBlock.id);
      setShowContextCard(true);
    } else {
      handleEndBlockExecution();
    }
  }

  async function handleCloseOutReschedule(taskId: string) {
    try { await tasksApi.update(taskId, { due_date: tomorrow }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleCloseOutBacklog(taskId: string) {
    try { await tasksApi.update(taskId, { status: 'backlog', due_date: null }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleCloseOutDone(taskId: string) {
    try { await tasksApi.update(taskId, { status: 'done' }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleCompleteCloseOut() {
    if (!plan) return;
    try {
      const updated = await dailyPlans.update(plan.id, { close_out_completed_at: new Date().toISOString() });
      setPlan(updated);
      setShowCloseOut(false);
    } catch { /* silently fail */ }
  }

  async function handleAssignTaskToBlock(taskId: string, blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    try {
      let blockTaskIds: string[] = [];
      try { blockTaskIds = JSON.parse(block.task_ids || '[]'); } catch { /* empty */ }
      if (!blockTaskIds.includes(taskId)) {
        blockTaskIds.push(taskId);
        await timeBlocksApi.update(block.id, { task_ids: blockTaskIds });
        setAssignTaskToBlock(null);
        await handleReloadBlocks();
      }
    } catch { /* silently fail */ }
  }

  // Recovery mode handlers
  async function handleRecoveryRescheduleAllToToday(domainId: string | null) {
    const group = overdueDomainGroups.find((g) => g.domainId === domainId);
    if (!group) return;
    try { for (const t of group.tasks) { await tasksApi.update(t.id, { due_date: today }); } await loadAll(); } catch { /* silently fail */ }
  }

  async function handleRecoverySweepToBacklog(domainId: string | null) {
    const group = overdueDomainGroups.find((g) => g.domainId === domainId);
    if (!group) return;
    try { for (const t of group.tasks) { await tasksApi.update(t.id, { status: 'backlog', due_date: null }); } await loadAll(); } catch { /* silently fail */ }
  }

  async function handleRecoveryRescheduleTask(taskId: string) {
    try { await tasksApi.update(taskId, { due_date: today }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleRecoveryDropTask(taskId: string) {
    try { await tasksApi.update(taskId, { status: 'dropped' }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleRecoveryMarkDone(taskId: string) {
    try { await tasksApi.update(taskId, { status: 'done' }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleFreshStartBulkSweep() {
    try {
      const allOverdue = overdueDomainGroups.flatMap((g) => g.tasks);
      for (const t of allOverdue) { await tasksApi.update(t.id, { status: 'backlog', due_date: null }); }
      await loadAll();
    } catch { /* silently fail */ }
  }

  async function handleRecoveryTouchProject(projectId: string) {
    try { await projectsApi.update(projectId, { last_touched_at: new Date().toISOString() }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleRecoveryArchiveProject(projectId: string) {
    try { await projectsApi.update(projectId, { status: 'archived' }); await loadAll(); } catch { /* silently fail */ }
  }

  async function handleRecoverySomedayProject(projectId: string) {
    try { await projectsApi.update(projectId, { status: 'someday' }); await loadAll(); } catch { /* silently fail */ }
  }

  function handleDismissRecovery() { setRecoveryMode('none'); }

  // ------ Render ------

  if (loading) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gw-stone-200 rounded w-48" />
          <div className="h-4 bg-gw-stone-100 rounded w-64" />
          <div className="flex gap-4 justify-center my-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-10 h-10 bg-gw-stone-200 rounded-full" />
            ))}
          </div>
          <div className="h-64 bg-gw-stone-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gw-stone-900">Daily Cockpit</h1>
        <p className="text-sm text-gw-stone-500 mt-1">{dateLabel(today)}</p>
      </div>

      {!ritualDone ? (
        /* ============ MORNING RITUAL FLOW (or Recovery Mode) ============ */
        <>
          {recoveryMode === 'catch-up' && (
            <CatchUpMode
              daysMissed={daysMissed}
              overdueDomainGroups={overdueDomainGroups}
              inboxCount={inboxCount}
              stalledProjects={stalledProjects}
              domainMap={domainMap}
              onRescheduleAllToToday={handleRecoveryRescheduleAllToToday}
              onRescheduleTask={handleRecoveryRescheduleTask}
              onDropTask={handleRecoveryDropTask}
              onMarkDone={handleRecoveryMarkDone}
              onSweepToBacklog={handleRecoverySweepToBacklog}
              onDismiss={handleDismissRecovery}
            />
          )}

          {recoveryMode === 'fresh-start' && (
            <FreshStartMode
              daysMissed={daysMissed}
              overdueDomainGroups={overdueDomainGroups}
              stalledProjects={stalledProjects}
              allProjects={allProjects}
              inboxCount={inboxCount}
              domainMap={domainMap}
              onBulkSweep={handleFreshStartBulkSweep}
              onRescheduleAllToToday={handleRecoveryRescheduleAllToToday}
              onDropTask={handleRecoveryDropTask}
              onMarkDone={handleRecoveryMarkDone}
              onTouchProject={handleRecoveryTouchProject}
              onArchiveProject={handleRecoveryArchiveProject}
              onSomedayProject={handleRecoverySomedayProject}
              onDismiss={handleDismissRecovery}
            />
          )}

          {recoveryMode === 'none' && (
            <MorningRitualStages
              stage={stage}
              plan={plan}
              blocks={blocks}
              allDomains={allDomains}
              domainMap={domainMap}
              projectMap={projectMap}
              completedYesterday={completedYesterday}
              uncompletedYesterday={uncompletedYesterday}
              dueToday={dueToday}
              overdue={overdue}
              stalledProjects={stalledProjects}
              inboxCount={inboxCount}
              inboxItems={inboxItems}
              unassignedTasks={unassignedTasks}
              assignTaskToBlock={assignTaskToBlock}
              assignedMinutes={assignedMinutes}
              computedAvailableMinutes={computedAvailableMinutes}
              calendarMinutesUsed={calendarMinutesUsed}
              acknowledgedTasks={acknowledgedTasks}
              rescheduleTaskId={rescheduleTaskId}
              rescheduleDate={rescheduleDate}
              activeTemplate={activeTemplate}
              todayTemplateBlocks={todayTemplateBlocks}
              today={today}
              onBack={handleBack}
              onNext={handleNext}
              onQuickStart={handleQuickStart}
              onCompleteRitual={handleCompleteRitual}
              onRescheduleToToday={handleRescheduleToToday}
              onPushToLater={handlePushToLater}
              onReturnToBacklog={handleReturnToBacklog}
              onAcknowledge={handleAcknowledge}
              onRescheduleTask={handleRescheduleTask}
              onSetRescheduleTaskId={setRescheduleTaskId}
              onSetRescheduleDate={setRescheduleDate}
              onCompleteNow={handleCompleteNow}
              onTouchProject={handleTouchProject}
              onSomedayProject={handleSomedayProject}
              onArchiveProject={handleArchiveProject}
              onLoadTemplateBlocks={handleLoadTemplateBlocks}
              onReloadBlocks={handleReloadBlocks}
              onSetAssignTaskToBlock={setAssignTaskToBlock}
              onAssignTaskToBlock={handleAssignTaskToBlock}
              onInboxCreateTask={handleInboxCreateTask}
              onInboxReference={handleInboxReference}
              onInboxDelete={handleInboxDelete}
            />
          )}
        </>
      ) : (
        /* ============ DAY VIEW (post-ritual) ============ */
        <DayView
          plan={plan}
          blocks={blocks}
          allTasks={allTasks}
          allProjects={allProjects}
          domainMap={domainMap}
          taskMap={taskMap}
          projectMap={projectMap}
          assignedMinutes={assignedMinutes}
          computedAvailableMinutes={computedAvailableMinutes}
          calendarMinutesUsed={calendarMinutesUsed}
          quickStartUsed={quickStartUsed}
          showDeferredStages={showDeferredStages}
          executingBlockId={executingBlockId}
          executingBlock={executingBlock}
          showContextCard={showContextCard}
          showInterruptionPrompt={showInterruptionPrompt}
          interruptionNote={interruptionNote}
          showCloseOut={showCloseOut}
          uncompletedYesterday={uncompletedYesterday}
          overdue={overdue}
          dueToday={dueToday}
          stalledProjects={stalledProjects}
          inboxCount={inboxCount}
          today={today}
          onToggleDeferredStages={() => setShowDeferredStages(!showDeferredStages)}
          onDismissDeferredStages={() => setShowDeferredStages(false)}
          onRescheduleToToday={handleRescheduleToToday}
          onPushToLater={handlePushToLater}
          onBlockClick={handleBlockClick}
          onDismissContextCard={() => setShowContextCard(false)}
          onTaskToggle={handleTaskToggle}
          onInterruption={() => setShowInterruptionPrompt(true)}
          onEndBlockExecution={handleEndBlockExecution}
          onPullFromBacklog={handlePullFromBacklog}
          onStartNextBlock={handleStartNextBlockEarly}
          onSetInterruptionNote={setInterruptionNote}
          onLogInterruption={handleLogInterruption}
          onCancelInterruption={() => { setShowInterruptionPrompt(false); setInterruptionNote(''); }}
          onShowCloseOut={() => setShowCloseOut(true)}
          onCloseOutReschedule={handleCloseOutReschedule}
          onCloseOutBacklog={handleCloseOutBacklog}
          onCloseOutDone={handleCloseOutDone}
          onCompleteCloseOut={handleCompleteCloseOut}
        />
      )}
    </div>
  );
}
