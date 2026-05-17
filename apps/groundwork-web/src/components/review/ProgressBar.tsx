import type { ReviewStage } from './types';
import { STAGES } from './types';

export default function ProgressBar({ current, stages }: { current: ReviewStage; stages: typeof STAGES }) {
  const currentIdx = stages.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {stages.map((stage, i) => {
        const completed = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${
                    completed
                      ? 'bg-gw-green-500 text-white'
                      : active
                        ? 'bg-gw-green-500 text-white ring-4 ring-gw-green-200'
                        : 'bg-gw-stone-200 text-gw-stone-500'
                  }
                `}
              >
                {completed ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  active ? 'text-gw-green-700 font-semibold' : 'text-gw-stone-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={`w-8 lg:w-14 h-0.5 mx-1 transition-all duration-300 ${
                  i < currentIdx ? 'bg-gw-green-500' : 'bg-gw-stone-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
