import { parseTimeEstimate, parseDueDate, formatDueDateLabel } from './nlpParsers';

interface NlpChipsProps {
  itemText: string;
}

export default function NlpChips({ itemText }: NlpChipsProps) {
  const estimate = parseTimeEstimate(itemText);
  const due = parseDueDate(itemText);

  if (!estimate && !due) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {estimate && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ~{estimate}min
        </span>
      )}
      {due && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {formatDueDateLabel(due)}
        </span>
      )}
    </div>
  );
}
