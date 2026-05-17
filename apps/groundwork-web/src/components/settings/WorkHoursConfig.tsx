'use client';

import { useState, useCallback, useEffect } from 'react';
import { seasonalConfig as seasonalApi } from '@/lib/api';
import { WorkDay, DEFAULT_WORK_HOURS } from './types';

export default function WorkHoursConfig() {
  const [workHours, setWorkHours] = useState<WorkDay[]>(DEFAULT_WORK_HOURS);
  const [bufferPercent, setBufferPercent] = useState(20);
  const [workHoursSaved, setWorkHoursSaved] = useState(false);

  const loadWorkHours = useCallback(async () => {
    try {
      const configs = await seasonalApi.list();
      const workHoursConfig = (configs as Array<{ key: string; value: string }>).find(
        (c) => c.key === 'work_hours'
      );
      if (workHoursConfig) {
        const parsed = JSON.parse(workHoursConfig.value);
        setWorkHours(parsed.days || DEFAULT_WORK_HOURS);
        setBufferPercent(parsed.buffer_percent ?? 20);
      }
    } catch {
      // use defaults
    }
  }, []);

  useEffect(() => {
    loadWorkHours();
  }, [loadWorkHours]);

  function updateWorkDay(index: number, field: keyof WorkDay, value: string | boolean) {
    setWorkHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Index 54: Capacity calculation helper
  function getTotalWeeklyMinutes() {
    return workHours.reduce((total, day) => {
      if (!day.enabled) return total;
      const [sh, sm] = day.start.split(':').map(Number);
      const [eh, em] = day.end.split(':').map(Number);
      return total + (eh * 60 + em) - (sh * 60 + sm);
    }, 0);
  }

  async function saveWorkHours() {
    try {
      const payload = { days: workHours, buffer_percent: bufferPercent };
      const configs = await seasonalApi.list();
      const existing = (configs as Array<{ id: string; key: string }>).find(
        (c) => c.key === 'work_hours'
      );
      if (existing) {
        await seasonalApi.update(existing.id, { value: JSON.stringify(payload) });
      } else {
        await seasonalApi.create({ key: 'work_hours', value: JSON.stringify(payload) });
      }
      setWorkHoursSaved(true);
      setTimeout(() => setWorkHoursSaved(false), 2000);
    } catch {
      // silently fail
    }
  }

  const totalMinutes = getTotalWeeklyMinutes();
  const effectiveMinutes = Math.round(totalMinutes * (1 - bufferPercent / 100));

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gw-stone-800">Work Hours</h2>
        <div className="flex items-center gap-3">
          {workHoursSaved && (
            <span className="text-xs text-gw-green-600 font-medium">Saved!</span>
          )}
          <button
            onClick={saveWorkHours}
            className="px-3 py-1.5 text-xs rounded-lg bg-gw-green-600 text-white font-medium hover:bg-gw-green-700"
          >
            Save Hours
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {workHours.map((day, i) => (
          <div key={day.day} className="flex items-center gap-3 p-2 rounded-lg bg-gw-stone-50">
            <div className="w-24 text-sm font-medium text-gw-stone-700">{day.day}</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  day.enabled ? 'bg-gw-green-500' : 'bg-gw-stone-300'
                }`}
                onClick={() => updateWorkDay(i, 'enabled', !day.enabled)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    day.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>
            {day.enabled ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={day.start}
                  onChange={(e) => updateWorkDay(i, 'start', e.target.value)}
                  className="px-2 py-1 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                />
                <span className="text-xs text-gw-stone-400">to</span>
                <input
                  type="time"
                  value={day.end}
                  onChange={(e) => updateWorkDay(i, 'end', e.target.value)}
                  className="px-2 py-1 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                />
                <span className="text-xs text-gw-stone-400 ml-auto">
                  {(() => {
                    const [sh, sm] = day.start.split(':').map(Number);
                    const [eh, em] = day.end.split(':').map(Number);
                    const mins = (eh * 60 + em) - (sh * 60 + sm);
                    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                  })()}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gw-stone-400 italic">OFF</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-3 border-t border-gw-stone-100">
        <label className="text-sm font-medium text-gw-stone-600">Buffer</label>
        <input
          type="range"
          min={0}
          max={50}
          value={bufferPercent}
          onChange={(e) => setBufferPercent(Number(e.target.value))}
          className="flex-1 accent-gw-green-600"
        />
        <span className="text-sm font-medium text-gw-stone-700 w-12 text-right">
          {bufferPercent}%
        </span>
      </div>

      {/* Index 54: Capacity summary */}
      <div className="mt-4 pt-3 border-t border-gw-stone-100 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gw-stone-600 font-medium">Weekly total:</span>
          <span className="text-gw-stone-800 font-semibold">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gw-stone-600 font-medium">Effective capacity:</span>
          <span className="text-gw-stone-800 font-semibold">
            {Math.floor(effectiveMinutes / 60)}h {effectiveMinutes % 60}m
            <span className="text-gw-stone-400 font-normal ml-1">(after {bufferPercent}% buffer)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
