'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { TaskData } from './types';
import TaskRow from './TaskRow';
import SortableTaskItem from './SortableTaskItem';

interface ListViewProps {
  projectId: string;
  sortedTasks: TaskData[];
  projectTasks: TaskData[];
  setProjectTasks: React.Dispatch<React.SetStateAction<TaskData[]>>;
  expandedTaskId: string | null;
  editingNotes: Record<string, string>;
  newTaskTitle: string;
  setNewTaskTitle: React.Dispatch<React.SetStateAction<string>>;
  onToggleTask: (taskId: string, currentStatus: string) => void;
  onToggleTaskExpand: (taskId: string, currentNotes: string | null) => void;
  onDueDateChange: (taskId: string, val: string) => void;
  onEstimateChange: (taskId: string, val: string) => void;
  onNotesChange: (taskId: string, val: string) => void;
  onNotesSave: (taskId: string) => void;
  onAddTask: (projectId: string) => void;
  onDragReorder: (reordered: TaskData[]) => Promise<void>;
}

export default function ListView({
  projectId,
  sortedTasks,
  projectTasks,
  setProjectTasks,
  expandedTaskId,
  editingNotes,
  newTaskTitle,
  setNewTaskTitle,
  onToggleTask,
  onToggleTaskExpand,
  onDueDateChange,
  onEstimateChange,
  onNotesChange,
  onNotesSave,
  onAddTask,
  onDragReorder,
}: ListViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeTasksFiltered = sortedTasks.filter((t) => t.status === 'backlog' || t.status === 'active');
  const hasActiveTasks = activeTasksFiltered.length > 0;
  const hasDoneTasks = sortedTasks.some((t) => t.status === 'done');

  async function handleTaskDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeTasksFiltered.findIndex((t) => t.id === active.id);
    const newIndex = activeTasksFiltered.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activeTasksFiltered, oldIndex, newIndex);

    // Optimistic update
    const newProjectTasks = projectTasks.map((t) => {
      const reorderedIdx = reordered.findIndex((r) => r.id === t.id);
      if (reorderedIdx !== -1) {
        return { ...t, sort_order: reorderedIdx + 1 };
      }
      return t;
    });
    setProjectTasks(newProjectTasks);

    await onDragReorder(reordered);
  }

  return (
    <div>
      {sortedTasks.length === 0 ? (
        <p className="text-sm text-gw-stone-400 mb-3">No tasks yet</p>
      ) : (
        <div className="mb-3">
          {/* Active/Backlog group with drag-and-drop */}
          {hasActiveTasks && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gw-stone-400 mb-1.5">Active</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                <SortableContext items={activeTasksFiltered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1">
                    {activeTasksFiltered.map((task) => (
                      <li key={task.id}>
                        <SortableTaskItem id={task.id}>
                          <TaskRow
                            task={task}
                            isExpanded={expandedTaskId === task.id}
                            editingNotes={editingNotes[task.id] ?? ''}
                            onToggleStatus={() => onToggleTask(task.id, task.status)}
                            onClickTitle={() => onToggleTaskExpand(task.id, task.notes)}
                            onDueDateChange={(val) => onDueDateChange(task.id, val)}
                            onEstimateChange={(val) => onEstimateChange(task.id, val)}
                            onNotesChange={(val) => onNotesChange(task.id, val)}
                            onNotesSave={() => onNotesSave(task.id)}
                          />
                        </SortableTaskItem>
                      </li>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Visual separator between active and done groups */}
          {hasActiveTasks && hasDoneTasks && (
            <div className="border-t border-dashed border-gw-stone-200 my-3" />
          )}

          {/* Done group - strikethrough + dimmed */}
          {hasDoneTasks && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gw-stone-300 mb-1.5">Completed</p>
              <ul className="space-y-1">
                {sortedTasks
                  .filter((t) => t.status === 'done')
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isExpanded={expandedTaskId === task.id}
                      editingNotes={editingNotes[task.id] ?? ''}
                      onToggleStatus={() => onToggleTask(task.id, task.status)}
                      onClickTitle={() => onToggleTaskExpand(task.id, task.notes)}
                      onDueDateChange={(val) => onDueDateChange(task.id, val)}
                      onEstimateChange={(val) => onEstimateChange(task.id, val)}
                      onNotesChange={(val) => onNotesChange(task.id, val)}
                      onNotesSave={() => onNotesSave(task.id)}
                    />
                  ))}
              </ul>
            </div>
          )}

          {/* Other statuses (dropped, etc.) */}
          {sortedTasks.some((t) => t.status !== 'backlog' && t.status !== 'active' && t.status !== 'done') && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gw-stone-400 mb-1.5">Other</p>
              <ul className="space-y-1">
                {sortedTasks
                  .filter((t) => t.status !== 'backlog' && t.status !== 'active' && t.status !== 'done')
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isExpanded={expandedTaskId === task.id}
                      editingNotes={editingNotes[task.id] ?? ''}
                      onToggleStatus={() => onToggleTask(task.id, task.status)}
                      onClickTitle={() => onToggleTaskExpand(task.id, task.notes)}
                      onDueDateChange={(val) => onDueDateChange(task.id, val)}
                      onEstimateChange={(val) => onEstimateChange(task.id, val)}
                      onNotesChange={(val) => onNotesChange(task.id, val)}
                      onNotesSave={() => onNotesSave(task.id)}
                    />
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Rapid entry */}
      <form
        onSubmit={(e) => { e.preventDefault(); onAddTask(projectId); }}
        className="flex gap-2"
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
