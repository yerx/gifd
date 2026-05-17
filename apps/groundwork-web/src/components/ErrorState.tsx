'use client';

/**
 * Feature 144: Reusable error state component for pages and sections.
 * Displays a user-friendly error message with optional retry action.
 */

interface ErrorStateProps {
  /** Page title to show above the error */
  title?: string;
  /** Error message to display */
  message?: string;
  /** Callback to retry the failed operation */
  onRetry?: () => void;
  /** Whether to render in a full-page layout or inline */
  fullPage?: boolean;
}

export default function ErrorState({
  title,
  message = 'Something went wrong. Please try again.',
  onRetry,
  fullPage = true,
}: ErrorStateProps) {
  const content = (
    <div className="error-card" role="alert">
      <div className="mb-3">
        <svg
          className="w-10 h-10 mx-auto text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="error-retry-btn"
          aria-label="Retry loading"
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Try Again
          </span>
        </button>
      )}
    </div>
  );

  if (!fullPage) {
    return content;
  }

  return (
    <div className="p-8 max-w-5xl">
      {title && (
        <h1 className="text-2xl font-bold text-gw-stone-900 mb-4">{title}</h1>
      )}
      {content}
    </div>
  );
}

/**
 * Feature 144: Error boundary wrapper for client components.
 * Catches render errors and shows a fallback UI.
 */

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={this.props.fallbackTitle}
          message={this.state.error?.message || 'An unexpected error occurred.'}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
