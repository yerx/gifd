import type { TimeBlock, Domain, Task } from '@groundwork/shared';
import { minutesBetween, formatTime } from './helpers';

export function TimeBlockTimeline({
  blocks,
  domainMap,
  taskMap,
  onBlockClick,
  executingBlockId,
}: {
  blocks: TimeBlock[];
  domainMap: Map<string, Domain>;
  taskMap: Map<string, Task>;
  onBlockClick?: (block: TimeBlock) => void;
  executingBlockId?: string | null;
}) {
  const sorted = [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (sorted.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gw-stone-800 mb-3">Today&apos;s Blocks</h2>
        <p className="text-sm text-gw-stone-400 py-8 text-center">
          No time blocks yet. Add blocks in the &ldquo;Build Your Day&rdquo; step.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">Today&apos;s Blocks</h2>
      <div className="relative space-y-0">
        {sorted.map((block, i) => {
          const domain = block.domain_id ? domainMap.get(block.domain_id) : null;
          const borderColor = domain?.color || '#a8a29e';
          const duration = minutesBetween(block.start_time, block.end_time);
          let blockTaskIds: string[] = [];
          try {
            blockTaskIds = JSON.parse(block.task_ids || '[]');
          } catch { /* empty */ }
          const blockTasks = blockTaskIds.map((id) => taskMap.get(id)).filter(Boolean) as Task[];
          const isExecuting = executingBlockId === block.id;

          return (
            <div key={block.id} className="flex gap-4">
              {/* Time column */}
              <div className="w-20 flex-shrink-0 text-right pt-3">
                <span className="text-xs font-medium text-gw-stone-500">{formatTime(block.start_time)}</span>
                {i === sorted.length - 1 && (
                  <div className="text-xs text-gw-stone-400 mt-1">{formatTime(block.end_time)}</div>
                )}
              </div>
              {/* Block card */}
              <div className="flex-1 mb-3">
                <div
                  className={`rounded-lg border p-3 bg-white cursor-pointer transition-all ${
                    isExecuting
                      ? 'border-gw-green-400 ring-2 ring-gw-green-200 shadow-md'
                      : 'border-gw-stone-200 hover:border-gw-stone-300 hover:shadow-sm'
                  }`}
                  style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
                  onClick={() => onBlockClick?.(block)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
                      {isExecuting && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gw-green-100 text-gw-green-700 font-medium animate-pulse">
                          Active
                        </span>
                      )}
                      <span className="text-xs text-gw-stone-400">{duration}m</span>
                    </div>
                  </div>
                  {blockTasks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {blockTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs text-gw-stone-600">
                          <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-gw-green-500' : 'bg-gw-stone-300'}`} />
                          <span className={t.status === 'done' ? 'line-through opacity-60' : ''}>{t.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
