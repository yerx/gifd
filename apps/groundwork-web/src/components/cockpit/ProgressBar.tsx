export function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const completed = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            {/* Circle */}
            <div
              className={`
                relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${completed
                  ? 'bg-gw-green-500 text-white'
                  : active
                    ? 'bg-gw-green-500 text-white ring-4 ring-gw-green-200 animate-pulse'
                    : 'bg-gw-stone-200 text-gw-stone-500'}
              `}
            >
              {completed ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            {/* Connector line */}
            {step < total && (
              <div
                className={`w-12 h-1 transition-all duration-300 ${
                  step < current ? 'bg-gw-green-500' : 'bg-gw-stone-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
