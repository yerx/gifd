'use client';

import { useState, useCallback, useEffect } from 'react';
import { dataManagement } from '@/lib/api';

export default function DataManagementSection() {
  // Feature 147: Database size display
  const [dbSize, setDbSize] = useState<string>('');

  // Feature 148: JSON export
  const [exporting, setExporting] = useState(false);

  // Feature 149: Purge soft-deleted items
  const [purgeCount, setPurgeCount] = useState<number | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<number | null>(null);

  // Feature 147: Load database size
  const loadDbSize = useCallback(async () => {
    try {
      const data = await dataManagement.getDbSize();
      setDbSize(data.size_formatted);
    } catch {
      // silently fail
    }
  }, []);

  // Feature 149: Load purge preview count
  const loadPurgePreview = useCallback(async () => {
    try {
      const data = await dataManagement.purgePreview();
      setPurgeCount(data.count);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadDbSize();
    loadPurgePreview();
  }, [loadDbSize, loadPurgePreview]);

  // ─── Feature 148: JSON Export Handler ───

  async function handleExportJson() {
    setExporting(true);
    try {
      await dataManagement.exportJson();
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  }

  // ─── Feature 149: Purge Soft-Deleted Items Handler ───

  async function handlePurge() {
    setPurging(true);
    try {
      const result = await dataManagement.purge();
      setPurgeResult(result.total_purged);
      setShowPurgeConfirm(false);
      loadPurgePreview();
      loadDbSize();
      setTimeout(() => setPurgeResult(null), 4000);
    } catch {
      // silently fail
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-3">Data Management</h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        All data is stored locally on your device. No cloud, no telemetry.
      </p>

      {/* Feature 147: Database size display */}
      {dbSize && (
        <div className="p-3 rounded-lg bg-gw-stone-50 border border-gw-stone-200 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gw-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
              <span className="text-sm font-medium text-gw-stone-600">Database size</span>
            </div>
            <span className="text-sm font-semibold text-gw-stone-800">{dbSize}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 items-start">
        {/* Feature 148: Export JSON */}
        <button
          onClick={handleExportJson}
          disabled={exporting}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export JSON'}
        </button>

        {/* Feature 149: Purge Deleted Items */}
        <div className="relative">
          <button
            onClick={() => { setShowPurgeConfirm(true); loadPurgePreview(); }}
            className="btn-secondary text-sm text-red-600 hover:text-red-700"
          >
            Purge Deleted Items (90+ days)
          </button>
          {purgeCount !== null && purgeCount > 0 && !showPurgeConfirm && (
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-600">
              {purgeCount}
            </span>
          )}
        </div>
      </div>

      {/* Feature 149: Purge result message */}
      {purgeResult !== null && (
        <div className="mt-3 p-3 rounded-lg bg-gw-green-50 border border-gw-green-200">
          <p className="text-sm text-gw-green-700 font-medium">
            {purgeResult === 0
              ? 'No items to purge. Everything is clean!'
              : `Successfully purged ${purgeResult} deleted item${purgeResult === 1 ? '' : 's'}.`}
          </p>
        </div>
      )}

      {/* Feature 149: Purge confirmation dialog */}
      {showPurgeConfirm && (
        <div className="mt-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Confirm permanent deletion</h3>
          <p className="text-sm text-red-600 mb-3">
            {purgeCount !== null && purgeCount > 0
              ? `This will permanently delete ${purgeCount} item${purgeCount === 1 ? '' : 's'} that ${purgeCount === 1 ? 'was' : 'were'} soft-deleted more than 90 days ago. This action cannot be undone.`
              : 'No items found that were deleted more than 90 days ago.'}
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowPurgeConfirm(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-100 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePurge}
              disabled={purging || (purgeCount !== null && purgeCount === 0)}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {purging ? 'Purging...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
