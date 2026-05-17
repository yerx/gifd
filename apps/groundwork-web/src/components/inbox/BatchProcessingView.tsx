import type { InboxItemData } from './types';
import { groupItemsByType } from './nlpParsers';
import NlpChips from './NlpChips';

interface BatchProcessingViewProps {
  items: InboxItemData[];
  selectedBatchIds: Set<string>;
  actionLoading: boolean;
  toggleBatchSelect: (id: string) => void;
  selectAllBatch: () => void;
  deselectAllBatch: () => void;
  handleBatchDelete: () => void;
  handleBatchReference: () => void;
  handleBatchItemDelete: (id: string) => void;
  handleBatchItemReference: (id: string) => void;
  stopProcessing: () => void;
}

export default function BatchProcessingView({
  items,
  selectedBatchIds,
  actionLoading,
  toggleBatchSelect,
  selectAllBatch,
  deselectAllBatch,
  handleBatchDelete,
  handleBatchReference,
  handleBatchItemDelete,
  handleBatchItemReference,
  stopProcessing,
}: BatchProcessingViewProps) {
  const groups = groupItemsByType(items);
  const selectedCount = selectedBatchIds.size;

  return (
    <div className="mb-8">
      {/* Batch header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gw-stone-800">Batch Processing</h2>
          <span className="text-sm text-gw-stone-500">
            {items.length} item{items.length !== 1 ? 's' : ''} grouped by type
          </span>
        </div>
        <button
          onClick={stopProcessing}
          className="text-sm text-gw-stone-500 hover:text-gw-stone-700 transition-colors"
        >
          Exit Batch
        </button>
      </div>

      {/* Bulk actions bar */}
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={selectedCount === items.length ? deselectAllBatch : selectAllBatch}
            className="text-xs px-2 py-1 rounded border border-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-50 transition-colors font-medium"
          >
            {selectedCount === items.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-gw-stone-400">
            {selectedCount} selected
          </span>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleBatchReference}
              disabled={actionLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-gw-stone-200 text-gw-stone-700 font-medium hover:bg-gw-stone-300 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
              </svg>
              Archive Selected
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={actionLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Grouped items */}
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.type}>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-gw-stone-100 text-gw-stone-600 uppercase">
                {group.type}
              </span>
              <span className="text-xs text-gw-stone-400">
                {group.items.length} item{group.items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {group.items.map((item) => {
                const itemText = item.raw_text || item.quick_note || '(no text)';
                const isSelected = selectedBatchIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`card flex items-start gap-3 transition-colors ${
                      isSelected ? 'border-gw-green-300 bg-gw-green-50/30' : ''
                    }`}
                  >
                    {/* Multi-select checkbox */}
                    <label className="flex-shrink-0 mt-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBatchSelect(item.id)}
                        className="w-4 h-4 rounded border-gw-stone-300 text-gw-green-600 focus:ring-gw-green-500"
                      />
                    </label>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gw-stone-400">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gw-stone-800 text-sm">
                        {itemText}
                      </p>
                      {/* Feature 77 & 78: NLP chips in batch view */}
                      <NlpChips itemText={itemText} />
                    </div>

                    {/* Inline quick-actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleBatchItemReference(item.id)}
                        className="p-1.5 rounded text-gw-stone-400 hover:text-gw-stone-600 hover:bg-gw-stone-100 transition-colors"
                        title="Archive as reference"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleBatchItemDelete(item.id)}
                        className="p-1.5 rounded text-gw-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
