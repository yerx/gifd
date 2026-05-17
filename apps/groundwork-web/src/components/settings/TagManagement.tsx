'use client';

import { useState, useCallback, useEffect } from 'react';
import { tags as tagsApi } from '@/lib/api';
import { TagData } from './types';

export default function TagManagement() {
  const [tagList, setTagList] = useState<TagData[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const loadTags = useCallback(async () => {
    try {
      const data = await tagsApi.list();
      setTagList(data as TagData[]);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await tagsApi.create({
        name: newTagName.trim(),
        color: newTagColor,
        sort_order: tagList.length + 1,
      });
      setNewTagName('');
      setNewTagColor('#3B82F6');
      loadTags();
    } catch {
      // silently fail
    }
  }

  function startEditingTag(tag: TagData) {
    setEditingTag(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color || '#3B82F6');
  }

  async function saveTagEdit(id: string) {
    try {
      await tagsApi.update(id, {
        name: editTagName.trim(),
        color: editTagColor,
      });
      setEditingTag(null);
      loadTags();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteTag(id: string) {
    if (!confirm('Delete this tag? It will be removed from all tasks.')) return;
    try {
      await tagsApi.delete(id);
      loadTags();
    } catch {
      // silently fail
    }
  }

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">Tags</h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        Create and manage tags to organize tasks across all projects and domains.
      </p>

      {tagList.length > 0 && (
        <ul className="space-y-2 mb-4">
          {tagList.map((tag) => (
            <li key={tag.id}>
              {editingTag === tag.id ? (
                <div className="p-3 rounded-lg bg-gw-stone-50 border border-gw-green-300 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editTagColor}
                      onChange={(e) => setEditTagColor(e.target.value)}
                      className="w-8 h-8 rounded border border-gw-stone-200 cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={editTagName}
                      onChange={(e) => setEditTagName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') saveTagEdit(tag.id); }}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingTag(null)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveTagEdit(tag.id)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gw-green-600 text-white font-medium hover:bg-gw-green-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gw-stone-50 group">
                  <span
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: tag.color || '#9CA3AF' }}
                  />
                  <span className="font-medium text-gw-stone-700 flex-1">{tag.name}</span>
                  <button
                    onClick={() => startEditingTag(tag)}
                    className="text-xs text-gw-stone-400 hover:text-gw-green-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-xs text-gw-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddTag} className="flex gap-3 items-end pt-3 border-t border-gw-stone-100">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Name</label>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="e.g., urgent, blocked, frontend"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Color</label>
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gw-stone-200 cursor-pointer"
          />
        </div>
        <button
          type="submit"
          disabled={!newTagName.trim()}
          className="btn-primary text-sm disabled:opacity-50"
        >
          Add Tag
        </button>
      </form>
    </div>
  );
}
