import type { Task, Domain } from '@groundwork/shared';
import { dateLabel } from './helpers';
import HorizontalBarChart from './HorizontalBarChart';
import StageNavButtons from './StageNavButtons';

interface DigestStageProps {
  totalCompleted: number;
  overdueCount: number;
  stalledCount: number;
  inboxCount: number;
  completedByDomain: Map<string, number>;
  domainList: Domain[];
  upcomingDeadlines: Task[];
  getTaskDomain: (task: Task) => Domain | undefined;
  goBack: () => void;
  goNext: () => void;
}

export default function DigestStage({
  totalCompleted,
  overdueCount,
  stalledCount,
  inboxCount,
  completedByDomain,
  domainList,
  upcomingDeadlines,
  getTaskDomain,
  goBack,
  goNext,
}: DigestStageProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">Review Digest</h2>
      <p className="text-sm text-gw-stone-500 mb-6">
        Your week at a glance -- past 7 days
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-gw-stone-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gw-green-600">{totalCompleted}</p>
          <p className="text-xs text-gw-stone-500 mt-1">Tasks Completed</p>
        </div>
        <div className="p-4 bg-gw-stone-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-500">{overdueCount}</p>
          <p className="text-xs text-gw-stone-500 mt-1">Overdue</p>
        </div>
        <div className="p-4 bg-gw-stone-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-amber-500">{stalledCount}</p>
          <p className="text-xs text-gw-stone-500 mt-1">Stalled Projects</p>
        </div>
        <div className="p-4 bg-gw-stone-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gw-accent">{inboxCount}</p>
          <p className="text-xs text-gw-stone-500 mt-1">Inbox Backlog</p>
        </div>
      </div>

      {/* Completed tasks per domain - horizontal bar chart */}
      {totalCompleted > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gw-stone-700 mb-3">
            Completed Tasks by Domain
          </h3>
          <HorizontalBarChart
            data={domainList
              .map((d) => ({
                label: d.name,
                value: completedByDomain.get(d.id) || 0,
                color: d.color,
              }))
              .filter((d) => d.value > 0)
              .sort((a, b) => b.value - a.value)}
          />
        </div>
      )}

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gw-stone-700 mb-3">
            Upcoming Deadlines (next 7 days)
          </h3>
          <div className="space-y-1">
            {upcomingDeadlines
              .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
              .map((t) => {
                const domain = getTaskDomain(t);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gw-stone-50"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: domain?.color || '#a8a29e' }}
                    />
                    <span className="flex-1 text-sm text-gw-stone-700">{t.title}</span>
                    <span className="text-xs text-gw-stone-500">
                      {t.due_date ? dateLabel(t.due_date) : ''}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <StageNavButtons showBack={false} onBack={goBack} onNext={goNext} />
    </div>
  );
}
