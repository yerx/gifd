import type { Project, Domain } from '@groundwork/shared';
import type { StalledDecision } from './types';
import { daysAgo } from './helpers';
import StageNavButtons from './StageNavButtons';

interface StalledProjectsStageProps {
  stalledProjects: Project[];
  stalledDecisions: Map<string, StalledDecision>;
  setStalledDecisions: React.Dispatch<React.SetStateAction<Map<string, StalledDecision>>>;
  stalledNotes: Map<string, string>;
  setStalledNotes: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  stalledFollowups: Map<string, string>;
  setStalledFollowups: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  domainMap: Map<string, Domain>;
  applyStalledDecisions: () => Promise<void>;
  goBack: () => void;
  goNext: () => void;
}

export default function StalledProjectsStage({
  stalledProjects,
  stalledDecisions,
  setStalledDecisions,
  stalledNotes,
  setStalledNotes,
  stalledFollowups,
  setStalledFollowups,
  domainMap,
  applyStalledDecisions,
  goBack,
  goNext,
}: StalledProjectsStageProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">Stalled Projects</h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        Active projects with no activity in the past 7 days
      </p>

      {stalledProjects.length === 0 ? (
        <p className="text-sm text-gw-stone-400 py-8 text-center">
          No stalled projects detected -- all active projects have recent activity.
        </p>
      ) : (
        <div className="space-y-4">
          {stalledProjects.map((project) => {
            const domain = domainMap.get(project.domain_id);
            const decision = stalledDecisions.get(project.id);
            const noteValue = stalledNotes.get(project.id) || '';
            const followupValue = stalledFollowups.get(project.id) || '';
            const stale = daysAgo(project.last_touched_at);

            return (
              <div
                key={project.id}
                className="border border-gw-stone-200 rounded-lg p-4 hover:border-gw-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
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
                  <span className="text-xs text-amber-600">
                    {stale === Infinity ? 'Never touched' : `${stale} days stale`}
                  </span>
                </div>

                {project.last_context_note && (
                  <p className="text-xs text-gw-stone-500 mb-3 italic">
                    Last note: {project.last_context_note}
                  </p>
                )}

                {/* Decision buttons */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={() =>
                      setStalledDecisions((prev) => {
                        const next = new Map(prev);
                        next.set(project.id, { action: 'acknowledge' });
                        return next;
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      decision?.action === 'acknowledge'
                        ? 'bg-gw-green-100 border-gw-green-300 text-gw-green-700'
                        : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
                    }`}
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() =>
                      setStalledDecisions((prev) => {
                        const next = new Map(prev);
                        next.set(project.id, { action: 'pause' });
                        return next;
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      decision?.action === 'pause'
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
                    }`}
                  >
                    Pause (Someday)
                  </button>
                  <button
                    onClick={() =>
                      setStalledDecisions((prev) => {
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
                  <button
                    onClick={() =>
                      setStalledDecisions((prev) => {
                        const next = new Map(prev);
                        next.set(project.id, { action: 'note' });
                        return next;
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      decision?.action === 'note'
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
                    }`}
                  >
                    Add Note
                  </button>
                  <button
                    onClick={() =>
                      setStalledDecisions((prev) => {
                        const next = new Map(prev);
                        next.set(project.id, { action: 'followup' });
                        return next;
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      decision?.action === 'followup'
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'border-gw-stone-200 text-gw-stone-600 hover:border-gw-stone-300'
                    }`}
                  >
                    Create Follow-up
                  </button>
                </div>

                {/* Contextual inputs */}
                {decision?.action === 'note' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Add context note..."
                      value={noteValue}
                      onChange={(e) =>
                        setStalledNotes((prev) => {
                          const next = new Map(prev);
                          next.set(project.id, e.target.value);
                          return next;
                        })
                      }
                      onBlur={() => {
                        if (noteValue) {
                          setStalledDecisions((prev) => {
                            const next = new Map(prev);
                            next.set(project.id, { action: 'note', note: noteValue });
                            return next;
                          });
                        }
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
                    />
                  </div>
                )}

                {decision?.action === 'followup' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Follow-up task title..."
                      value={followupValue}
                      onChange={(e) =>
                        setStalledFollowups((prev) => {
                          const next = new Map(prev);
                          next.set(project.id, e.target.value);
                          return next;
                        })
                      }
                      onBlur={() => {
                        if (followupValue) {
                          setStalledDecisions((prev) => {
                            const next = new Map(prev);
                            next.set(project.id, {
                              action: 'followup',
                              followupTitle: followupValue,
                            });
                            return next;
                          });
                        }
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <StageNavButtons
        showBack
        onBack={goBack}
        onNext={async () => {
          await applyStalledDecisions();
          goNext();
        }}
        nextLabel={
          stalledDecisions.size > 0 ? `Apply & Continue` : 'Next'
        }
      />
    </div>
  );
}
