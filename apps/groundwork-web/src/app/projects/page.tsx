'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  domains as domainsApi,
  projects as projectsApi,
  tasks as tasksApi,
  taskTags as taskTagsApi,
  materials as materialsApi,
} from '@/lib/api';
import { TagFilterBar } from '@/components/TagComponents';
import PageSkeleton from '@/components/PageSkeleton';
import ErrorState from '@/components/ErrorState';

import {
  type DomainData,
  type ProjectData,
  type TaskData,
  type MaterialData,
  type KanbanColumn,
  STATUS_STYLES,
  PROJECT_STATUSES,
  TaskDetailModal,
  ViewSwitcher,
  KanbanView,
  ListView,
  TimelineView,
  MaterialsView,
  NewProjectForm,
} from '@/components/projects';

export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Projects" cardCount={4} />}>
      <ProjectsPageInner />
    </Suspense>
  );
}

function ProjectsPageInner() {
  const searchParams = useSearchParams();
  const domainFilter = searchParams.get('domain');

  // Loading and error states
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [domainList, setDomainList] = useState<DomainData[]>([]);
  const [projectList, setProjectList] = useState<ProjectData[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(domainFilter);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectTasks, setProjectTasks] = useState<TaskData[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskCounts, setTaskCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // View state per project
  const [projectViews, setProjectViews] = useState<Record<string, string>>({});

  // Custom kanban columns per project
  const [customColumns, setCustomColumns] = useState<Record<string, KanbanColumn[]>>({});

  // Task detail modal
  const [detailTask, setDetailTask] = useState<TaskData | null>(null);

  // Tag filtering
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [taskTagCache, setTaskTagCache] = useState<Record<string, string[]>>({});

  // Materials state
  const [projectMaterials, setProjectMaterials] = useState<MaterialData[]>([]);
  const [unblockedTasks, setUnblockedTasks] = useState<Set<string>>(new Set());

  // New project form state
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectDomainId, setNewProjectDomainId] = useState('');
  const [newProjectDefaultView, setNewProjectDefaultView] = useState<string>('list');

  const loadProjects = useCallback(async () => {
    try {
      setPageError(null);
      const params: Record<string, string> = {};
      if (activeDomain) params.domain_id = activeDomain;
      const data = await projectsApi.list(params);
      setProjectList(data as ProjectData[]);
    } catch {
      setPageError('Unable to load projects. The API may be unavailable.');
    } finally {
      setPageLoading(false);
    }
  }, [activeDomain]);

  const loadTaskCounts = useCallback(async (projects: Array<{ id: string }>) => {
    const counts: Record<string, { done: number; total: number }> = {};
    await Promise.all(
      projects.map(async (project) => {
        try {
          const tasks = await tasksApi.list({ project_id: project.id }) as TaskData[];
          const done = tasks.filter((t) => t.status === 'done').length;
          counts[project.id] = { done, total: tasks.length };
        } catch {
          counts[project.id] = { done: 0, total: 0 };
        }
      })
    );
    setTaskCounts(counts);
  }, []);

  useEffect(() => {
    async function loadDomains() {
      try {
        const data = await domainsApi.list();
        setDomainList(data as DomainData[]);
      } catch {
        // API not running
      }
    }
    loadDomains();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projectList.length > 0) {
      loadTaskCounts(projectList);
    }
  }, [projectList, loadTaskCounts]);

  // Initialize project views from project data
  useEffect(() => {
    const views: Record<string, string> = {};
    projectList.forEach((p) => {
      views[p.id] = p.default_view || 'list';
    });
    setProjectViews((prev) => ({ ...views, ...prev }));
  }, [projectList]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadTasks(projectId: string) {
    try {
      const data = await tasksApi.list({ project_id: projectId });
      setProjectTasks(data as TaskData[]);

      const tagCache: Record<string, string[]> = {};
      await Promise.all(
        (data as TaskData[]).map(async (task) => {
          try {
            const links = await taskTagsApi.list({ task_id: task.id });
            tagCache[task.id] = (links as Array<{ tag_id: string }>).map((l) => l.tag_id);
          } catch {
            tagCache[task.id] = [];
          }
        })
      );
      setTaskTagCache(tagCache);
    } catch {
      // silently fail
    }
  }

  async function loadMaterials(projectId: string) {
    try {
      const data = await materialsApi.list({ project_id: projectId });
      setProjectMaterials(data as MaterialData[]);
    } catch {
      setProjectMaterials([]);
    }
  }

  async function toggleProject(projectId: string) {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      setProjectTasks([]);
      setProjectMaterials([]);
      setExpandedTaskId(null);
    } else {
      setExpandedProject(projectId);
      setExpandedTaskId(null);
      await loadTasks(projectId);
      await loadMaterials(projectId);
    }
  }

  async function handleAddTask(projectId: string) {
    if (!newTaskTitle.trim()) return;
    try {
      await tasksApi.create({ project_id: projectId, title: newTaskTitle.trim() });
      setNewTaskTitle('');
      await loadTasks(projectId);
      await loadTaskCounts(projectList);
    } catch {
      // silently fail
    }
  }

  async function handleToggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'backlog' : 'done';
    try {
      await tasksApi.update(taskId, { status: newStatus });
      if (expandedProject) {
        await loadTasks(expandedProject);
      }
      await loadTaskCounts(projectList);
    } catch {
      // silently fail
    }
  }

  async function handleUpdateProjectStatus(projectId: string, newStatus: string) {
    try {
      await projectsApi.update(projectId, { status: newStatus as 'active' | 'someday' | 'completed' | 'archived' });
      setStatusDropdownOpen(null);
      await loadProjects();
    } catch {
      // silently fail
    }
  }

  async function handleUpdateTaskDueDate(taskId: string, dueDate: string) {
    try {
      await tasksApi.update(taskId, { due_date: dueDate || null });
      if (expandedProject) {
        await loadTasks(expandedProject);
      }
    } catch {
      // silently fail
    }
  }

  async function handleUpdateTaskEstimate(taskId: string, minutes: string) {
    try {
      const value = minutes ? parseInt(minutes, 10) : null;
      await tasksApi.update(taskId, { estimated_minutes: value });
      if (expandedProject) {
        await loadTasks(expandedProject);
      }
    } catch {
      // silently fail
    }
  }

  async function handleSaveNotes(taskId: string) {
    const notes = editingNotes[taskId];
    if (notes === undefined) return;
    try {
      await tasksApi.update(taskId, { notes: notes || null });
      if (expandedProject) {
        await loadTasks(expandedProject);
      }
    } catch {
      // silently fail
    }
  }

  function toggleTaskExpand(taskId: string, currentNotes: string | null) {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(taskId);
      setEditingNotes((prev) => ({ ...prev, [taskId]: currentNotes ?? '' }));
    }
  }

  async function handleTaskDetailUpdate(taskId: string, updates: Partial<TaskData>) {
    try {
      await tasksApi.update(taskId, updates as Record<string, unknown>);
      if (expandedProject) {
        await loadTasks(expandedProject);
        await loadTaskCounts(projectList);
      }
      setDetailTask((prev) => prev ? { ...prev, ...updates } : prev);
    } catch {
      // silently fail
    }
  }

  // Switch view and persist to API
  async function handleSwitchView(projectId: string, view: string) {
    setProjectViews((prev) => ({ ...prev, [projectId]: view }));
    try {
      await projectsApi.update(projectId, { default_view: view as 'list' | 'kanban' });
    } catch {
      // silently fail
    }
  }

  // Kanban task status change handler
  async function handleKanbanTaskStatusChange(taskId: string, status: string) {
    await tasksApi.update(taskId, { status: status as 'backlog' | 'active' | 'done' | 'dropped' });
  }

  // List view drag reorder handler
  async function handleListDragReorder(reordered: TaskData[]) {
    try {
      await Promise.all(
        reordered.map((task, i) =>
          tasksApi.update(task.id, { sort_order: i + 1 })
        )
      );
    } catch {
      if (expandedProject) await loadTasks(expandedProject);
    }
  }

  // Create new project handler
  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectDomainId) return;
    try {
      await projectsApi.create({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        domain_id: newProjectDomainId,
        default_view: newProjectDefaultView as 'list' | 'kanban',
      });
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectDomainId('');
      setNewProjectDefaultView('list');
      setShowNewProjectForm(false);
      await loadProjects();
    } catch {
      // silently fail
    }
  }

  // Handle unblocked tasks from materials view
  function handleUnblockedTasksDetected(taskIds: Set<string>) {
    setUnblockedTasks(prev => {
      const next = new Set(prev);
      taskIds.forEach(id => next.add(id));
      return next;
    });
    setTimeout(() => {
      setUnblockedTasks(prev => {
        const next = new Set(prev);
        taskIds.forEach(id => next.delete(id));
        return next;
      });
    }, 4000);
  }

  // Sort tasks: backlog and active first (by sort_order), then done at bottom
  function getSortedTasks(tasks: TaskData[]) {
    const activeTasks = tasks
      .filter((t) => t.status === 'backlog' || t.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);
    const doneTasks = tasks
      .filter((t) => t.status === 'done')
      .sort((a, b) => a.sort_order - b.sort_order);
    const otherTasks = tasks
      .filter((t) => t.status !== 'backlog' && t.status !== 'active' && t.status !== 'done')
      .sort((a, b) => a.sort_order - b.sort_order);
    return [...activeTasks, ...otherTasks, ...doneTasks];
  }

  // Apply tag filter (AND logic)
  const tagFilteredTasks = filterTagIds.length > 0
    ? projectTasks.filter((task) => {
        const taskTags = taskTagCache[task.id] || [];
        return filterTagIds.every((tagId) => taskTags.includes(tagId));
      })
    : projectTasks;

  const sortedTasks = getSortedTasks(tagFilteredTasks);

  // Stale warning helper
  function isStale(lastTouchedAt: string | null): boolean {
    if (!lastTouchedAt) return true;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(lastTouchedAt) < sevenDaysAgo;
  }

  // Group projects by domain for "All" tab
  function getProjectsByDomain(): { domain: DomainData; projects: ProjectData[] }[] {
    const groups: { domain: DomainData; projects: ProjectData[] }[] = [];
    for (const domain of domainList) {
      const domainProjects = projectList.filter((p) => p.domain_id === domain.id);
      if (domainProjects.length > 0) {
        groups.push({ domain, projects: domainProjects });
      }
    }
    const orphanProjects = projectList.filter((p) => !domainList.find((d) => d.id === p.domain_id));
    if (orphanProjects.length > 0) {
      groups.push({
        domain: { id: 'unknown', name: 'Uncategorized', color: '#9CA3AF' },
        projects: orphanProjects,
      });
    }
    return groups;
  }

  // Render the correct view for the expanded project
  function renderProjectView(projectId: string) {
    const currentView = projectViews[projectId] || 'list';
    switch (currentView) {
      case 'kanban':
        return (
          <KanbanView
            projectId={projectId}
            projectTasks={projectTasks}
            setProjectTasks={setProjectTasks}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            onAddTask={handleAddTask}
            onDetailTask={setDetailTask}
            onTaskStatusChange={handleKanbanTaskStatusChange}
            loadTasks={loadTasks}
            loadTaskCounts={loadTaskCounts}
            projectList={projectList}
            customColumns={customColumns}
            setCustomColumns={setCustomColumns}
          />
        );
      case 'timeline':
        return (
          <TimelineView
            projectId={projectId}
            projectTasks={projectTasks}
            projectMaterials={projectMaterials}
            domainList={domainList}
            projectList={projectList}
            expandedProject={expandedProject}
            loadTasks={loadTasks}
            onDetailTask={setDetailTask}
            unblockedTasks={unblockedTasks}
          />
        );
      case 'materials':
        return (
          <MaterialsView
            projectId={projectId}
            projectMaterials={projectMaterials}
            loadMaterials={loadMaterials}
            expandedProject={expandedProject}
            onUnblockedTasksDetected={handleUnblockedTasksDetected}
          />
        );
      case 'list':
      default:
        return (
          <ListView
            projectId={projectId}
            sortedTasks={sortedTasks}
            projectTasks={projectTasks}
            setProjectTasks={setProjectTasks}
            expandedTaskId={expandedTaskId}
            editingNotes={editingNotes}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            onToggleTask={handleToggleTask}
            onToggleTaskExpand={toggleTaskExpand}
            onDueDateChange={handleUpdateTaskDueDate}
            onEstimateChange={handleUpdateTaskEstimate}
            onNotesChange={(taskId, val) =>
              setEditingNotes((prev) => ({ ...prev, [taskId]: val }))
            }
            onNotesSave={handleSaveNotes}
            onAddTask={handleAddTask}
            onDragReorder={handleListDragReorder}
          />
        );
    }
  }

  // Render a single project card
  function renderProjectCard(project: ProjectData) {
    const domain = domainList.find((d) => d.id === project.domain_id);
    const isExpanded = expandedProject === project.id;
    const counts = taskCounts[project.id];
    const stale = isStale(project.last_touched_at);
    const activeCount = counts ? counts.total - counts.done : 0;
    const doneCount = counts ? counts.done : 0;

    return (
      <div key={project.id} className="card">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => toggleProject(project.id)}
        >
          <svg
            className={`w-4 h-4 text-gw-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>

          {domain && (
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: domain.color }}
            />
          )}

          <h3 className="font-semibold text-gw-stone-800 flex-1">{project.name}</h3>

          {/* Stale warning */}
          {stale && project.status === 'active' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
              Stale
            </span>
          )}

          {/* Task count */}
          {counts && counts.total > 0 && (
            <span className="text-xs text-gw-stone-400 font-medium">
              {activeCount} active / {doneCount} done
            </span>
          )}

          {/* View switcher (only show when expanded) */}
          {isExpanded && (
            <div onClick={(e) => e.stopPropagation()}>
              <ViewSwitcher
                projectId={project.id}
                currentView={projectViews[project.id] || 'list'}
                onSwitchView={handleSwitchView}
              />
            </div>
          )}

          {/* Default view label (show when collapsed) */}
          {!isExpanded && (
            <span className="text-xs text-gw-stone-300 font-medium">
              {projectViews[project.id] || project.default_view}
            </span>
          )}

          {/* Status dropdown */}
          <div className="relative" ref={statusDropdownOpen === project.id ? statusDropdownRef : null}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStatusDropdownOpen(
                  statusDropdownOpen === project.id ? null : project.id
                );
              }}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors hover:opacity-80 ${
                STATUS_STYLES[project.status] || 'bg-gw-stone-100 text-gw-stone-500'
              }`}
            >
              {project.status}
              <svg className="w-3 h-3 inline-block ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {statusDropdownOpen === project.id && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gw-stone-200 py-1 z-10 min-w-[120px]">
                {PROJECT_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateProjectStatus(project.id, status);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gw-stone-50 ${
                      project.status === status ? 'bg-gw-stone-50' : ''
                    }`}
                  >
                    <span className={`inline-block px-1.5 py-0.5 rounded ${STATUS_STYLES[status]}`}>
                      {status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Deadline badge */}
          {project.deadline && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
              Due {project.deadline}
            </span>
          )}
        </div>

        {/* Expanded project view */}
        {isExpanded && (
          <div className="mt-4 pl-10 border-t border-gw-stone-100 pt-4">
            {renderProjectView(project.id)}
          </div>
        )}
      </div>
    );
  }

  // Loading skeleton
  if (pageLoading) {
    return <PageSkeleton title="Projects" cardCount={4} />;
  }

  // Error state with retry
  if (pageError) {
    return <ErrorState title="Projects" message={pageError} onRetry={loadProjects} />;
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gw-stone-900">Projects</h1>
          <p className="text-sm text-gw-stone-500 mt-1">Manage your work across all domains</p>
        </div>
        <button
          onClick={() => setShowNewProjectForm(!showNewProjectForm)}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </button>
      </div>

      {/* New Project form */}
      {showNewProjectForm && (
        <NewProjectForm
          domainList={domainList}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          newProjectDescription={newProjectDescription}
          setNewProjectDescription={setNewProjectDescription}
          newProjectDomainId={newProjectDomainId}
          setNewProjectDomainId={setNewProjectDomainId}
          newProjectDefaultView={newProjectDefaultView}
          setNewProjectDefaultView={setNewProjectDefaultView}
          onSubmit={handleCreateProject}
          onCancel={() => setShowNewProjectForm(false)}
        />
      )}

      {/* Domain tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveDomain(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !activeDomain
              ? 'bg-gw-stone-800 text-white'
              : 'bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200'
          }`}
        >
          All
        </button>
        {domainList.map((domain) => (
          <button
            key={domain.id}
            onClick={() => setActiveDomain(domain.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeDomain === domain.id
                ? 'text-white'
                : 'bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200'
            }`}
            style={activeDomain === domain.id ? { backgroundColor: domain.color } : undefined}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: domain.color }}
            />
            {domain.name}
          </button>
        ))}
      </div>

      {/* Tag filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <TagFilterBar selectedTagIds={filterTagIds} onTagsChanged={setFilterTagIds} />
        {filterTagIds.length > 0 && (
          <span className="text-xs text-gw-stone-400">
            Showing tasks with all selected tags
          </span>
        )}
      </div>

      {/* Projects list */}
      {projectList.length === 0 ? (
        <div className="text-center py-16 text-gw-stone-400">
          <p className="font-medium">No projects yet</p>
          <p className="text-sm mt-1">Click &quot;New Project&quot; above to create one</p>
        </div>
      ) : !activeDomain ? (
        /* ALL tab - group by domain */
        <div className="space-y-6">
          {getProjectsByDomain().map(({ domain, projects }) => (
            <div key={domain.id}>
              <div
                className="flex items-center gap-2 mb-3 pb-2 border-b-2"
                style={{ borderBottomColor: domain.color }}
              >
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: domain.color }}
                />
                <h2 className="text-sm font-semibold" style={{ color: domain.color }}>
                  {domain.name}
                </h2>
                <span className="text-xs text-gw-stone-400">({projects.length})</span>
              </div>
              <div className="space-y-3">
                {projects.map((project) => renderProjectCard(project))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Filtered by domain - flat list */
        <div className="space-y-3">
          {projectList.map((project) => renderProjectCard(project))}
        </div>
      )}

      {/* Task Detail Modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={handleTaskDetailUpdate}
        />
      )}
    </div>
  );
}
