'use client';

import { TaskTagBadges } from '@/components/TagComponents';
import { TaskData } from './types';

export interface TaskRowProps {
  task: TaskData;
  isExpanded: boolean;
  editingNotes: string;
  onToggleStatus: () => void;
  onClickTitle: () => void;
  onDueDateChange: (value: string) => void;
  onEstimateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onNotesSave: () => void;
}

export default function TaskRow({
  task,
  isExpanded,
  editingNotes,
  onToggleStatus,
  onClickTitle,
  onDueDateChange,
  onEstimateChange,
  onNotesChange,
  onNotesSave,
}: TaskRowProps) {
  const isDone = task.status === 'done';

  return (
    <div className={isDone ? 'opacity-60' : ''}>
      <div className="flex items-center gap-3 group">
        {/* Checkbox - Feature 75: filled green when done */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isDone
              ? 'bg-gw-green-500 border-gw-green-500'
              : 'border-gw-stone-300 hover:border-gw-green-400'
          }`}
        >
          {isDone && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>

        {/* Task title (clickable to expand notes) - Feature 75: line-through + opacity for done */}
        <button
          onClick={(e) => { e.stopPropagation(); onClickTitle(); }}
          className={`text-sm text-left flex-1 hover:underline ${
            isDone ? 'line-through text-gw-stone-400' : 'text-gw-stone-700'
          }`}
        >
          {task.title}
        </button>

        {/* Feature 105: Tag badges on list view */}
        <TaskTagBadges taskId={task.id} />

        {/* Inline due date */}
        <input
          type="date"
          value={task.due_date ?? ''}
          onChange={(e) => onDueDateChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs px-1.5 py-0.5 rounded border border-gw-stone-200 text-gw-stone-500 bg-transparent w-[110px] opacity-60 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
          title="Due date"
        />

        {/* Inline estimated minutes */}
        <input
          type="number"
          value={task.estimated_minutes ?? ''}
          onChange={(e) => onEstimateChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="min"
          min={0}
          className="text-xs px-1.5 py-0.5 rounded border border-gw-stone-200 text-gw-stone-500 bg-transparent w-[60px] opacity-60 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-gw-green-500 placeholder:text-gw-stone-300"
          title="Estimated minutes"
        />
      </div>

      {/* Expandable notes section */}
      {isExpanded && (
        <div className="ml-8 mt-2 mb-2">
          <textarea
            value={editingNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            onBlur={onNotesSave}
            onClick={(e) => e.stopPropagation()}
            placeholder="Add notes..."
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gw-stone-200 text-gw-stone-600 placeholder:text-gw-stone-300 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent resize-y"
          />
          <div className="flex justify-end mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onNotesSave(); }}
              className="text-xs px-2 py-1 bg-gw-green-600 text-white rounded font-medium hover:bg-gw-green-700 transition-colors"
            >
              Save notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
