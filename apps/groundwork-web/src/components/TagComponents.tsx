'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { tags as tagsApi, taskTags as taskTagsApi } from '@/lib/api';

/* ─── Types ─── */

interface TagData {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

interface TaskTagData {
  id: string;
  task_id: string;
  tag_id: string;
}

/* ─── Tag Badge ─── */
// Renders a single small colored tag badge. Used on task cards in list/kanban views.

export function TagBadge({ tag }: { tag: TagData }) {
  return (
    <span
      className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: tag.color ? `${tag.color}20` : '#e7e5e4',
        color: tag.color || '#78716c',
        border: `1px solid ${tag.color ? `${tag.color}40` : '#d6d3d1'}`,
      }}
    >
      {tag.name}
    </span>
  );
}

/* ─── Tag Badges Row ─── */
// Fetches and displays tag badges for a given task. Used in task cards.

export function TaskTagBadges({ taskId }: { taskId: string }) {
  const [tagList, setTagList] = useState<TagData[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function load() {
      try {
        const [allTags, taskTagLinks] = await Promise.all([
          tagsApi.list(),
          taskTagsApi.list({ task_id: taskId }),
        ]);
        const tagMap = new Map((allTags as TagData[]).map((t) => [t.id, t]));
        const matched = (taskTagLinks as TaskTagData[])
          .map((tt) => tagMap.get(tt.tag_id))
          .filter(Boolean) as TagData[];
        setTagList(matched);
      } catch {
        // silently fail
      }
    }
    load();
  }, [taskId]);

  if (tagList.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tagList.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </div>
  );
}

/* ─── Tag Picker ─── */
// Dropdown picker for adding/removing tags from a task. Used in TaskDetailModal.

interface TagPickerProps {
  taskId: string;
  onChanged?: () => void;
}

export function TagPicker({ taskId, onChanged }: TagPickerProps) {
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [appliedTagIds, setAppliedTagIds] = useState<Set<string>>(new Set());
  const [taskTagMap, setTaskTagMap] = useState<Map<string, string>>(new Map()); // tag_id -> task_tag.id
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [tags, taskTagLinks] = await Promise.all([
        tagsApi.list(),
        taskTagsApi.list({ task_id: taskId }),
      ]);
      setAllTags(tags as TagData[]);
      const applied = new Set((taskTagLinks as TaskTagData[]).map((tt) => tt.tag_id));
      setAppliedTagIds(applied);
      const map = new Map<string, string>();
      (taskTagLinks as TaskTagData[]).forEach((tt) => map.set(tt.tag_id, tt.id));
      setTaskTagMap(map);
    } catch {
      // silently fail
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  async function toggleTag(tagId: string) {
    if (appliedTagIds.has(tagId)) {
      // Remove
      const taskTagId = taskTagMap.get(tagId);
      if (taskTagId) {
        try {
          await taskTagsApi.delete(taskTagId);
          await loadData();
          onChanged?.();
        } catch {
          // silently fail
        }
      }
    } else {
      // Add
      try {
        await taskTagsApi.create({ task_id: taskId, tag_id: tagId });
        await loadData();
        onChanged?.();
      } catch {
        // silently fail
      }
    }
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;

    // Generate a random color
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    try {
      const newTag = await tagsApi.create({ name: newTagName.trim(), color });
      setNewTagName('');
      // Auto-apply the new tag
      await taskTagsApi.create({ task_id: taskId, tag_id: (newTag as TagData).id });
      await loadData();
      onChanged?.();
    } catch {
      // silently fail
    }
  }

  const appliedTags = allTags.filter((t) => appliedTagIds.has(t.id));

  return (
    <div ref={dropdownRef}>
      <label className="block text-xs font-medium text-gw-stone-500 mb-1">Tags</label>

      {/* Applied tags display */}
      <div className="flex items-center gap-1 flex-wrap mb-2">
        {appliedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer group"
            style={{
              backgroundColor: tag.color ? `${tag.color}20` : '#e7e5e4',
              color: tag.color || '#78716c',
              border: `1px solid ${tag.color ? `${tag.color}40` : '#d6d3d1'}`,
            }}
            onClick={() => toggleTag(tag.id)}
            title="Click to remove"
          >
            {tag.name}
            <svg className="w-3 h-3 opacity-50 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-gw-stone-300 text-gw-stone-400 hover:border-gw-green-400 hover:text-gw-green-600 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add tag
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-lg border border-gw-stone-200 py-1 mt-1 max-h-48 overflow-y-auto">
          {allTags.length > 0 ? (
            <div className="space-y-0.5">
              {allTags.map((tag) => {
                const isApplied = appliedTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                      isApplied ? 'bg-gw-green-50' : 'hover:bg-gw-stone-50'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: tag.color || '#9CA3AF' }}
                    />
                    <span className="flex-1 font-medium text-gw-stone-700">{tag.name}</span>
                    {isApplied && (
                      <svg className="w-3.5 h-3.5 text-gw-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-gw-stone-400 italic">No tags yet</div>
          )}

          {/* Create new tag inline */}
          <div className="border-t border-gw-stone-100 mt-1 pt-1 px-2">
            <form onSubmit={handleCreateTag} className="flex items-center gap-1">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag..."
                className="flex-1 px-2 py-1 text-xs rounded border border-gw-stone-200 focus:outline-none focus:ring-1 focus:ring-gw-green-500 placeholder:text-gw-stone-300"
              />
              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="text-xs px-2 py-1 bg-gw-green-600 text-white rounded font-medium disabled:opacity-40"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tag Filter Bar ─── */
// Used in the projects page toolbar to filter tasks across all domains by tag.
// Supports AND logic: tasks must have ALL selected tags.

interface TagFilterBarProps {
  selectedTagIds: string[];
  onTagsChanged: (tagIds: string[]) => void;
}

export function TagFilterBar({ selectedTagIds, onTagsChanged }: TagFilterBarProps) {
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await tagsApi.list();
        setAllTags(data as TagData[]);
      } catch {
        // silently fail
      }
    }
    load();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onTagsChanged(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChanged([...selectedTagIds, tagId]);
    }
  }

  if (allTags.length === 0) return null;

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
          selectedTagIds.length > 0
            ? 'border-gw-green-300 bg-gw-green-50 text-gw-green-700'
            : 'border-gw-stone-200 text-gw-stone-500 hover:border-gw-stone-300'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
        {selectedTagIds.length > 0 ? (
          <span>
            {selectedTags.map((t) => t.name).join(' + ')}
          </span>
        ) : (
          <span>Filter by tag</span>
        )}
        {selectedTagIds.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onTagsChanged([]); }}
            className="ml-1 hover:text-red-500"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gw-stone-200 py-1 z-20 min-w-[180px] max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gw-stone-400 border-b border-gw-stone-100">
            Select tags (AND logic)
          </div>
          {allTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isSelected ? 'bg-gw-green-50' : 'hover:bg-gw-stone-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: tag.color || '#9CA3AF' }}
                />
                <span className="flex-1 font-medium text-gw-stone-700">{tag.name}</span>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-gw-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
