import type { Domain } from '@groundwork/shared';
import PieChart from './PieChart';
import StageNavButtons from './StageNavButtons';

interface HorizonCheckStageProps {
  domainTimeMinutes: Map<string, number>;
  domainMap: Map<string, Domain>;
  goBack: () => void;
  goNext: () => void;
}

export default function HorizonCheckStage({
  domainTimeMinutes,
  domainMap,
  goBack,
  goNext,
}: HorizonCheckStageProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">
        Horizon Check -- Domain Balance
      </h2>
      <p className="text-sm text-gw-stone-500 mb-6">
        How your time was distributed across domains over the past 7 days
      </p>

      {domainTimeMinutes.size === 0 ? (
        <p className="text-sm text-gw-stone-400 py-8 text-center">
          No time block data available for this period.
        </p>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Pie Chart */}
          <div className="flex-shrink-0">
            <PieChart
              data={Array.from(domainTimeMinutes.entries()).map(([domainId, mins]) => {
                const domain = domainMap.get(domainId);
                return {
                  label: domain?.name || 'Unassigned',
                  value: mins,
                  color: domain?.color || '#a8a29e',
                };
              })}
            />
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {Array.from(domainTimeMinutes.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([domainId, mins]) => {
                const domain = domainMap.get(domainId);
                const totalMins = Array.from(domainTimeMinutes.values()).reduce(
                  (s, v) => s + v,
                  0
                );
                const pct = totalMins > 0 ? Math.round((mins / totalMins) * 100) : 0;
                const hours = Math.floor(mins / 60);
                const remMins = mins % 60;

                return (
                  <div key={domainId} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: domain?.color || '#a8a29e' }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gw-stone-700">
                          {domain?.name || 'Unassigned'}
                        </span>
                        <span className="text-sm text-gw-stone-500">
                          {hours > 0 ? `${hours}h ` : ''}
                          {remMins}m ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gw-stone-100 rounded-full h-1.5 mt-1">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: domain?.color || '#a8a29e',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <StageNavButtons showBack onBack={goBack} onNext={goNext} />
    </div>
  );
}
