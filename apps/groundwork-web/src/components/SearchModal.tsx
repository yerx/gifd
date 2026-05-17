'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { search as searchApi, domains as domainsApi, type SearchResult } from '@/lib/api';

interface DomainData {
  id: string;
  name: string;
  color: string;
}

const TYPE_LABELS: Record<string, string> = {
  task: 'Task',
  project: 'Project',
  inbox: 'Inbox',
  material: 'Material',
};

const TYPE_COLORS: Record<string, string> = {
  task: 'bg-blue-100 text-blue-700',
  project: 'bg-gw-green-100 text-gw-green-700',
  inbox: 'bg-yellow-100 text-yellow-700',
  material: 'bg-purple-100 text-purple-700',
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [domainMap, setDomainMap] = useState<Record<string, DomainData>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  // Load domains for color badges
  useEffect(() => {
    if (!isOpen) return;
    async function loadDomains() {
      try {
        const data = await domainsApi.list();
        const map: Record<string, DomainData> = {};
        (data as DomainData[]).forEach((d) => { map[d.id] = d; });
        setDomainMap(map);
      } catch {
        // silently fail
      }
    }
    loadDomains();
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setElapsedMs(0);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchApi.query({ q, limit: 20 });
      setResults(data.results);
      setElapsedMs(data.elapsed_ms);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 150);
  }

  // Navigate to result
  function navigateToResult(result: SearchResult) {
    onClose();
    switch (result.type) {
      case 'task':
        if (result.project_id) {
          router.push(`/projects`);
        }
        break;
      case 'project':
        if (result.domain_id) {
          router.push(`/projects?domain=${result.domain_id}`);
        } else {
          router.push('/projects');
        }
        break;
      case 'inbox':
        router.push('/inbox');
        break;
      case 'material':
        router.push('/projects');
        break;
    }
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateToResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  if (!isOpen) return null;

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gw-stone-200">
          <svg className="w-5 h-5 text-gw-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, inbox..."
            className="flex-1 text-sm text-gw-stone-800 placeholder:text-gw-stone-400 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-gw-green-500 border-t-transparent rounded-full animate-spin" />
          )}
          <kbd className="text-xs text-gw-stone-400 bg-gw-stone-100 px-1.5 py-0.5 rounded">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() && results.length === 0 && !isSearching ? (
            <div className="px-4 py-8 text-center text-sm text-gw-stone-400">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gw-stone-400 bg-gw-stone-50 border-b border-gw-stone-100">
                  {TYPE_LABELS[type] || type}s ({items.length})
                </div>
                {items.map((result) => {
                  const itemIndex = flatIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  const domain = result.domain_id ? domainMap[result.domain_id] : null;

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => navigateToResult(result)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                        isSelected ? 'bg-gw-green-50' : 'hover:bg-gw-stone-50'
                      }`}
                    >
                      {/* Domain color dot */}
                      {domain ? (
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: domain.color }}
                          title={domain.name}
                        />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-gw-stone-300" />
                      )}

                      {/* Title and snippet */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gw-stone-800 truncate">
                          {result.title}
                        </p>
                        {result.snippet && result.snippet !== result.title && (
                          <p
                            className="text-xs text-gw-stone-400 truncate mt-0.5"
                            dangerouslySetInnerHTML={{ __html: result.snippet }}
                          />
                        )}
                      </div>

                      {/* Type badge */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[result.type]}`}>
                        {TYPE_LABELS[result.type]}
                      </span>

                      {/* Status */}
                      {result.status && (
                        <span className="text-[10px] text-gw-stone-400 flex-shrink-0">
                          {result.status}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-gw-stone-100 flex items-center justify-between text-[10px] text-gw-stone-400">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <span>{elapsedMs}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}
