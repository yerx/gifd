'use client';

import { useState } from 'react';
import { timeBlocks as timeBlocksApi } from '@/lib/api';
import type { Domain } from '@groundwork/shared';

export function AddTimeBlockForm({
  planId,
  domains: domainList,
  onCreated,
}: {
  planId: string;
  domains: Domain[];
  onCreated: () => void;
}) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [domainId, setDomainId] = useState('');
  const [theme, setTheme] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await timeBlocksApi.create({
        daily_plan_id: planId,
        domain_id: domainId || null,
        start_time: startTime,
        end_time: endTime,
        theme: theme || null,
      });
      setTheme('');
      onCreated();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gw-stone-50 rounded-lg p-4 border border-gw-stone-100">
      <p className="text-sm font-medium text-gw-stone-700 mb-3">Add a time block</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gw-stone-500 mb-1">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gw-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gw-green-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gw-stone-500 mb-1">End</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gw-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gw-green-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gw-stone-500 mb-1">Domain</label>
          <select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gw-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gw-green-500 bg-white"
          >
            <option value="">None</option>
            {domainList.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gw-stone-500 mb-1">Theme</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Deep Work"
            className="w-full px-3 py-2 rounded-lg border border-gw-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gw-green-500"
          />
        </div>
      </div>
      <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-50">
        {submitting ? 'Adding...' : 'Add Block'}
      </button>
    </form>
  );
}
