'use client';

import { useEffect, useState, useRef } from 'react';
import { TagPicker } from '@/components/TagComponents';
import { TaskData } from './types';

interface TaskDetailModalProps {
  task: TaskData;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<TaskData>) => Promise<void>;
}

export default function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [estimate, setEstimate] = useState(task.estimated_minutes?.toString() ?? '');
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [status, setStatus] = useState(task.status);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on clicking backdrop
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function saveField(field: string, value: string | number | null) {
    await onUpdate(task.id, { [field]: value } as Partial<TaskData>);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gw-stone-800">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gw-stone-400 hover:text-gw-stone-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title !== task.title) saveField('title', title); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveField('notes', notes || null)}
            placeholder="Add notes..."
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent resize-y placeholder:text-gw-stone-300"
          />
        </div>

        {/* Estimate + Due Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Estimate (minutes)</label>
            <input
              type="number"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              onBlur={() => saveField('estimated_minutes', estimate ? parseInt(estimate, 10) : null)}
              min={0}
              placeholder="0"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent placeholder:text-gw-stone-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => { setDueDate(e.target.value); saveField('due_date', e.target.value || null); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); saveField('status', e.target.value); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 bg-white"
          >
            <option value="backlog">Backlog</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Tags (Feature 104) */}
        <TagPicker taskId={task.id} />

        {/* Close button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gw-stone-100 text-gw-stone-600 rounded-lg font-medium hover:bg-gw-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
