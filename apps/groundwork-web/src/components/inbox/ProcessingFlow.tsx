import type { InboxItemData, DomainData, ProjectData, ProcessingAction, MaterialData } from './types';
import { parseTimeEstimate, parseDueDate } from './nlpParsers';
import VoiceSection from './VoiceSection';
import PhotoSection from './PhotoSection';
import NlpChips from './NlpChips';

interface ProcessingFlowProps {
  currentItem: InboxItemData;
  items: InboxItemData[];
  currentAction: ProcessingAction;
  actionLoading: boolean;
  domainsList: DomainData[];
  projectsList: ProjectData[];
  selectedDomainId: string;
  selectedProjectId: string;
  estimatedMinutes: number;
  dueDate: string;
  editingTranscription: string;
  materialSearchResults: MaterialData[];
  materialSearchLoading: boolean;
  timerSeconds: number;
  timerRunning: boolean;
  setSelectedDomainId: (value: string) => void;
  setSelectedProjectId: (value: string) => void;
  setEstimatedMinutes: (value: number) => void;
  setDueDate: (value: string) => void;
  setEditingTranscription: (value: string) => void;
  setCurrentAction: (action: ProcessingAction) => void;
  handleActionSelect: (action: ProcessingAction) => void;
  handleCreateTask: () => void;
  handleSomedayMaybe: () => void;
  handleReference: () => void;
  handleProcessDelete: () => void;
  handleDoItNowDone: () => void;
  handleSaveTranscription: () => void;
  handleSearchMaterials: (query: string) => void;
  resetPickerState: () => void;
  resetTimerState: () => void;
  stopProcessing: () => void;
}

export default function ProcessingFlow({
  currentItem,
  items,
  currentAction,
  actionLoading,
  domainsList,
  projectsList,
  selectedDomainId,
  selectedProjectId,
  estimatedMinutes,
  dueDate,
  editingTranscription,
  materialSearchResults,
  materialSearchLoading,
  timerSeconds,
  setSelectedDomainId,
  setSelectedProjectId,
  setEstimatedMinutes,
  setDueDate,
  setEditingTranscription,
  setCurrentAction,
  handleActionSelect,
  handleCreateTask,
  handleSomedayMaybe,
  handleReference,
  handleProcessDelete,
  handleDoItNowDone,
  handleSaveTranscription,
  handleSearchMaterials,
  resetPickerState,
  resetTimerState,
  stopProcessing,
}: ProcessingFlowProps) {
  const itemText = currentItem.raw_text || currentItem.quick_note || '(no text)';
  const remaining = items.length;

  function formatTimerDisplay(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function renderActionButtons() {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleActionSelect('create_task')}
          disabled={actionLoading}
          className="btn-primary disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Task
        </button>
        <button
          onClick={() => handleActionSelect('someday_maybe')}
          disabled={actionLoading}
          className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Someday/Maybe
        </button>
        <button
          onClick={handleReference}
          disabled={actionLoading}
          className="px-4 py-2 bg-gw-stone-200 text-gw-stone-700 rounded-lg font-medium hover:bg-gw-stone-300 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
          </svg>
          Reference
        </button>
        <button
          onClick={() => handleActionSelect('do_it_now')}
          disabled={actionLoading}
          className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Do It Now
        </button>
        <button
          onClick={handleProcessDelete}
          disabled={actionLoading}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    );
  }

  function renderTaskPicker(title: string, onConfirm: () => void) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gw-stone-700 uppercase tracking-wide">
            {title}
          </h3>
          <button
            onClick={() => {
              setCurrentAction(null);
              resetPickerState();
            }}
            className="text-sm text-gw-stone-500 hover:text-gw-stone-700 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Domain picker */}
        <div>
          <label className="block text-sm font-medium text-gw-stone-600 mb-1">Domain</label>
          <select
            value={selectedDomainId}
            onChange={(e) => setSelectedDomainId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
          >
            <option value="">Select a domain...</option>
            {domainsList.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project picker */}
        {selectedDomainId && (
          <div>
            <label className="block text-sm font-medium text-gw-stone-600 mb-1">Project</label>
            {projectsList.length === 0 ? (
              <p className="text-sm text-gw-stone-400 italic">No projects in this domain.</p>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
              >
                <option value="">Select a project...</option>
                {projectsList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Estimated minutes (only for Create Task, not Someday/Maybe) */}
        {currentAction === 'create_task' && selectedProjectId && (
          <div>
            <label className="block text-sm font-medium text-gw-stone-600 mb-1">
              Estimated Minutes
              {parseTimeEstimate(currentItem.raw_text || currentItem.quick_note || '') && (
                <span className="ml-2 text-xs text-blue-600 font-normal">
                  (auto-detected from text)
                </span>
              )}
            </label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-32 px-3 py-2 rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Feature 78: Due date picker */}
        {currentAction === 'create_task' && selectedProjectId && (
          <div>
            <label className="block text-sm font-medium text-gw-stone-600 mb-1">
              Due Date
              {parseDueDate(currentItem.raw_text || currentItem.quick_note || '') && (
                <span className="ml-2 text-xs text-purple-600 font-normal">
                  (auto-detected from text)
                </span>
              )}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-48 px-3 py-2 rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Confirm button */}
        {selectedProjectId && (
          <button
            onClick={onConfirm}
            disabled={actionLoading}
            className="btn-primary disabled:opacity-50"
          >
            {actionLoading ? 'Saving...' : 'Confirm'}
          </button>
        )}
      </div>
    );
  }

  function renderDoItNowTimer() {
    const progressPercent = ((120 - timerSeconds) / 120) * 100;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gw-stone-700 uppercase tracking-wide">
            Do It Now
          </h3>
          <button
            onClick={() => {
              resetTimerState();
              setCurrentAction(null);
            }}
            className="text-sm text-gw-stone-500 hover:text-gw-stone-700 transition-colors"
          >
            Cancel
          </button>
        </div>

        <p className="text-sm text-gw-stone-500">
          Take 2 minutes to handle this right now. When you are done, click the button below.
        </p>

        {/* Timer display */}
        <div className="text-center py-6">
          <div className="text-5xl font-mono font-bold text-gw-stone-800 mb-4">
            {formatTimerDisplay(timerSeconds)}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gw-stone-200 rounded-full h-2 mb-4">
            <div
              className="h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: timerSeconds === 0 ? '#16a34a' : '#3b82f6',
              }}
            />
          </div>

          {timerSeconds === 0 && (
            <p className="text-sm font-medium text-gw-green-600 mb-2">Time is up!</p>
          )}
        </div>

        <button
          onClick={handleDoItNowDone}
          disabled={actionLoading}
          className="btn-primary disabled:opacity-50 w-full"
        >
          {actionLoading ? 'Saving...' : 'Done'}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gw-stone-800">Processing Inbox</h2>
          <span className="text-sm text-gw-stone-500">
            {remaining} item{remaining !== 1 ? 's' : ''} remaining
          </span>
        </div>
        <button
          onClick={stopProcessing}
          className="text-sm text-gw-stone-500 hover:text-gw-stone-700 transition-colors"
        >
          Exit Processing
        </button>
      </div>

      {/* Main processing card */}
      <div className="card border-2 border-gw-green-200">
        {/* Item header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gw-stone-100 text-gw-stone-600 uppercase">
            {currentItem.type}
          </span>
          <span className="text-xs text-gw-stone-400">
            {new Date(currentItem.created_at).toLocaleString()}
          </span>
        </div>

        {/* Item text - prominent display */}
        <p className="text-xl font-medium text-gw-stone-900 mb-2 leading-relaxed">
          {itemText}
        </p>

        {/* Feature 115: Voice-specific UI */}
        {currentItem.type === 'voice' && (
          <VoiceSection
            currentItem={currentItem}
            editingTranscription={editingTranscription}
            setEditingTranscription={setEditingTranscription}
            onSaveTranscription={handleSaveTranscription}
          />
        )}

        {/* Feature 116: Photo-specific UI */}
        {currentItem.type === 'photo' && (
          <PhotoSection
            currentItem={currentItem}
            materialSearchResults={materialSearchResults}
            materialSearchLoading={materialSearchLoading}
            onSearchMaterials={handleSearchMaterials}
          />
        )}

        {/* Feature 77 & 78: NLP chips */}
        <NlpChips itemText={itemText} />

        <div className="mt-4">
          {/* Action area */}
          {currentAction === null && renderActionButtons()}
          {currentAction === 'create_task' && renderTaskPicker('Create Task', handleCreateTask)}
          {currentAction === 'someday_maybe' && renderTaskPicker('Add to Someday/Maybe', handleSomedayMaybe)}
          {currentAction === 'do_it_now' && renderDoItNowTimer()}
        </div>
      </div>
    </div>
  );
}
