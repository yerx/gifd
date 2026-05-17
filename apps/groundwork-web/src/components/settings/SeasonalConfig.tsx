'use client';

import { useState, useCallback, useEffect } from 'react';
import { seasonalConfig as seasonalApi } from '@/lib/api';
import { YearOverride, PLANTING_ZONES, SEASONAL_KEY_LABELS } from './types';

export default function SeasonalConfig() {
  // Feature 118/119: Seasonal Configuration state
  const [plantingZone, setPlantingZone] = useState('');
  const [lastFrostDate, setLastFrostDate] = useState('');
  const [firstFrostDate, setFirstFrostDate] = useState('');
  const [seasonalSaved, setSeasonalSaved] = useState(false);
  const [seasonalConfigIds, setSeasonalConfigIds] = useState<Record<string, string>>({});

  const [yearOverrides, setYearOverrides] = useState<YearOverride[]>([]);
  const [addingOverrideYear, setAddingOverrideYear] = useState<number>(new Date().getFullYear());
  const [addingOverrideKey, setAddingOverrideKey] = useState<string>('last_frost_date');
  const [addingOverrideValue, setAddingOverrideValue] = useState('');
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);
  const [editingOverrideValue, setEditingOverrideValue] = useState('');

  // Feature 118/119: Load seasonal configuration
  const loadSeasonalConfig = useCallback(async () => {
    try {
      const configs = await seasonalApi.list();
      const allConfigs = configs as Array<{ id: string; key: string; value: string; year: number | null }>;

      // Load defaults (year = null)
      const ids: Record<string, string> = {};
      for (const cfg of allConfigs) {
        if (cfg.year === null) {
          ids[cfg.key] = cfg.id;
          switch (cfg.key) {
            case 'planting_zone':
              setPlantingZone(cfg.value);
              break;
            case 'last_frost_date':
              setLastFrostDate(cfg.value);
              break;
            case 'first_frost_date':
              setFirstFrostDate(cfg.value);
              break;
          }
        }
      }
      setSeasonalConfigIds(ids);

      // Load year overrides
      const overrides = allConfigs
        .filter((c) => c.year !== null && ['planting_zone', 'last_frost_date', 'first_frost_date'].includes(c.key))
        .map((c) => ({ id: c.id, year: c.year as number, key: c.key, value: c.value }));
      setYearOverrides(overrides);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadSeasonalConfig();
  }, [loadSeasonalConfig]);

  // ─── Feature 118: Save Seasonal Configuration ───

  async function saveSeasonalConfig() {
    try {
      const entries = [
        { key: 'planting_zone', value: plantingZone },
        { key: 'last_frost_date', value: lastFrostDate },
        { key: 'first_frost_date', value: firstFrostDate },
      ];

      for (const entry of entries) {
        if (!entry.value) continue;
        const existingId = seasonalConfigIds[entry.key];
        if (existingId) {
          await seasonalApi.update(existingId, { value: entry.value });
        } else {
          await seasonalApi.create({ key: entry.key, value: entry.value });
        }
      }

      setSeasonalSaved(true);
      setTimeout(() => setSeasonalSaved(false), 2000);
      loadSeasonalConfig();
    } catch {
      // silently fail
    }
  }

  // ─── Feature 119: Year Override Handlers ───

  async function handleAddYearOverride() {
    if (!addingOverrideValue.trim()) return;
    try {
      await seasonalApi.create({
        key: addingOverrideKey,
        value: addingOverrideValue.trim(),
        year: addingOverrideYear,
      });
      setAddingOverrideValue('');
      setShowAddOverride(false);
      loadSeasonalConfig();
    } catch {
      // silently fail
    }
  }

  async function handleSaveOverrideEdit(overrideId: string) {
    if (!editingOverrideValue.trim()) return;
    try {
      await seasonalApi.update(overrideId, { value: editingOverrideValue.trim() });
      setEditingOverrideId(null);
      setEditingOverrideValue('');
      loadSeasonalConfig();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteOverride(overrideId: string) {
    try {
      await seasonalApi.delete(overrideId);
      loadSeasonalConfig();
    } catch {
      // silently fail
    }
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gw-stone-800">Seasonal Configuration</h2>
          <p className="text-sm text-gw-stone-500 mt-1">
            Set your planting zone and frost dates for seasonal task planning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {seasonalSaved && (
            <span className="text-xs text-gw-green-600 font-medium">Saved!</span>
          )}
          <button
            onClick={saveSeasonalConfig}
            className="px-3 py-1.5 text-xs rounded-lg bg-gw-green-600 text-white font-medium hover:bg-gw-green-700"
          >
            Save
          </button>
        </div>
      </div>

      {/* Default values */}
      <div className="space-y-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">USDA Planting Zone</label>
          <select
            value={plantingZone}
            onChange={(e) => setPlantingZone(e.target.value)}
            className="w-48 px-3 py-2 text-sm rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
          >
            <option value="">Select zone...</option>
            {PLANTING_ZONES.map((z) => (
              <option key={z} value={z}>Zone {z}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Last Frost Date (Spring)</label>
            <input
              type="date"
              value={lastFrostDate}
              onChange={(e) => setLastFrostDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gw-stone-400 mt-1">Average date of last spring frost</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">First Frost Date (Fall)</label>
            <input
              type="date"
              value={firstFrostDate}
              onChange={(e) => setFirstFrostDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gw-stone-400 mt-1">Average date of first fall frost</p>
          </div>
        </div>
      </div>

      {/* Feature 119: Year Overrides */}
      <div className="pt-4 border-t border-gw-stone-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gw-stone-700">Year-Specific Overrides</h3>
          <button
            onClick={() => setShowAddOverride(!showAddOverride)}
            className="px-2 py-1 text-xs rounded border border-gw-stone-200 text-gw-stone-500 hover:bg-gw-stone-100 hover:text-gw-stone-700 font-medium"
          >
            {showAddOverride ? 'Cancel' : '+ Add Override'}
          </button>
        </div>
        <p className="text-xs text-gw-stone-400 mb-3">
          Override default frost dates for specific years. Year-specific entries take precedence over defaults.
        </p>

        {/* Add override form */}
        {showAddOverride && (
          <div className="p-3 rounded-lg bg-gw-stone-50 border border-gw-green-300 space-y-3 mb-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gw-stone-500 mb-1">Year</label>
                <input
                  type="number"
                  value={addingOverrideYear}
                  onChange={(e) => setAddingOverrideYear(parseInt(e.target.value) || new Date().getFullYear())}
                  min={2000}
                  max={2100}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gw-stone-500 mb-1">Setting</label>
                <select
                  value={addingOverrideKey}
                  onChange={(e) => setAddingOverrideKey(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                >
                  <option value="last_frost_date">Last Frost Date</option>
                  <option value="first_frost_date">First Frost Date</option>
                  <option value="planting_zone">Planting Zone</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gw-stone-500 mb-1">Value</label>
                {addingOverrideKey === 'planting_zone' ? (
                  <select
                    value={addingOverrideValue}
                    onChange={(e) => setAddingOverrideValue(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                  >
                    <option value="">Select...</option>
                    {PLANTING_ZONES.map((z) => (
                      <option key={z} value={z}>Zone {z}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    value={addingOverrideValue}
                    onChange={(e) => setAddingOverrideValue(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddOverride(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddYearOverride}
                disabled={!addingOverrideValue.trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-gw-green-600 text-white font-medium hover:bg-gw-green-700 disabled:opacity-50"
              >
                Add Override
              </button>
            </div>
          </div>
        )}

        {/* Overrides list */}
        {yearOverrides.length > 0 ? (
          <div className="space-y-2">
            {yearOverrides
              .sort((a, b) => a.year - b.year || a.key.localeCompare(b.key))
              .map((override) => (
                <div
                  key={override.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gw-stone-50 group"
                >
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gw-stone-200 text-gw-stone-700">
                    {override.year}
                  </span>
                  <span className="text-xs text-gw-stone-500 w-28">
                    {SEASONAL_KEY_LABELS[override.key] || override.key}
                  </span>

                  {editingOverrideId === override.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      {override.key === 'planting_zone' ? (
                        <select
                          value={editingOverrideValue}
                          onChange={(e) => setEditingOverrideValue(e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-gw-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                        >
                          {PLANTING_ZONES.map((z) => (
                            <option key={z} value={z}>Zone {z}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="date"
                          value={editingOverrideValue}
                          onChange={(e) => setEditingOverrideValue(e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                        />
                      )}
                      <button
                        onClick={() => handleSaveOverrideEdit(override.id)}
                        className="px-2 py-0.5 text-xs rounded bg-gw-green-600 text-white hover:bg-gw-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingOverrideId(null); setEditingOverrideValue(''); }}
                        className="px-2 py-0.5 text-xs rounded text-gw-stone-400 hover:text-gw-stone-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gw-stone-700 flex-1">
                        {override.value}
                      </span>
                      <button
                        onClick={() => { setEditingOverrideId(override.id); setEditingOverrideValue(override.value); }}
                        className="text-xs text-gw-stone-400 hover:text-gw-green-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteOverride(override.id)}
                        className="text-xs text-gw-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-gw-stone-400 italic">No year-specific overrides configured.</p>
        )}
      </div>
    </div>
  );
}
