export default function StageNavButtons({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  disabledReason,
  showBack,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  disabledReason?: string;
  showBack: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gw-stone-100">
      {showBack ? (
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-3">
        {nextDisabled && disabledReason && (
          <span className="text-xs text-red-500">{disabledReason}</span>
        )}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {nextLabel || 'Next'}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
