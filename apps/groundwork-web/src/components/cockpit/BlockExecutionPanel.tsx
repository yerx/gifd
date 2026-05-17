'use client';

import { useState, useEffect, useRef } from 'react';
import type { TimeBlock, Domain, Task } from '@groundwork/shared';
import { formatCountdown } from './helpers';

// ---------------------------------------------------------------------------
// Feature 67: Block Execution Panel
// ---------------------------------------------------------------------------

export function BlockExecutionPanel({
  block,
  domain,
  allTasks,
  taskMap,
  onTaskToggle,
  onInterruption,
  onEndBlock,
  onPullFromBacklog,
  onStartNextBlock,
}: {
  block: TimeBlock;
  domain: Domain | null;
  allTasks: Task[];
  taskMap: Map<string, Task>;
  onTaskToggle: (taskId: string) => void;
  onInterruption: () => void;
  onEndBlock: () => void;
  onPullFromBacklog: () => void;
  onStartNextBlock: () => void;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate remaining seconds
  useEffect(() => {
    function calculateRemaining() {
      const now = new Date();
      const [eh, em] = block.end_time.split(':').map(Number);
      const endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em).getTime();
      const diff = Math.max(0, Math.floor((endMs - now.getTime()) / 1000));
      return diff;
    }

    setRemainingSeconds(calculateRemaining());

    intervalRef.current = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setTimerExpired(true);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [block.end_time]);

  let blockTaskIds: string[] = [];
  try {
    blockTaskIds = JSON.parse(block.task_ids || '[]');
  } catch { /* empty */ }
  const blockTasks = blockTaskIds.map((id) => taskMap.get(id)).filter(Boolean) as Task[];
  const allTasksDone = blockTasks.length > 0 && blockTasks.every((t) => t.status === 'done');
  const borderColor = domain?.color || '#a8a29e';

  return (
    <div className="card mb-4" style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {domain && (
            <span
              className="inline-block px-2 py-0.5 text-xs font-medium rounded"
              style={{ backgroundColor: `${domain.color}20`, color: domain.color }}
            >
              {domain.name}
            </span>
          )}
          {block.theme && (
            <span className="text-sm font-medium text-gw-stone-800">{block.theme}</span>
          )}
        </div>
        <div className={`text-2xl font-mono font-bold ${
          timerExpired ? 'text-red-500 animate-pulse' : remainingSeconds <= 300 ? 'text-amber-500' : 'text-gw-stone-800'
        }`}>
          {formatCountdown(remainingSeconds)}
        </div>
      </div>

      {/* Timer expired notification */}
      {timerExpired && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-red-700">Time block has ended!</span>
          </div>
        </div>
      )}

      {/* Feature 89: All tasks done - show end-of-block options */}
      {allTasksDone && blockTasks.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-gw-green-50 border border-gw-green-200">
          <p className="text-sm font-medium text-gw-green-700 mb-3">All tasks complete! What next?</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onPullFromBacklog}
              className="text-xs px-3 py-1.5 rounded bg-gw-green-600 text-white hover:bg-gw-green-700 font-medium transition-colors"
            >
              Pull from backlog
            </button>
            <button
              onClick={onEndBlock}
              className="text-xs px-3 py-1.5 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors"
            >
              Take a break
            </button>
            <button
              onClick={onStartNextBlock}
              className="text-xs px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
            >
              Start next block early
            </button>
          </div>
        </div>
      )}

      {/* Task checkboxes */}
      {blockTasks.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider">Tasks</p>
          {blockTasks.map((t) => (
            <label key={t.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gw-stone-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={t.status === 'done'}
                onChange={() => onTaskToggle(t.id)}
                className="w-4 h-4 rounded border-gw-stone-300 text-gw-green-500 focus:ring-gw-green-500"
              />
              <span className={`text-sm ${t.status === 'done' ? 'line-through opacity-60 text-gw-stone-500' : 'text-gw-stone-700'}`}>
                {t.title}
              </span>
              {t.estimated_minutes && (
                <span className="text-xs text-gw-stone-400 ml-auto">{t.estimated_minutes}m</span>
              )}
            </label>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-gw-stone-100">
        {/* Feature 68: Interruption button */}
        <button
          onClick={onInterruption}
          className="text-xs px-3 py-1.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Interruption
        </button>
        <button
          onClick={onEndBlock}
          className="text-xs px-3 py-1.5 rounded bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200 font-medium transition-colors ml-auto"
        >
          End Block
        </button>
      </div>
    </div>
  );
}
