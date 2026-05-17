'use client';

import { useState, useCallback, useEffect } from 'react';
import { domains as domainsApi } from '@/lib/api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DomainData, ICON_OPTIONS } from './types';

/* ─── Sortable Domain Item ─── */

function SortableDomainItem({
  domain,
  isEditing,
  editName,
  editColor,
  editIcon,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditNameChange,
  onEditColorChange,
  onEditIconChange,
}: {
  domain: DomainData;
  isEditing: boolean;
  editName: string;
  editColor: string;
  editIcon: string | null;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditNameChange: (v: string) => void;
  onEditColorChange: (v: string) => void;
  onEditIconChange: (v: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: domain.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      {isEditing ? (
        <div className="p-3 rounded-lg bg-gw-stone-50 border border-gw-green-300 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={editColor}
              onChange={(e) => onEditColorChange(e.target.value)}
              className="w-8 h-8 rounded border border-gw-stone-200 cursor-pointer flex-shrink-0"
            />
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Icon</label>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => onEditIconChange(null)}
                className={`w-8 h-8 rounded text-xs border ${
                  editIcon === null
                    ? 'border-gw-green-500 bg-gw-green-50'
                    : 'border-gw-stone-200 hover:border-gw-stone-300'
                }`}
              >
                --
              </button>
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => onEditIconChange(icon)}
                  className={`w-8 h-8 rounded text-lg border ${
                    editIcon === icon
                      ? 'border-gw-green-500 bg-gw-green-50'
                      : 'border-gw-stone-200 hover:border-gw-stone-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancelEdit}
              className="px-3 py-1.5 text-xs rounded-lg border border-gw-stone-200 text-gw-stone-600 hover:bg-gw-stone-100"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              className="px-3 py-1.5 text-xs rounded-lg bg-gw-green-600 text-white font-medium hover:bg-gw-green-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gw-stone-50 group">
          {/* Drag handle */}
          <button
            className="cursor-grab active:cursor-grabbing text-gw-stone-400 hover:text-gw-stone-600 flex-shrink-0"
            {...attributes}
            {...listeners}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span
            className="w-4 h-4 rounded-sm flex-shrink-0"
            style={{ backgroundColor: domain.color }}
          />
          {domain.icon && <span className="text-lg">{domain.icon}</span>}
          <span className="font-medium text-gw-stone-700 flex-1">{domain.name}</span>
          <button
            onClick={onStartEdit}
            className="text-xs text-gw-stone-400 hover:text-gw-green-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-gw-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

/* ─── Domain Management Section ─── */

export default function DomainManagement({
  domainList,
  onDomainsChange,
}: {
  domainList: DomainData[];
  onDomainsChange: () => void;
}) {
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainColor, setNewDomainColor] = useState('#3B82F6');
  const [newDomainIcon, setNewDomainIcon] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [localDomainList, setLocalDomainList] = useState<DomainData[]>(domainList);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setLocalDomainList(domainList);
  }, [domainList]);

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomainName.trim()) return;

    try {
      await domainsApi.create({
        name: newDomainName.trim(),
        color: newDomainColor,
        icon: newDomainIcon,
        sort_order: localDomainList.length + 1,
      });
      setNewDomainName('');
      setNewDomainColor('#3B82F6');
      setNewDomainIcon(null);
      onDomainsChange();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteDomain(id: string) {
    if (localDomainList.length <= 1) {
      alert('At least one domain must exist.');
      return;
    }
    try {
      await domainsApi.delete(id);
      onDomainsChange();
    } catch {
      // silently fail
    }
  }

  function startEditing(domain: DomainData) {
    setEditingDomain(domain.id);
    setEditName(domain.name);
    setEditColor(domain.color);
    setEditIcon(domain.icon);
  }

  async function saveEdit(id: string) {
    try {
      await domainsApi.update(id, {
        name: editName.trim(),
        color: editColor,
        icon: editIcon,
      });
      setEditingDomain(null);
      onDomainsChange();
    } catch {
      // silently fail
    }
  }

  function cancelEdit() {
    setEditingDomain(null);
  }

  // Index 29: Drag-and-drop reorder handler for domains
  async function handleDomainDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localDomainList.findIndex((d) => d.id === active.id);
    const newIndex = localDomainList.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localDomainList, oldIndex, newIndex);
    setLocalDomainList(reordered);

    // Persist new sort_order values
    try {
      await Promise.all(
        reordered.map((domain, i) =>
          domainsApi.update(domain.id, { sort_order: i + 1 })
        )
      );
      onDomainsChange();
    } catch {
      // Reload on failure
      onDomainsChange();
    }
  }

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-4">Domains</h2>

      {localDomainList.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDomainDragEnd}>
          <SortableContext items={localDomainList.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2 mb-4">
              {localDomainList.map((domain) => (
                <SortableDomainItem
                  key={domain.id}
                  domain={domain}
                  isEditing={editingDomain === domain.id}
                  editName={editName}
                  editColor={editColor}
                  editIcon={editIcon}
                  onStartEdit={() => startEditing(domain)}
                  onSaveEdit={() => saveEdit(domain.id)}
                  onCancelEdit={cancelEdit}
                  onDelete={() => handleDeleteDomain(domain.id)}
                  onEditNameChange={setEditName}
                  onEditColorChange={setEditColor}
                  onEditIconChange={setEditIcon}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <form onSubmit={handleAddDomain} className="space-y-3 pt-3 border-t border-gw-stone-100">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Name</label>
            <input
              type="text"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              placeholder="e.g., W-2 Job, Homestead"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gw-stone-500 mb-1">Color</label>
            <input
              type="color"
              value={newDomainColor}
              onChange={(e) => setNewDomainColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gw-stone-200 cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={!newDomainName.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            Add Domain
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gw-stone-500 mb-1">Icon (optional)</label>
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setNewDomainIcon(null)}
              className={`w-8 h-8 rounded text-xs border ${
                newDomainIcon === null
                  ? 'border-gw-green-500 bg-gw-green-50'
                  : 'border-gw-stone-200 hover:border-gw-stone-300'
              }`}
            >
              --
            </button>
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setNewDomainIcon(icon)}
                className={`w-8 h-8 rounded text-lg border ${
                  newDomainIcon === icon
                    ? 'border-gw-green-500 bg-gw-green-50'
                    : 'border-gw-stone-200 hover:border-gw-stone-300'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
