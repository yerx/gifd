import type { InboxItemData } from './types';
import NlpChips from './NlpChips';

interface InboxCardProps {
  item: InboxItemData;
  onDelete: (id: string) => void;
}

export default function InboxCard({ item, onDelete }: InboxCardProps) {
  const itemText = item.raw_text || item.quick_note || '(no text)';
  return (
    <div className="card flex items-start gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gw-stone-100 text-gw-stone-600 uppercase">
            {item.type}
          </span>
          <span className="text-xs text-gw-stone-400">
            {new Date(item.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-gw-stone-800">
          {itemText}
        </p>
        {/* Feature 77 & 78: NLP chips in list view */}
        <NlpChips itemText={itemText} />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="text-gw-stone-400 hover:text-red-500 transition-colors p-1"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
