'use client';

import { PROJECT_VIEWS, VIEW_ICONS } from './types';

interface ViewSwitcherProps {
  projectId: string;
  currentView: string;
  onSwitchView: (projectId: string, view: string) => void;
}

export default function ViewSwitcher({ projectId, currentView, onSwitchView }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-gw-stone-100 rounded-lg p-0.5">
      {PROJECT_VIEWS.map((view) => (
        <button
          key={view}
          onClick={(e) => { e.stopPropagation(); onSwitchView(projectId, view); }}
          title={view.charAt(0).toUpperCase() + view.slice(1)}
          className={`p-1.5 rounded-md transition-colors ${
            currentView === view
              ? 'bg-white text-gw-stone-800 shadow-sm'
              : 'text-gw-stone-400 hover:text-gw-stone-600'
          }`}
        >
          {VIEW_ICONS[view]}
        </button>
      ))}
    </div>
  );
}
