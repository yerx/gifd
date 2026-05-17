import type { ThemeOverride } from './types';

interface CompleteStageProps {
  completionTimestamp: string | null;
  overdueDecisionsSize: number;
  stalledDecisionsSize: number;
  somedayDecisionsSize: number;
  themeOverrides: ThemeOverride[];
  onStartNewReview: () => void;
}

export default function CompleteStage({
  completionTimestamp,
  overdueDecisionsSize,
  stalledDecisionsSize,
  somedayDecisionsSize,
  themeOverrides,
  onStartNewReview,
}: CompleteStageProps) {
  return (
    <div className="card text-center py-12">
      <div className="w-16 h-16 bg-gw-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-gw-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gw-stone-800 mb-2">
        Weekly Review Complete
      </h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        Great work! Your review has been saved.
      </p>

      {completionTimestamp && (
        <p className="text-xs text-gw-stone-400 mb-6">
          Completed at{' '}
          {new Date(completionTimestamp).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {/* Summary of what was done */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto mb-8">
        <div className="p-3 bg-gw-stone-50 rounded-lg">
          <p className="text-lg font-bold text-gw-green-600">{overdueDecisionsSize}</p>
          <p className="text-[10px] text-gw-stone-500">Overdue Triaged</p>
        </div>
        <div className="p-3 bg-gw-stone-50 rounded-lg">
          <p className="text-lg font-bold text-amber-600">{stalledDecisionsSize}</p>
          <p className="text-[10px] text-gw-stone-500">Projects Addressed</p>
        </div>
        <div className="p-3 bg-gw-stone-50 rounded-lg">
          <p className="text-lg font-bold text-gw-accent">{somedayDecisionsSize}</p>
          <p className="text-[10px] text-gw-stone-500">Someday Reviewed</p>
        </div>
        <div className="p-3 bg-gw-stone-50 rounded-lg">
          <p className="text-lg font-bold text-purple-600">
            {themeOverrides.filter((o) => o.dirty).length}
          </p>
          <p className="text-[10px] text-gw-stone-500">Themes Adjusted</p>
        </div>
      </div>

      <button
        onClick={onStartNewReview}
        className="btn-secondary"
      >
        Start New Review
      </button>
    </div>
  );
}
