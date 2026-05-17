'use client';

import { useState, useCallback, useEffect } from 'react';
import { weeklyThemeTemplates as templatesApi, weeklyThemeBlocks as blocksApi } from '@/lib/api';
import { DomainData, TemplateData, BlockData, DAY_NAMES } from './types';

export default function WeeklyThemeTemplates({
  domainList,
}: {
  domainList: DomainData[];
}) {
  // Weekly Theme Templates state
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [templateBlocks, setTemplateBlocks] = useState<Record<string, BlockData[]>>({});
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    domain_id: '' as string,
    theme: '',
  });
  const [addingBlockDay, setAddingBlockDay] = useState<number | null>(null);
  const [blockOverlapWarning, setBlockOverlapWarning] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await templatesApi.list();
      setTemplates(data as TemplateData[]);
    } catch {
      // silently fail
    }
  }, []);

  const loadBlocksForTemplate = useCallback(async (templateId: string) => {
    try {
      const data = await blocksApi.list({ template_id: templateId });
      setTemplateBlocks((prev) => ({ ...prev, [templateId]: data as BlockData[] }));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ─── Weekly Theme Template Handlers ───

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    try {
      await templatesApi.create({ name: newTemplateName.trim(), is_active: 0 });
      setNewTemplateName('');
      loadTemplates();
    } catch {
      // silently fail
    }
  }

  async function handleToggleActive(template: TemplateData) {
    try {
      if (template.is_active) {
        // Deactivate this template
        await templatesApi.update(template.id, { is_active: 0 });
      } else {
        // Deactivate all others first, then activate this one
        const activeTemplates = templates.filter((t) => t.is_active);
        await Promise.all(
          activeTemplates.map((t) => templatesApi.update(t.id, { is_active: 0 }))
        );
        await templatesApi.update(template.id, { is_active: 1 });
      }
      loadTemplates();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteTemplate(template: TemplateData) {
    if (template.is_active) return;
    if (!confirm(`Delete template "${template.name}" and all its blocks? This cannot be undone.`)) return;
    try {
      // Delete all blocks for this template first
      const blocks = templateBlocks[template.id] || [];
      await Promise.all(blocks.map((b) => blocksApi.delete(b.id)));
      await templatesApi.delete(template.id);
      if (expandedTemplate === template.id) {
        setExpandedTemplate(null);
      }
      setTemplateBlocks((prev) => {
        const next = { ...prev };
        delete next[template.id];
        return next;
      });
      loadTemplates();
    } catch {
      // silently fail
    }
  }

  async function handleDuplicateTemplate(template: TemplateData) {
    try {
      const newTemplate = await templatesApi.create({
        name: `Copy of ${template.name}`,
        is_active: 0,
      }) as TemplateData;

      // Load blocks for the source template if not already loaded
      let sourceBlocks = templateBlocks[template.id];
      if (!sourceBlocks) {
        const data = await blocksApi.list({ template_id: template.id });
        sourceBlocks = data as BlockData[];
      }

      // Copy all blocks to the new template
      await Promise.all(
        sourceBlocks.map((block) =>
          blocksApi.create({
            template_id: newTemplate.id,
            day_of_week: block.day_of_week,
            start_time: block.start_time,
            end_time: block.end_time,
            domain_id: block.domain_id,
            theme: block.theme,
            sort_order: block.sort_order,
          })
        )
      );

      loadTemplates();
    } catch {
      // silently fail
    }
  }

  function handleExpandTemplate(templateId: string) {
    if (expandedTemplate === templateId) {
      setExpandedTemplate(null);
      setAddingBlockDay(null);
      setEditingBlockId(null);
      setBlockOverlapWarning(null);
    } else {
      setExpandedTemplate(templateId);
      setAddingBlockDay(null);
      setEditingBlockId(null);
      setBlockOverlapWarning(null);
      loadBlocksForTemplate(templateId);
    }
  }

  function getDomainById(id: string | null): DomainData | undefined {
    if (!id) return undefined;
    return domainList.find((d) => d.id === id);
  }

  // Feature 91: Overlap prevention
  function checkOverlap(
    blocks: BlockData[],
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeBlockId?: string
  ): boolean {
    const dayBlocks = blocks.filter(
      (b) => b.day_of_week === dayOfWeek && b.id !== excludeBlockId
    );
    for (const existing of dayBlocks) {
      // Overlap: new_start < existing_end AND new_end > existing_start
      if (startTime < existing.end_time && endTime > existing.start_time) {
        return true;
      }
    }
    return false;
  }

  function resetBlockForm(dayOfWeek?: number) {
    setBlockForm({
      day_of_week: dayOfWeek ?? 1,
      start_time: '09:00',
      end_time: '10:00',
      domain_id: domainList.length > 0 ? domainList[0].id : '',
      theme: '',
    });
    setBlockOverlapWarning(null);
  }

  function startAddingBlock(dayOfWeek: number) {
    setAddingBlockDay(dayOfWeek);
    setEditingBlockId(null);
    resetBlockForm(dayOfWeek);
  }

  function startEditingBlock(block: BlockData) {
    setEditingBlockId(block.id);
    setAddingBlockDay(null);
    setBlockForm({
      day_of_week: block.day_of_week,
      start_time: block.start_time,
      end_time: block.end_time,
      domain_id: block.domain_id || '',
      theme: block.theme || '',
    });
    setBlockOverlapWarning(null);
  }

  async function handleSaveBlock(templateId: string) {
    if (!blockForm.start_time || !blockForm.end_time) return;
    if (blockForm.start_time >= blockForm.end_time) {
      setBlockOverlapWarning('End time must be after start time.');
      return;
    }

    const blocks = templateBlocks[templateId] || [];
    const hasOverlap = checkOverlap(
      blocks,
      blockForm.day_of_week,
      blockForm.start_time,
      blockForm.end_time,
      editingBlockId || undefined
    );

    if (hasOverlap) {
      setBlockOverlapWarning('This block overlaps with an existing block on the same day. Please adjust the times.');
      return;
    }

    try {
      if (editingBlockId) {
        await blocksApi.update(editingBlockId, {
          day_of_week: blockForm.day_of_week,
          start_time: blockForm.start_time,
          end_time: blockForm.end_time,
          domain_id: blockForm.domain_id || null,
          theme: blockForm.theme || null,
        });
        setEditingBlockId(null);
      } else {
        await blocksApi.create({
          template_id: templateId,
          day_of_week: blockForm.day_of_week,
          start_time: blockForm.start_time,
          end_time: blockForm.end_time,
          domain_id: blockForm.domain_id || null,
          theme: blockForm.theme || null,
        });
        setAddingBlockDay(null);
      }
      setBlockOverlapWarning(null);
      loadBlocksForTemplate(templateId);
    } catch {
      // silently fail
    }
  }

  async function handleDeleteBlock(blockId: string, templateId: string) {
    try {
      await blocksApi.delete(blockId);
      loadBlocksForTemplate(templateId);
    } catch {
      // silently fail
    }
  }

  function cancelBlockForm() {
    setAddingBlockDay(null);
    setEditingBlockId(null);
    setBlockOverlapWarning(null);
  }

  // Block form UI (shared between add and edit)
  function renderBlockForm(templateId: string) {
    return (
      <div className="p-3 rounded-lg bg-gw-stone-50 border border-gw-green-300 space-y-3">
        <div className="text-xs font-semibold text-gw-stone-600 mb-1">
          {editingBlockId ? 'Edit Block' : 'New Block'} - {DAY_NAMES[blockForm.day_of_week - 1]}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Start Time</label>
            <input
              type="time"
              value={blockForm.start_time}
              onChange={(e) => {
                setBlockForm((f) => ({ ...f, start_time: e.target.value }));
                setBlockOverlapWarning(null);
              }}
              className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">End Time</label>
            <input
              type="time"
              value={blockForm.end_time}
              onChange={(e) => {
                setBlockForm((f) => ({ ...f, end_time: e.target.value }));
                setBlockOverlapWarning(null);
              }}
              className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Domain</label>
          <select
            value={blockForm.domain_id}
            onChange={(e) => setBlockForm((f) => ({ ...f, domain_id: e.target.value }))}
            className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 bg-white"
          >
            <option value="">No domain</option>
            {domainList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Theme</label>
          <input
            type="text"
            value={blockForm.theme}
            onChange={(e) => setBlockForm((f) => ({ ...f, theme: e.target.value }))}
            placeholder="e.g., Deep Work, Meetings, Admin"
            className="w-full px-2 py-1.5 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
          />
        </div>
        {blockOverlapWarning && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {blockOverlapWarning}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={cancelBlockForm}
            className="px-3 py-1.5 text-xs rounded-lg border border-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-100"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSaveBlock(templateId)}
            className="px-3 py-1.5 text-xs rounded-lg bg-gw-green-600 text-white font-medium hover:bg-gw-green-700"
          >
            {editingBlockId ? 'Update Block' : 'Add Block'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">Weekly Theme Templates</h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        Define recurring weekly schedules with themed time blocks. Only one template can be active at a time.
      </p>

      {/* Template List */}
      {templates.length > 0 && (
        <div className="space-y-3 mb-4">
          {templates.map((template) => {
            const isExpanded = expandedTemplate === template.id;
            const blocks = templateBlocks[template.id] || [];

            return (
              <div
                key={template.id}
                className={`rounded-lg border-2 transition-colors ${
                  template.is_active
                    ? 'border-gw-green-500 bg-gw-green-50/30'
                    : 'border-gw-stone-200 bg-gw-stone-50'
                }`}
              >
                {/* Template Header */}
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => handleExpandTemplate(template.id)}
                    className="text-gw-stone-400 hover:text-gw-stone-600 flex-shrink-0"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>

                  <span className="font-medium text-gw-stone-700 flex-1">{template.name}</span>

                  {template.is_active ? (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gw-green-500 text-white">
                      Active
                    </span>
                  ) : null}

                  <button
                    onClick={() => handleToggleActive(template)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                      template.is_active
                        ? 'bg-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-300'
                        : 'bg-gw-green-600 text-white hover:bg-gw-green-700'
                    }`}
                  >
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="px-3 py-1 text-xs rounded-lg border border-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-100 font-medium"
                  >
                    Duplicate
                  </button>

                  {template.is_active ? (
                    <button
                      disabled
                      className="px-3 py-1 text-xs rounded-lg border border-gw-stone-100 text-gw-stone-300 cursor-not-allowed font-medium"
                      title="Active templates cannot be deleted"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Expanded Block Grid */}
                {isExpanded && (
                  <div className="border-t border-gw-stone-200 p-3 space-y-4">
                    {DAY_NAMES.map((dayName, dayIndex) => {
                      const dayOfWeek = dayIndex + 1; // 1-7
                      const dayBlocks = blocks
                        .filter((b) => b.day_of_week === dayOfWeek)
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));

                      return (
                        <div key={dayName}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gw-stone-700">{dayName}</h4>
                            <button
                              onClick={() => startAddingBlock(dayOfWeek)}
                              className="px-2 py-0.5 text-xs rounded border border-gw-stone-200 text-gw-stone-500 hover:bg-gw-stone-100 hover:text-gw-stone-700"
                            >
                              + Add Block
                            </button>
                          </div>

                          {dayBlocks.length > 0 ? (
                            <div className="space-y-1">
                              {dayBlocks.map((block) => {
                                const domain = getDomainById(block.domain_id);
                                const isEditingThis = editingBlockId === block.id;

                                if (isEditingThis) {
                                  return (
                                    <div key={block.id}>
                                      {renderBlockForm(template.id)}
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={block.id}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg group"
                                    style={{
                                      backgroundColor: domain
                                        ? `${domain.color}18`
                                        : undefined,
                                      borderLeft: domain
                                        ? `3px solid ${domain.color}`
                                        : '3px solid #d6d3d1',
                                    }}
                                  >
                                    <span className="text-xs font-mono text-gw-stone-500 w-24 flex-shrink-0">
                                      {block.start_time} - {block.end_time}
                                    </span>
                                    {domain && (
                                      <span
                                        className="w-3 h-3 rounded-sm flex-shrink-0"
                                        style={{ backgroundColor: domain.color }}
                                      />
                                    )}
                                    <span className="text-xs text-gw-stone-500 flex-shrink-0">
                                      {domain ? domain.name : 'No domain'}
                                    </span>
                                    {block.theme && (
                                      <span className="text-xs font-medium text-gw-stone-700 ml-1">
                                        -- {block.theme}
                                      </span>
                                    )}
                                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => startEditingBlock(block)}
                                        className="px-2 py-0.5 text-xs rounded text-gw-stone-400 hover:text-gw-green-600"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBlock(block.id, template.id)}
                                        className="px-2 py-0.5 text-xs rounded text-gw-stone-400 hover:text-red-500"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gw-stone-400 italic px-3 py-2">
                              No blocks for {dayName}
                            </div>
                          )}

                          {/* Add block form for this day */}
                          {addingBlockDay === dayOfWeek && !editingBlockId && (
                            <div className="mt-2">
                              {renderBlockForm(template.id)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Template */}
      <form onSubmit={handleCreateTemplate} className="flex gap-3 items-end pt-3 border-t border-gw-stone-100">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Template Name</label>
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="e.g., Standard Week, Sprint Week"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={!newTemplateName.trim()}
          className="btn-primary text-sm disabled:opacity-50"
        >
          Add Template
        </button>
      </form>
    </div>
  );
}
