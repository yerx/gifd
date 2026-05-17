'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  inbox as inboxApi,
  domains as domainsApi,
  projects as projectsApi,
  tasks as tasksApi,
  materials as materialsApi,
} from '@/lib/api';
import ErrorState from '@/components/ErrorState';

import {
  BatchProcessingView,
  ProcessingFlow,
  InboxCard,
  parseTimeEstimate,
  parseDueDate,
  getFirstSentence,
} from '@/components/inbox';

import type {
  InboxItemData,
  MaterialData,
  DomainData,
  ProjectData,
  ProcessingAction,
} from '@/components/inbox';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InboxPage() {
  const [items, setItems] = useState<InboxItemData[]>([]);
  const [captureText, setCaptureText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAction, setCurrentAction] = useState<ProcessingAction>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Feature 76: Batch mode state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  // Domain/Project picker state
  const [domainsList, setDomainsList] = useState<DomainData[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectData[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [dueDate, setDueDate] = useState<string>('');

  // Feature 115/117: Voice processing state
  const [editingTranscription, setEditingTranscription] = useState('');

  // Feature 116: Photo processing state - material search
  const [materialSearchResults, setMaterialSearchResults] = useState<MaterialData[]>([]);
  const [materialSearchLoading, setMaterialSearchLoading] = useState(false);

  // Do It Now timer state
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadItems() {
    try {
      setLoadError(null);
      const data = await inboxApi.list({ unprocessed: 'true' });
      setItems(data as InboxItemData[]);
    } catch {
      setLoadError('Unable to load inbox items. The API may be unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  // Load domains when entering processing mode or when action requires it
  async function loadDomains() {
    try {
      const data = await domainsApi.list();
      setDomainsList(data as DomainData[]);
    } catch {
      // silently fail
    }
  }

  // Load projects for selected domain
  async function loadProjects(domainId: string) {
    try {
      const data = await projectsApi.list({ domain_id: domainId });
      setProjectsList(data as ProjectData[]);
    } catch {
      setProjectsList([]);
    }
  }

  // Handle domain selection change
  useEffect(() => {
    if (selectedDomainId) {
      loadProjects(selectedDomainId);
    } else {
      setProjectsList([]);
    }
    setSelectedProjectId('');
  }, [selectedDomainId]);

  // Timer effect
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const currentItem = isProcessing && !isBatchMode && items.length > 0 ? items[currentIndex] : null;

  function startProcessing() {
    setIsProcessing(true);
    setIsBatchMode(false);
    setCurrentIndex(0);
    setCurrentAction(null);
    // Reset voice/photo state
    setEditingTranscription('');
    setMaterialSearchResults([]);
    // Pre-fill transcription if the first item is a voice item
    if (items.length > 0 && items[0].type === 'voice') {
      setEditingTranscription(items[0].raw_text || items[0].quick_note || '');
    }
  }

  // Feature 76: Start batch processing
  function startBatchProcessing() {
    setIsProcessing(true);
    setIsBatchMode(true);
    setSelectedBatchIds(new Set());
    setCurrentAction(null);
  }

  function stopProcessing() {
    setIsProcessing(false);
    setIsBatchMode(false);
    setCurrentIndex(0);
    setCurrentAction(null);
    setSelectedBatchIds(new Set());
    resetPickerState();
    resetTimerState();
    loadItems();
  }

  function resetPickerState() {
    setSelectedDomainId('');
    setSelectedProjectId('');
    setEstimatedMinutes(30);
    setDueDate('');
    setProjectsList([]);
  }

  function resetTimerState() {
    setTimerRunning(false);
    setTimerSeconds(120);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  const advanceToNext = useCallback(() => {
    setCurrentAction(null);
    resetPickerState();
    resetTimerState();
    // Reset voice/photo state
    setEditingTranscription('');
    setMaterialSearchResults([]);

    // Remove the processed item from the local list
    setItems((prev) => {
      const updated = prev.filter((_, i) => i !== currentIndex);
      if (updated.length === 0) {
        // All done
        setIsProcessing(false);
        setCurrentIndex(0);
        return updated;
      }
      // If currentIndex is at the end, wrap to 0
      const nextIndex = currentIndex >= updated.length ? 0 : currentIndex;
      setCurrentIndex(nextIndex);
      // Pre-fill transcription if the next item is a voice item
      if (updated[nextIndex]?.type === 'voice') {
        setEditingTranscription(updated[nextIndex].raw_text || updated[nextIndex].quick_note || '');
      }
      return updated;
    });
  }, [currentIndex]);

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!captureText.trim()) return;

    try {
      await inboxApi.create({ type: 'text', raw_text: captureText.trim() });
      setCaptureText('');
      loadItems();
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    try {
      await inboxApi.delete(id);
      loadItems();
    } catch {
      // silently fail
    }
  }

  // ---------- Processing Actions ----------

  async function handleCreateTask() {
    if (!currentItem || !selectedProjectId) return;
    setActionLoading(true);
    try {
      let itemText = currentItem.raw_text || currentItem.quick_note || '';
      const nlpDueDate = parseDueDate(itemText);

      // Feature 115: For voice items, use the (possibly edited) transcription
      // and auto-fill the title with the first sentence
      if (currentItem.type === 'voice' && editingTranscription) {
        itemText = editingTranscription;
      }
      const taskTitle = getFirstSentence(itemText) || itemText;

      // Feature 78: Determine the due date to use (manual picker > NLP detected)
      const resolvedDueDate = dueDate || nlpDueDate || null;

      const task = await tasksApi.create({
        project_id: selectedProjectId,
        title: taskTitle,
        estimated_minutes: estimatedMinutes,
        due_date: resolvedDueDate,
        notes: itemText.length > taskTitle.length ? itemText : undefined,
      });
      await inboxApi.update(currentItem.id, {
        processed_at: new Date().toISOString(),
        processed_to_task_id: task.id,
      });
      advanceToNext();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSomedayMaybe() {
    if (!currentItem || !selectedProjectId) return;
    setActionLoading(true);
    try {
      const task = await tasksApi.create({
        project_id: selectedProjectId,
        title: currentItem.raw_text || currentItem.quick_note || '',
        status: 'backlog',
      });
      await inboxApi.update(currentItem.id, {
        processed_at: new Date().toISOString(),
        processed_to_task_id: task.id,
      });
      advanceToNext();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReference() {
    if (!currentItem) return;
    setActionLoading(true);
    try {
      await inboxApi.update(currentItem.id, {
        processed_at: new Date().toISOString(),
      });
      advanceToNext();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  async function handleProcessDelete() {
    if (!currentItem) return;
    setActionLoading(true);
    try {
      await inboxApi.delete(currentItem.id);
      advanceToNext();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  function handleStartDoItNow() {
    setCurrentAction('do_it_now');
    setTimerSeconds(120);
    setTimerRunning(true);
  }

  async function handleDoItNowDone() {
    if (!currentItem) return;
    setActionLoading(true);
    resetTimerState();
    try {
      await inboxApi.update(currentItem.id, {
        processed_at: new Date().toISOString(),
      });
      advanceToNext();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- Feature 117: Save Edited Transcription ----------

  async function handleSaveTranscription() {
    if (!currentItem) return;
    try {
      await inboxApi.update(currentItem.id, { raw_text: editingTranscription });
      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === currentItem.id ? { ...item, raw_text: editingTranscription } : item
        )
      );
    } catch {
      // silently fail
    }
  }

  // ---------- Feature 116: Search Materials by OCR Text ----------

  async function handleSearchMaterials(query: string) {
    if (!query.trim()) {
      setMaterialSearchResults([]);
      return;
    }
    setMaterialSearchLoading(true);
    try {
      const data = await materialsApi.list();
      const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const filtered = (data as MaterialData[]).filter((m) =>
        searchTerms.some((term) => m.name.toLowerCase().includes(term))
      );
      setMaterialSearchResults(filtered);
    } catch {
      setMaterialSearchResults([]);
    } finally {
      setMaterialSearchLoading(false);
    }
  }

  function handleActionSelect(action: ProcessingAction) {
    if (action === 'create_task' || action === 'someday_maybe') {
      setCurrentAction(action);
      loadDomains();

      // Feature 77: Pre-fill estimated minutes from NLP
      if (currentItem) {
        const itemText = currentItem.raw_text || currentItem.quick_note || '';
        const nlpEstimate = parseTimeEstimate(itemText);
        if (nlpEstimate) {
          setEstimatedMinutes(nlpEstimate);
        }
        // Feature 78: Pre-fill due date from NLP
        const nlpDue = parseDueDate(itemText);
        if (nlpDue) {
          setDueDate(nlpDue);
        }

        // Feature 115: For voice items, pre-fill transcription for editing
        if (currentItem.type === 'voice') {
          setEditingTranscription(itemText);
        }
      }
    } else if (action === 'do_it_now') {
      handleStartDoItNow();
    }
  }

  // ---------- Feature 76: Batch Actions ----------

  function toggleBatchSelect(id: string) {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllBatch() {
    setSelectedBatchIds(new Set(items.map((i) => i.id)));
  }

  function deselectAllBatch() {
    setSelectedBatchIds(new Set());
  }

  async function handleBatchDelete() {
    if (selectedBatchIds.size === 0) return;
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedBatchIds).map((id) => inboxApi.delete(id))
      );
      setSelectedBatchIds(new Set());
      await loadItems();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBatchReference() {
    if (selectedBatchIds.size === 0) return;
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedBatchIds).map((id) =>
          inboxApi.update(id, { processed_at: new Date().toISOString() })
        )
      );
      setSelectedBatchIds(new Set());
      await loadItems();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  // Inline quick-actions for batch mode
  async function handleBatchItemDelete(id: string) {
    try {
      await inboxApi.delete(id);
      setSelectedBatchIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadItems();
    } catch {
      // silently fail
    }
  }

  async function handleBatchItemReference(id: string) {
    try {
      await inboxApi.update(id, { processed_at: new Date().toISOString() });
      setSelectedBatchIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadItems();
    } catch {
      // silently fail
    }
  }

  // ---------- Rendering ----------

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gw-stone-900">Inbox</h1>
        <p className="text-sm text-gw-stone-500 mt-1">
          Capture thoughts quickly. Process them later.
        </p>
      </div>

      {/* Quick capture */}
      <form onSubmit={handleCapture} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            placeholder="What's on your mind?"
            className="flex-1 px-4 py-3 text-base rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent placeholder:text-gw-stone-400"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!captureText.trim()}
            className="btn-primary disabled:opacity-50"
          >
            Capture
          </button>
        </div>
      </form>

      {/* Processing card (shown when in card-by-card processing mode) */}
      {isProcessing && !isBatchMode && currentItem && (
        <ProcessingFlow
          currentItem={currentItem}
          items={items}
          currentAction={currentAction}
          actionLoading={actionLoading}
          domainsList={domainsList}
          projectsList={projectsList}
          selectedDomainId={selectedDomainId}
          selectedProjectId={selectedProjectId}
          estimatedMinutes={estimatedMinutes}
          dueDate={dueDate}
          editingTranscription={editingTranscription}
          materialSearchResults={materialSearchResults}
          materialSearchLoading={materialSearchLoading}
          timerSeconds={timerSeconds}
          timerRunning={timerRunning}
          setSelectedDomainId={setSelectedDomainId}
          setSelectedProjectId={setSelectedProjectId}
          setEstimatedMinutes={setEstimatedMinutes}
          setDueDate={setDueDate}
          setEditingTranscription={setEditingTranscription}
          setCurrentAction={setCurrentAction}
          handleActionSelect={handleActionSelect}
          handleCreateTask={handleCreateTask}
          handleSomedayMaybe={handleSomedayMaybe}
          handleReference={handleReference}
          handleProcessDelete={handleProcessDelete}
          handleDoItNowDone={handleDoItNowDone}
          handleSaveTranscription={handleSaveTranscription}
          handleSearchMaterials={handleSearchMaterials}
          resetPickerState={resetPickerState}
          resetTimerState={resetTimerState}
          stopProcessing={stopProcessing}
        />
      )}

      {/* Feature 76: Batch mode (shown when in batch processing mode) */}
      {isProcessing && isBatchMode && (
        <BatchProcessingView
          items={items}
          selectedBatchIds={selectedBatchIds}
          actionLoading={actionLoading}
          toggleBatchSelect={toggleBatchSelect}
          selectAllBatch={selectAllBatch}
          deselectAllBatch={deselectAllBatch}
          handleBatchDelete={handleBatchDelete}
          handleBatchReference={handleBatchReference}
          handleBatchItemDelete={handleBatchItemDelete}
          handleBatchItemReference={handleBatchItemReference}
          stopProcessing={stopProcessing}
        />
      )}

      {/* Inbox items */}
      {!isProcessing && (
        <>
          {loading ? (
            <div className="space-y-3" role="status" aria-label="Loading inbox items">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="skeleton w-16 h-5 rounded" />
                    <div className="skeleton-text-sm w-32" />
                  </div>
                  <div className="skeleton-text w-full mb-1" />
                  <div className="skeleton-text w-3/4" />
                </div>
              ))}
              <span className="sr-only">Loading inbox items...</span>
            </div>
          ) : loadError ? (
            <ErrorState
              message={loadError}
              onRetry={loadItems}
              fullPage={false}
            />
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 text-gw-stone-300">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
                </svg>
              </div>
              <p className="text-gw-stone-500 font-medium">Inbox zero</p>
              <p className="text-sm text-gw-stone-400 mt-1">
                Use the field above or press <kbd className="px-1.5 py-0.5 bg-gw-stone-100 rounded text-xs">Cmd+Shift+I</kbd> to capture
              </p>
            </div>
          ) : (
            <>
              {/* Process buttons */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gw-stone-500">
                  {items.length} unprocessed item{items.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  {/* Feature 76: Batch Process button (10+ items) */}
                  {items.length >= 10 && (
                    <button
                      onClick={startBatchProcessing}
                      className="px-4 py-2 text-sm rounded-lg font-medium bg-gw-stone-200 text-gw-stone-700 hover:bg-gw-stone-300 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                      </svg>
                      Batch Process
                    </button>
                  )}
                  <button
                    onClick={startProcessing}
                    className="btn-primary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Process All
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <InboxCard key={item.id} item={item} onDelete={handleDelete} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
