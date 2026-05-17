import type { InboxItemData, MaterialData } from './types';

interface PhotoSectionProps {
  currentItem: InboxItemData;
  materialSearchResults: MaterialData[];
  materialSearchLoading: boolean;
  onSearchMaterials: (query: string) => void;
}

export default function PhotoSection({
  currentItem,
  materialSearchResults,
  materialSearchLoading,
  onSearchMaterials,
}: PhotoSectionProps) {
  if (currentItem.type !== 'photo') return null;

  return (
    <div className="mt-4 space-y-3">
      {/* Photo placeholder */}
      <div className="flex items-center justify-center h-40 rounded-lg bg-gw-stone-100 border border-gw-stone-200">
        {currentItem.photo_path ? (
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-gw-stone-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <span className="text-xs text-gw-stone-400">{currentItem.photo_path}</span>
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-gw-stone-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <span className="text-xs text-gw-stone-300">No photo attached</span>
          </div>
        )}
      </div>

      {/* OCR Text display */}
      {currentItem.ocr_text && (
        <div>
          <label className="block text-xs font-semibold text-gw-stone-600 mb-1 uppercase tracking-wide">
            OCR Text
          </label>
          <div className="px-3 py-2 text-sm rounded-lg bg-gw-stone-50 border border-gw-stone-200 text-gw-stone-700 max-h-32 overflow-y-auto">
            {currentItem.ocr_text}
          </div>
        </div>
      )}

      {/* Link to Materials action */}
      {currentItem.ocr_text && (
        <div>
          <button
            onClick={() => onSearchMaterials(currentItem.ocr_text || '')}
            disabled={materialSearchLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-medium hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            {materialSearchLoading ? 'Searching...' : 'Link to Materials'}
          </button>

          {materialSearchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-xs font-medium text-gw-stone-500">
                {materialSearchResults.length} material{materialSearchResults.length !== 1 ? 's' : ''} found:
              </span>
              {materialSearchResults.map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-gw-stone-50 border border-gw-stone-200"
                >
                  <svg className="w-3.5 h-3.5 text-gw-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                  <span className="text-xs text-gw-stone-700 font-medium">{mat.name}</span>
                  <span className="text-xs text-gw-stone-400 ml-auto">{mat.status}</span>
                </div>
              ))}
            </div>
          )}

          {materialSearchResults.length === 0 && !materialSearchLoading && materialSearchResults !== undefined && (
            <span className="text-xs text-gw-stone-400 mt-1 block">
              Click to search materials by OCR text
            </span>
          )}
        </div>
      )}
    </div>
  );
}
