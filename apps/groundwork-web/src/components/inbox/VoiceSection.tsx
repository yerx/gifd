import type { InboxItemData } from './types';

interface VoiceSectionProps {
  currentItem: InboxItemData;
  editingTranscription: string;
  setEditingTranscription: (value: string) => void;
  onSaveTranscription: () => void;
}

export default function VoiceSection({
  currentItem,
  editingTranscription,
  setEditingTranscription,
  onSaveTranscription,
}: VoiceSectionProps) {
  if (currentItem.type !== 'voice') return null;

  return (
    <div className="mt-4 space-y-3">
      {/* Mock audio player */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gw-stone-100 border border-gw-stone-200">
        <button
          className="w-10 h-10 rounded-full bg-gw-green-600 text-white flex items-center justify-center hover:bg-gw-green-700 transition-colors flex-shrink-0"
          title="Audio playback (placeholder)"
        >
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="h-2 bg-gw-stone-200 rounded-full">
            <div className="h-2 w-0 bg-gw-green-500 rounded-full" />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gw-stone-400">0:00</span>
            <span className="text-xs text-gw-stone-400">
              {currentItem.audio_path ? currentItem.audio_path : 'No audio file'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature 117: Editable transcription */}
      <div>
        <label className="block text-xs font-semibold text-gw-stone-600 mb-1 uppercase tracking-wide">
          Transcription
        </label>
        <textarea
          value={editingTranscription}
          onChange={(e) => setEditingTranscription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 bg-white text-gw-stone-800 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent resize-y"
          placeholder="Transcription text..."
        />
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onSaveTranscription}
            className="text-xs px-2 py-1 rounded bg-gw-stone-200 text-gw-stone-700 hover:bg-gw-stone-300 transition-colors font-medium"
          >
            Save Changes
          </button>
          {editingTranscription && (
            <span className="text-xs text-gw-stone-400">
              First sentence will be the task title
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
