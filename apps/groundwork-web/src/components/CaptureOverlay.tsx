'use client';

import { useEffect, useState, useRef } from 'react';
import { inbox as inboxApi } from '@/lib/api';

export default function CaptureOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+Shift+I to open capture overlay
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Feature 93: Animate in when opening and auto-focus input
  useEffect(() => {
    if (isOpen) {
      // Trigger animation after mount
      requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
      // Auto-focus the input field
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [isOpen]);

  function handleClose() {
    setIsAnimatingIn(false);
    // Allow animation to complete before unmounting
    setTimeout(() => {
      setIsOpen(false);
      setText('');
    }, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await inboxApi.create({ type: 'text', raw_text: text.trim() });
      setText('');
      // Show confirmation briefly before closing
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        setIsAnimatingIn(false);
        setTimeout(() => {
          setIsOpen(false);
        }, 200);
      }, 800);
    } catch {
      // silently fail for now
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[20vh] transition-all duration-200 ease-out ${
        isAnimatingIn ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture"
    >
      {/* Feature 93: Enhanced backdrop with blur and smooth transition */}
      {/* Feature 140: Proper dialog aria attributes */}
      <div
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          isAnimatingIn
            ? 'bg-black/50 backdrop-blur-md'
            : 'bg-black/0 backdrop-blur-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Confirmation toast */}
      {showConfirmation ? (
        <div
          className={`relative w-full max-w-lg mx-4 bg-gw-green-600 rounded-xl shadow-2xl p-6 text-center transform transition-all duration-300 ease-out ${
            isAnimatingIn ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
          }`}
        >
          <div className="text-white text-2xl mb-1">
            <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">Captured!</p>
        </div>
      ) : (
        /* Feature 93: Capture card with slide-in animation and enhanced shadow */
        <div
          className={`relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-gw-stone-200 overflow-hidden transform transition-all duration-300 ease-out ${
            isAnimatingIn
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-8 opacity-0 scale-95'
          }`}
          style={{
            boxShadow: isAnimatingIn
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              : undefined,
          }}
        >
          <div className="px-4 py-3 border-b border-gw-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gw-stone-700">Quick Capture</h3>
            <kbd className="text-xs text-gw-stone-400 bg-gw-stone-100 px-1.5 py-0.5 rounded">
              Esc
            </kbd>
          </div>
          <form onSubmit={handleSubmit} className="p-4">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Capture a thought..."
              className="w-full px-4 py-3 text-base rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent placeholder:text-gw-stone-400 transition-shadow duration-200"
              autoComplete="off"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Capture'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
