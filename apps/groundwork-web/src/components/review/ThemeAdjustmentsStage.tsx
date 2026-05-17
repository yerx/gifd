import type { Domain } from '@groundwork/shared';
import type { ThemeOverride } from './types';
import { dayName, formatTime } from './helpers';
import StageNavButtons from './StageNavButtons';

interface ThemeAdjustmentsStageProps {
  themeOverrides: ThemeOverride[];
  domainMap: Map<string, Domain>;
  domainList: Domain[];
  saving: boolean;
  updateThemeOverride: (
    blockId: string,
    updates: Partial<Pick<ThemeOverride, 'domain_id' | 'theme' | 'start_time' | 'end_time'>>
  ) => void;
  completeReview: () => Promise<void>;
  goBack: () => void;
}

export default function ThemeAdjustmentsStage({
  themeOverrides,
  domainMap,
  domainList,
  saving,
  updateThemeOverride,
  completeReview,
  goBack,
}: ThemeAdjustmentsStageProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">
        Next Week Theme Adjustments
      </h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        Adjust the weekly theme blocks for the coming week. Changes are saved as overrides and do not modify the base template.
      </p>

      {themeOverrides.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gw-stone-400">
            No active weekly theme template found.
          </p>
          <p className="text-xs text-gw-stone-400 mt-1">
            Create a template in Settings to use this feature.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
            const dayBlocks = themeOverrides
              .filter((o) => o.day_of_week === dow)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));

            if (dayBlocks.length === 0) return null;

            return (
              <div key={dow}>
                <h3 className="text-sm font-semibold text-gw-stone-700 mb-2">
                  {dayName(dow)}
                </h3>
                <div className="space-y-2">
                  {dayBlocks.map((block) => {
                    const domain = block.domain_id
                      ? domainMap.get(block.domain_id)
                      : null;

                    return (
                      <div
                        key={block.blockId}
                        className={`border rounded-lg p-3 transition-colors ${
                          block.dirty
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gw-stone-200'
                        }`}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: domain?.color || '#a8a29e',
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                          {/* Time range */}
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={block.start_time}
                              onChange={(e) =>
                                updateThemeOverride(block.blockId, {
                                  start_time: e.target.value,
                                })
                              }
                              className="px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                            />
                            <span className="text-xs text-gw-stone-400">to</span>
                            <input
                              type="time"
                              value={block.end_time}
                              onChange={(e) =>
                                updateThemeOverride(block.blockId, {
                                  end_time: e.target.value,
                                })
                              }
                              className="px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                            />
                          </div>

                          {/* Domain selector */}
                          <select
                            value={block.domain_id || ''}
                            onChange={(e) =>
                              updateThemeOverride(block.blockId, {
                                domain_id: e.target.value || null,
                              })
                            }
                            className="px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                          >
                            <option value="">No domain</option>
                            {domainList.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>

                          {/* Theme */}
                          <input
                            type="text"
                            value={block.theme || ''}
                            placeholder="Theme label..."
                            onChange={(e) =>
                              updateThemeOverride(block.blockId, {
                                theme: e.target.value || null,
                              })
                            }
                            className="px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                          />

                          {/* Duration */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gw-stone-400">
                              {formatTime(block.start_time)} - {formatTime(block.end_time)}
                            </span>
                            {block.dirty && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">
                                modified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StageNavButtons
        showBack
        onBack={goBack}
        onNext={completeReview}
        nextLabel={saving ? 'Saving...' : 'Complete Review'}
        nextDisabled={saving}
      />
    </div>
  );
}
