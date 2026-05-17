import type { Task } from '@groundwork/shared';

export function TaskRow({ task, variant, actions }: { task: Task; variant: 'completed' | 'uncompleted' | 'due' | 'overdue'; actions?: React.ReactNode }) {
  const colors = {
    completed: { dot: 'bg-gw-green-500', text: 'text-gw-stone-700' },
    uncompleted: { dot: 'bg-red-400', text: 'text-gw-stone-700' },
    due: { dot: 'bg-gw-accent', text: 'text-gw-stone-700' },
    overdue: { dot: 'bg-red-500', text: 'text-gw-stone-800 font-medium' },
  };
  const c = colors[variant];

  return (
    <div className="py-2 px-3 rounded-lg hover:bg-gw-stone-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
        <span className={`flex-1 text-sm ${c.text} ${variant === 'completed' ? 'line-through opacity-60' : ''}`}>
          {task.title}
        </span>
        {task.estimated_minutes && (
          <span className="text-xs text-gw-stone-400">{task.estimated_minutes}m</span>
        )}
        {task.due_date && variant === 'overdue' && (
          <span className="text-xs text-red-500">
            due {task.due_date}
          </span>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-1.5 ml-5">
          {actions}
        </div>
      )}
    </div>
  );
}
