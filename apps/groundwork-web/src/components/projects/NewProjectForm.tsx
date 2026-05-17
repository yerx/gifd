'use client';

import { DomainData, PROJECT_VIEWS } from './types';

interface NewProjectFormProps {
  domainList: DomainData[];
  newProjectName: string;
  setNewProjectName: (val: string) => void;
  newProjectDescription: string;
  setNewProjectDescription: (val: string) => void;
  newProjectDomainId: string;
  setNewProjectDomainId: (val: string) => void;
  newProjectDefaultView: string;
  setNewProjectDefaultView: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function NewProjectForm({
  domainList,
  newProjectName,
  setNewProjectName,
  newProjectDescription,
  setNewProjectDescription,
  newProjectDomainId,
  setNewProjectDomainId,
  newProjectDefaultView,
  setNewProjectDefaultView,
  onSubmit,
  onCancel,
}: NewProjectFormProps) {
  return (
    <div className="card mb-6">
      <h2 className="text-base font-semibold text-gw-stone-800 mb-4">Create New Project</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Name</label>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Description</label>
          <textarea
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent resize-y"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Domain</label>
            <select
              value={newProjectDomainId}
              onChange={(e) => setNewProjectDomainId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 bg-white"
            >
              <option value="">Select a domain...</option>
              {domainList.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Default View</label>
            <select
              value={newProjectDefaultView}
              onChange={(e) => setNewProjectDefaultView(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 bg-white"
            >
              {PROJECT_VIEWS.map((view) => (
                <option key={view} value={view}>{view}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!newProjectName.trim() || !newProjectDomainId}
            className="btn-primary text-sm disabled:opacity-50"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
