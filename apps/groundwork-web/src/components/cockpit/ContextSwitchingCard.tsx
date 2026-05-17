import type { TimeBlock, Domain, Task, Project } from '@groundwork/shared';

// ---------------------------------------------------------------------------
// Feature 66: Context Switching Card
// ---------------------------------------------------------------------------

export function ContextSwitchingCard({
  block,
  domain,
  tasks: domainTasks,
  project,
}: {
  block: TimeBlock;
  domain: Domain | null;
  tasks: Task[];
  project: Project | null;
}) {
  if (!domain) return null;

  return (
    <div className="card mb-4 border-l-4" style={{ borderLeftColor: domain.color }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: domain.color }}>
          {domain.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gw-stone-800">Switching to: {domain.name}</h3>
          {block.theme && <p className="text-xs text-gw-stone-500">Theme: {block.theme}</p>}
        </div>
      </div>

      {project && (
        <div className="mb-3 p-2 rounded bg-gw-stone-50">
          <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider mb-1">Active Project</p>
          <p className="text-sm font-medium text-gw-stone-800">{project.name}</p>
          {project.last_context_note && (
            <p className="text-xs text-gw-stone-500 mt-1 italic">&ldquo;{project.last_context_note}&rdquo;</p>
          )}
        </div>
      )}

      {domainTasks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gw-stone-500 uppercase tracking-wider mb-2">Recent Tasks</p>
          <div className="space-y-1">
            {domainTasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-gw-stone-600">
                <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-gw-green-500' : 'bg-gw-stone-300'}`} />
                <span className={t.status === 'done' ? 'line-through opacity-60' : ''}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
