'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Features 111, 113, 114: Recurrence Picker Component
// Supports DAILY, WEEKLY (with day selection), and MONTHLY (with day-of-month)
// ---------------------------------------------------------------------------

type RecurrencePreset = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

interface RecurrencePickerProps {
  value: string | null;
  onChange: (rrule: string | null) => void;
}

const WEEKDAY_LABELS = [
  { code: 'MO', label: 'Mon' },
  { code: 'TU', label: 'Tue' },
  { code: 'WE', label: 'Wed' },
  { code: 'TH', label: 'Thu' },
  { code: 'FR', label: 'Fri' },
  { code: 'SA', label: 'Sat' },
  { code: 'SU', label: 'Sun' },
];

function parsePresetFromRRule(rrule: string | null): RecurrencePreset {
  if (!rrule) return 'none';
  const upper = rrule.toUpperCase();

  if (upper === 'FREQ=DAILY') return 'daily';
  if (upper === 'FREQ=WEEKLY') return 'weekly';
  if (/^FREQ=WEEKLY;BYDAY=/.test(upper)) return 'weekly';
  if (/^FREQ=MONTHLY/.test(upper)) return 'monthly';

  return 'custom';
}

function parseSelectedDays(rrule: string | null): string[] {
  if (!rrule) return [];
  const match = rrule.toUpperCase().match(/BYDAY=([A-Z,]+)/);
  if (!match) return [];
  return match[1].split(',').filter(Boolean);
}

function parseMonthDay(rrule: string | null): number {
  if (!rrule) return 1;
  const match = rrule.toUpperCase().match(/BYMONTHDAY=(\d+)/);
  if (!match) return 1;
  return parseInt(match[1], 10);
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [preset, setPreset] = useState<RecurrencePreset>(() => parsePresetFromRRule(value));
  const [selectedDays, setSelectedDays] = useState<string[]>(() => parseSelectedDays(value));
  const [monthDay, setMonthDay] = useState<number>(() => parseMonthDay(value));
  const [customRule, setCustomRule] = useState<string>(value || '');

  // Sync state when external value changes
  useEffect(() => {
    setPreset(parsePresetFromRRule(value));
    setSelectedDays(parseSelectedDays(value));
    setMonthDay(parseMonthDay(value));
    setCustomRule(value || '');
  }, [value]);

  function buildRRule(p: RecurrencePreset, days: string[], mDay: number, custom: string): string | null {
    switch (p) {
      case 'none':
        return null;
      case 'daily':
        return 'FREQ=DAILY';
      case 'weekly':
        if (days.length > 0) {
          return `FREQ=WEEKLY;BYDAY=${days.join(',')}`;
        }
        return 'FREQ=WEEKLY';
      case 'monthly':
        return `FREQ=MONTHLY;BYMONTHDAY=${mDay}`;
      case 'custom':
        return custom || null;
    }
  }

  function handlePresetChange(newPreset: RecurrencePreset) {
    setPreset(newPreset);
    const newDays = newPreset === 'weekly' ? selectedDays : [];
    const newMonthDay = newPreset === 'monthly' ? monthDay : 1;
    onChange(buildRRule(newPreset, newDays, newMonthDay, customRule));
  }

  function toggleDay(dayCode: string) {
    const newDays = selectedDays.includes(dayCode)
      ? selectedDays.filter((d) => d !== dayCode)
      : [...selectedDays, dayCode];
    setSelectedDays(newDays);
    onChange(buildRRule(preset, newDays, monthDay, customRule));
  }

  function handleMonthDayChange(day: number) {
    setMonthDay(day);
    onChange(buildRRule(preset, selectedDays, day, customRule));
  }

  function handleCustomChange(rule: string) {
    setCustomRule(rule);
    onChange(rule || null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gw-stone-600">
        Recurrence
      </label>

      {/* Preset selector */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'none' as RecurrencePreset, label: 'None' },
          { key: 'daily' as RecurrencePreset, label: 'Daily' },
          { key: 'weekly' as RecurrencePreset, label: 'Weekly' },
          { key: 'monthly' as RecurrencePreset, label: 'Monthly' },
          { key: 'custom' as RecurrencePreset, label: 'Custom' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePresetChange(key)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              preset === key
                ? 'bg-gw-green-600 text-white'
                : 'bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Weekly day picker */}
      {preset === 'weekly' && (
        <div className="space-y-2">
          <span className="text-xs text-gw-stone-500">Repeat on:</span>
          <div className="flex gap-1.5">
            {WEEKDAY_LABELS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleDay(code)}
                className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                  selectedDays.includes(code)
                    ? 'bg-gw-green-600 text-white'
                    : 'bg-gw-stone-100 text-gw-stone-600 hover:bg-gw-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly day picker */}
      {preset === 'monthly' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gw-stone-500">Day of month:</span>
          <input
            type="number"
            min={1}
            max={31}
            value={monthDay}
            onChange={(e) => handleMonthDayChange(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1.5 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
          />
        </div>
      )}

      {/* Custom RRULE input */}
      {preset === 'custom' && (
        <div>
          <input
            type="text"
            value={customRule}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="e.g., FREQ=WEEKLY;BYDAY=MO,WE,FR"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 font-mono"
          />
          <p className="text-xs text-gw-stone-400 mt-1">
            Enter an RRULE string (FREQ=DAILY, FREQ=WEEKLY;BYDAY=..., FREQ=MONTHLY;BYMONTHDAY=...)
          </p>
        </div>
      )}

      {/* Current rule display */}
      {value && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gw-green-50 text-gw-green-700 border border-gw-green-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {formatRRuleLabel(value)}
          </span>
          <button
            type="button"
            onClick={() => {
              setPreset('none');
              onChange(null);
            }}
            className="text-xs text-gw-stone-400 hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature 112: Recurrence Badge (display-only component for task lists)
// ---------------------------------------------------------------------------

interface RecurrenceBadgeProps {
  recurrenceRule: string | null;
}

export function RecurrenceBadge({ recurrenceRule }: RecurrenceBadgeProps) {
  if (!recurrenceRule) return null;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-gw-green-50 text-gw-green-700 border border-gw-green-200" title={recurrenceRule}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {formatRRuleLabel(recurrenceRule)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helper: Format RRULE as a human-readable label
// ---------------------------------------------------------------------------

function formatRRuleLabel(rrule: string): string {
  const upper = rrule.toUpperCase();
  const parts: Record<string, string> = {};
  for (const segment of upper.split(';')) {
    const [key, val] = segment.split('=');
    if (key && val) parts[key] = val;
  }

  const freq = parts['FREQ'];
  if (!freq) return rrule;

  if (freq === 'DAILY') {
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    return interval > 1 ? `Every ${interval} days` : 'Daily';
  }

  if (freq === 'WEEKLY') {
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    const byDay = parts['BYDAY'];
    const prefix = interval > 1 ? `Every ${interval} weeks` : 'Weekly';

    if (byDay) {
      const dayNameMap: Record<string, string> = {
        MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
      };
      const dayNames = byDay.split(',').map((d) => dayNameMap[d.trim()] || d).join(', ');
      return `${prefix} on ${dayNames}`;
    }
    return prefix;
  }

  if (freq === 'MONTHLY') {
    const interval = parseInt(parts['INTERVAL'] || '1', 10);
    const byMonthDay = parts['BYMONTHDAY'];
    const prefix = interval > 1 ? `Every ${interval} months` : 'Monthly';

    if (byMonthDay) {
      return `${prefix} on day ${byMonthDay}`;
    }
    return prefix;
  }

  return rrule;
}
