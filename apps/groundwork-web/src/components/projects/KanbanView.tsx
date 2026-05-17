'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { TaskTagBadges } from '@/components/TagComponents';
import { TaskData, KanbanColumn, DEFAULT_KANBAN_COLUMNS } from './types';
import DroppableColumn from './DroppableColumn';
import SortableKanbanCard from './SortableKanbanCard';

interface KanbanViewProps {
  projectId: string;
  projectTasks: TaskData[];
  setProjectTasks: React.Dispatch<React.SetStateAction<TaskData[]>>;
  newTaskTitle: string;
  setNewTaskTitle: React.Dispatch<React.SetStateAction<string>>;
  onAddTask: (projectId: string) => void;
  onDetailTask: (task: TaskData) => void;
  onTaskStatusChange: (taskId: string, status: string) => Promise<void>;
  loadTasks: (projectId: string) => Promise<void>;
  loadTaskCounts: (projects: Array<{ id: string }>) => Promise<void>;
  projectList: Array<{ id: string }>;
  customColumns: Record<string, KanbanColumn[]>;
  setCustomColumns: React.Dispatch<React.SetStateAction<Record<string, KanbanColumn[]>>>;
}

export default function KanbanView({
  projectId,
  projectTasks,
  setProjectTasks,
  newTaskTitle,
  setNewTaskTitle,
  onAddTask,
  onDetailTask,
  onTaskStatusChange,
  loadTasks,
  loadTaskCounts,
  projectList,
  customColumns,
  setCustomColumns,
}: KanbanViewProps) {
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function getKanbanColumns(): KanbanColumn[] {
    const custom = customColumns[projectId] || [];
    return [...DEFAULT_KANBAN_COLUMNS, ...custom];
  }

  function handleAddColumn() {
    if (!newColumnName.trim()) return;
    const colId = `col-custom-${Date.now()}`;
    const newCol: KanbanColumn = {
      id: colId,
      title: newColumnName.trim(),
      status: newColumnName.trim().toLowerCase().replace(/\s+/g, '_'),
      isCustom: true,
    };
    setCustomColumns((prev) => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), newCol],
    }));
    setNewColumnName('');
  }

  function handleRenameColumn(colId: string) {
    if (!editingColumnName.trim()) { setEditingColumnId(null); return; }
    setCustomColumns((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map((col) =>
        col.id === colId ? { ...col, title: editingColumnName.trim(), status: editingColumnName.trim().toLowerCase().replace(/\s+/g, '_') } : col
      ),
    }));
    setEditingColumnId(null);
    setEditingColumnName('');
  }

  function handleDeleteColumn(colId: string) {
    setCustomColumns((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter((col) => col.id !== colId),
    }));
  }

  function handleMoveColumn(colId: string, direction: 'left' | 'right') {
    setCustomColumns((prev) => {
      const cols = [...(prev[projectId] || [])];
      const idx = cols.findIndex((c) => c.id === colId);
      if (idx === -1) return prev;
      const newIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= cols.length) return prev;
      const reordered = arrayMove(cols, idx, newIdx);
      return { ...prev, [projectId]: reordered };
    });
  }

  function handleKanbanDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id);
  }

  async function handleKanbanDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const columns = getKanbanColumns();
    let targetColumn: KanbanColumn | undefined;

    targetColumn = columns.find((col) => col.id === overId);

    if (!targetColumn) {
      const overTask = projectTasks.find((t) => t.id === overId);
      if (overTask) {
        targetColumn = columns.find((col) => col.status === overTask.status);
      }
    }

    if (!targetColumn) return;

    const task = projectTasks.find((t) => t.id === taskId);
    if (!task || task.status === targetColumn.status) return;

    setProjectTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, status: targetColumn!.status } : t)
    );

    try {
      await onTaskStatusChange(taskId, targetColumn.status);
      await loadTaskCounts(projectList);
    } catch {
      await loadTasks(projectId);
    }
  }

  function handleKanbanDragOver(_event: DragOverEvent) {
    // Could be used for visual feedback; kept as no-op for now
  }

  const columns = getKanbanColumns();
  const draggedTask = activeDragId ? projectTasks.find((t) => t.id === activeDragId) : null;

  return (
    <div>
      {/* Column management toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleAddColumn(); }}
          className="flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="New column..."
            className="px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500 w-28 placeholder:text-gw-stone-300"
          />
          <button
            type="submit"
            disabled={!newColumnName.trim()}
            className="text-xs px-2 py-1 bg-gw-stone-200 text-gw-stone-600 rounded font-medium disabled:opacity-40 hover:bg-gw-stone-300 transition-colors"
          >
            + Column
          </button>
        </form>
      </div>

      {/* Kanban board with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleKanbanDragStart}
        onDragEnd={handleKanbanDragEnd}
        onDragOver={handleKanbanDragOver}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => {
            const columnTasks = projectTasks
              .filter((t) => t.status === column.status)
              .sort((a, b) => a.sort_order - b.sort_order);

            return (
              <DroppableColumn key={column.id} id={column.id}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-2">
                  {editingColumnId === column.id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRenameColumn(column.id); }}
                      className="flex items-center gap-1 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        autoFocus
                        onBlur={() => handleRenameColumn(column.id)}
                        className="text-xs font-semibold px-1 py-0.5 rounded border border-gw-stone-300 focus:outline-none focus:ring-1 focus:ring-gw-green-500 flex-1 min-w-0"
                      />
                    </form>
                  ) : (
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gw-stone-500">
                      {column.title}
                      <span className="ml-1.5 text-gw-stone-300 font-normal">({columnTasks.length})</span>
                    </h4>
                  )}
                  {column.isCustom && editingColumnId !== column.id && (
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleMoveColumn(column.id, 'left')}
                        className="text-gw-stone-300 hover:text-gw-stone-500 p-0.5"
                        title="Move left"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveColumn(column.id, 'right')}
                        className="text-gw-stone-300 hover:text-gw-stone-500 p-0.5"
                        title="Move right"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setEditingColumnId(column.id); setEditingColumnName(column.title); }}
                        className="text-gw-stone-300 hover:text-gw-stone-500 p-0.5"
                        title="Rename"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteColumn(column.id)}
                        className="text-gw-stone-300 hover:text-red-500 p-0.5"
                        title="Delete column"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Column tasks */}
                <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 min-h-[60px]">
                    {columnTasks.map((task) => (
                      <SortableKanbanCard key={task.id} id={task.id}>
                        <div
                          className={`bg-white rounded-lg border border-gw-stone-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                            task.status === 'done' ? 'opacity-60' : ''
                          }`}
                          onClick={(e) => { e.stopPropagation(); onDetailTask(task); }}
                        >
                          <p className={`text-sm font-medium ${
                            task.status === 'done' ? 'line-through text-gw-stone-400' : 'text-gw-stone-800'
                          }`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {task.estimated_minutes != null && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                                {task.estimated_minutes}m
                              </span>
                            )}
                            {task.due_date && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                new Date(task.due_date) < new Date()
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-gw-stone-100 text-gw-stone-500'
                              }`}>
                                {task.due_date}
                              </span>
                            )}
                          </div>
                          {/* Feature 105: Tag badges on kanban cards */}
                          <div className="mt-1.5">
                            <TaskTagBadges taskId={task.id} />
                          </div>
                        </div>
                      </SortableKanbanCard>
                    ))}
                  </div>
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggedTask ? (
            <div className="bg-white rounded-lg border-2 border-gw-green-400 p-3 shadow-lg w-[260px] rotate-2">
              <p className="text-sm font-medium text-gw-stone-800">{draggedTask.title}</p>
              <div className="flex items-center gap-2 mt-2">
                {draggedTask.estimated_minutes != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                    {draggedTask.estimated_minutes}m
                  </span>
                )}
                {draggedTask.due_date && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gw-stone-100 text-gw-stone-500 font-medium">
                    {draggedTask.due_date}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Rapid entry for kanban */}
      <form
        onSubmit={(e) => { e.preventDefault(); onAddTask(projectId); }}
        className="flex gap-2 mt-4"
      >
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent placeholder:text-gw-stone-400"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="px-3 py-2 text-sm bg-gw-green-600 text-white rounded-lg font-medium disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
        >
          Add
        </button>
      </form>
    </div>
  );
}
