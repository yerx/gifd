'use client';

/**
 * Feature 143: Reusable loading skeleton for page-level loading states.
 * Provides consistent skeleton UI across all pages while data is being fetched.
 */

interface PageSkeletonProps {
  /** Page title shown above the skeleton cards */
  title?: string;
  /** Number of skeleton cards to render (default 3) */
  cardCount?: number;
  /** Whether to show a subtitle skeleton below the title */
  showSubtitle?: boolean;
}

export default function PageSkeleton({
  title,
  cardCount = 3,
  showSubtitle = true,
}: PageSkeletonProps) {
  return (
    <div className="p-8 max-w-5xl" role="status" aria-label="Loading page content">
      {/* Title area */}
      <div className="mb-8">
        {title ? (
          <h1 className="text-2xl font-bold text-gw-stone-900">{title}</h1>
        ) : (
          <div className="skeleton-heading w-48" />
        )}
        {showSubtitle && (
          <div className="skeleton-text-sm w-64 mt-2" />
        )}
      </div>

      {/* Skeleton cards */}
      <div className="space-y-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="skeleton w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <div className="skeleton-text w-3/4 mb-2" />
                <div className="skeleton-text-sm w-1/2" />
              </div>
            </div>
            <div className="skeleton-text w-full mb-2" />
            <div className="skeleton-text w-5/6" />
          </div>
        ))}
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading, please wait...</span>
    </div>
  );
}

/**
 * Feature 143: Inline skeleton for smaller loading areas within a page.
 */
export function InlineSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-text"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Feature 143: Loading spinner component for quick loading states.
 */
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12" role="status" aria-label={message}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-gw-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gw-stone-500">{message}</span>
      </div>
    </div>
  );
}
