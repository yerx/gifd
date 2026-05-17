import type { Project, Domain } from '@groundwork/shared';
import type { SomedayDecision } from './types';
import StageNavButtons from './StageNavButtons';

interface SomedayScanStageProps {
  somedayProjects: Project[];
  somedayDecisions: Map<string, SomedayDecision>;
  setSomedayDecisions: React.Dispatch<React.SetStateAction<Map<string, SomedayDecision>>>;
  domainMap: Map<string, Domain>;
  applySomedayDecisions: () => Promise<void>;
  goBack: () => void;
  goNext: () => void;
}

export default function SomedayScanStage({
  somedayProjects,
  somedayDecisions,
  setSomedayDecisions,
  domainMap,
  applySomedayDecisions,
  goBack,
  goNext,
}: SomedayScanStageProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">
        Someday/Maybe Scan
      </h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        Review deferred projects -- promote, keep, or archive
      </p>

      {somedayProjects.length === 0 ? (
        <p className="text-sm text-gw-stone-400 py-8 text-center">
          No someday/maybe projects to review.
        </p>
      ) : (
        <div className="space-y-3">
          {somedayProjects.map((project) => {
            const domain = domainMap.get(project.domain_id);
            const decision = somedayDecisions.get(project.id);

            return (
              <div
                key={project.id}
                className="border border-gw-stone-200 rounded-lg p-4 hover:border-gw-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {domain && (
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-medium rounded"
                        style={{
                          backgroundColor: `${domain.color}20`,
                          color: domain.color,
                        }}
                      >
                        {domain.name}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gw-stone-800">
                      {project.name}
                    </span>
                  </div>
                  {project.last_context_note && (
                    <span className="text-xs text-gw-stone-400 italic max-w-[200px] truncate">
                      {project.last_context_note}
                    </span>
                  )}
                </div>

                {project.description && (
                  <p className="text-xs text-gw-stone-500 mb-3">{project.description}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSomedayDecisions((prev) => {
                        const next = new Map(prev);
                        next.set(project.id, { action: 'keep' });
                        return next;
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      decision?.action === 'keep'
                        ? 'bg-gw-stone-200 border-gw-stone-400 text-gw-stone-700'
                        : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
                    }`}
                  >
                    Keep
                  </button>
                  <button
                    onClick={() =>
                      setSomedayDecisions((prev) => {
                        const next = new Map(prev);
                        next.set(project.id, { action: 'promote' });
                        return next;
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      decision?.action === 'promote'
                        ? 'bg-gw-green-100 border-gw-green-300 text-gw-green-700'
                        : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
                    }`}
                  >
                    Promote to Active
                  </button>
                  <button
                    onClick={() =>
                      setSomedayDecisions((prev) => {
                        const next = new Map(prev);
                        next.set(project.id, { action: 'archive' });
                        return next;
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      decision?.action === 'archive'
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
                    }`}
                  >
                    Archive
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StageNavButtons
        showBack
        onBack={goBack}
        onNext={async () => {
          await applySomedayDecisions();
          goNext();
        }}
        nextLabel={
          somedayDecisions.size > 0 ? 'Apply & Continue' : 'Next'
        }
      />
    </div>
  );
}
