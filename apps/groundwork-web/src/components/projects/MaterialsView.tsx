'use client';

import { useState } from 'react';
import { MaterialData, MATERIAL_STATUS_STYLES } from './types';
import { materials as materialsApi } from '@/lib/api';

interface MaterialsViewProps {
  projectId: string;
  projectMaterials: MaterialData[];
  loadMaterials: (projectId: string) => Promise<void>;
  expandedProject: string | null;
  onUnblockedTasksDetected: (taskIds: Set<string>) => void;
}

export default function MaterialsView({
  projectId,
  projectMaterials,
  loadMaterials,
  expandedProject,
  onUnblockedTasksDetected,
}: MaterialsViewProps) {
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialField, setEditingMaterialField] = useState<string | null>(null);
  const [editingMaterialValue, setEditingMaterialValue] = useState<string>('');
  const [newMaterialName, setNewMaterialName] = useState('');

  async function handleAddMaterial() {
    if (!newMaterialName.trim()) return;
    try {
      await materialsApi.create({
        project_id: projectId,
        name: newMaterialName.trim(),
        quantity: 1,
      });
      setNewMaterialName('');
      await loadMaterials(projectId);
    } catch {
      // silently fail
    }
  }

  async function handleUpdateMaterial(materialId: string, field: string, value: string | number | null) {
    try {
      await materialsApi.update(materialId, { [field]: value } as Record<string, unknown>);
      if (expandedProject) await loadMaterials(expandedProject);
    } catch {
      // silently fail
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    try {
      await materialsApi.delete(materialId);
      if (expandedProject) await loadMaterials(expandedProject);
    } catch {
      // silently fail
    }
  }

  async function handleCycleMaterialStatus(material: MaterialData) {
    const statusOrder: string[] = ['needed', 'ordered', 'acquired'];
    const currentIdx = statusOrder.indexOf(material.status);
    const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length];

    try {
      await materialsApi.update(material.id, { status: nextStatus } as Record<string, unknown>);
      if (expandedProject) {
        await loadMaterials(expandedProject);

        if (nextStatus === 'acquired') {
          try {
            const blockedTaskIds: string[] = JSON.parse(material.blocks_tasks || '[]');
            if (blockedTaskIds.length > 0) {
              const updatedMaterials = await materialsApi.list({ project_id: expandedProject }) as MaterialData[];
              const newlyUnblocked = new Set<string>();
              for (const taskId of blockedTaskIds) {
                const stillBlocked = updatedMaterials.some(m => {
                  if (m.status === 'acquired') return false;
                  try {
                    const bt: string[] = JSON.parse(m.blocks_tasks || '[]');
                    return bt.includes(taskId);
                  } catch { return false; }
                });
                if (!stillBlocked) {
                  newlyUnblocked.add(taskId);
                }
              }
              if (newlyUnblocked.size > 0) {
                onUnblockedTasksDetected(newlyUnblocked);
              }
            }
          } catch {
            // silently fail
          }
        }
      }
    } catch {
      // silently fail
    }
  }

  function startEditingMaterial(materialId: string, field: string, currentValue: string) {
    setEditingMaterialId(materialId);
    setEditingMaterialField(field);
    setEditingMaterialValue(currentValue);
  }

  function commitMaterialEdit(materialId: string, field: string) {
    let value: string | number | null = editingMaterialValue;
    if (field === 'quantity') {
      value = parseInt(editingMaterialValue, 10) || 1;
    } else if (field === 'unit_cost') {
      value = editingMaterialValue ? parseFloat(editingMaterialValue) : null;
    } else if (field === 'name') {
      value = editingMaterialValue.trim() || 'Untitled';
    }
    handleUpdateMaterial(materialId, field, value);
    setEditingMaterialId(null);
    setEditingMaterialField(null);
    setEditingMaterialValue('');
  }

  const totalBudget = projectMaterials.reduce((sum, m) => {
    return sum + (m.quantity * (m.unit_cost || 0));
  }, 0);

  return (
    <div>
      {/* Materials table */}
      <div className="overflow-x-auto border border-gw-stone-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gw-stone-50 border-b border-gw-stone-200">
              <th className="text-left px-3 py-2 font-semibold text-gw-stone-600 text-xs uppercase tracking-wider">Name</th>
              <th className="text-right px-3 py-2 font-semibold text-gw-stone-600 text-xs uppercase tracking-wider w-16">Qty</th>
              <th className="text-right px-3 py-2 font-semibold text-gw-stone-600 text-xs uppercase tracking-wider w-20">$/Unit</th>
              <th className="text-right px-3 py-2 font-semibold text-gw-stone-600 text-xs uppercase tracking-wider w-24">Total</th>
              <th className="text-left px-3 py-2 font-semibold text-gw-stone-600 text-xs uppercase tracking-wider w-28">Source</th>
              <th className="text-center px-3 py-2 font-semibold text-gw-stone-600 text-xs uppercase tracking-wider w-24">Status</th>
              <th className="text-center px-3 py-2 font-semibold text-gw-stone-600 text-xs uppercase tracking-wider w-20">Blocks</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {projectMaterials.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gw-stone-400">
                  No materials yet. Add one below.
                </td>
              </tr>
            ) : (
              projectMaterials.map((material) => {
                const total = material.quantity * (material.unit_cost || 0);
                const blocksCount = (() => {
                  try {
                    const arr: string[] = JSON.parse(material.blocks_tasks || '[]');
                    return arr.length;
                  } catch { return 0; }
                })();
                const isEditing = editingMaterialId === material.id;

                return (
                  <tr key={material.id} className="border-b border-gw-stone-100 hover:bg-gw-stone-50 transition-colors">
                    {/* Name - inline edit */}
                    <td className="px-3 py-2">
                      {isEditing && editingMaterialField === 'name' ? (
                        <input
                          type="text"
                          value={editingMaterialValue}
                          onChange={(e) => setEditingMaterialValue(e.target.value)}
                          onBlur={() => commitMaterialEdit(material.id, 'name')}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitMaterialEdit(material.id, 'name'); if (e.key === 'Escape') { setEditingMaterialId(null); setEditingMaterialField(null); } }}
                          autoFocus
                          className="w-full px-1 py-0.5 text-sm rounded border border-gw-green-400 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-gw-green-600 font-medium text-gw-stone-800"
                          onClick={(e) => { e.stopPropagation(); startEditingMaterial(material.id, 'name', material.name); }}
                        >
                          {material.name}
                        </span>
                      )}
                    </td>

                    {/* Qty - inline edit */}
                    <td className="px-3 py-2 text-right">
                      {isEditing && editingMaterialField === 'quantity' ? (
                        <input
                          type="number"
                          value={editingMaterialValue}
                          onChange={(e) => setEditingMaterialValue(e.target.value)}
                          onBlur={() => commitMaterialEdit(material.id, 'quantity')}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitMaterialEdit(material.id, 'quantity'); if (e.key === 'Escape') { setEditingMaterialId(null); setEditingMaterialField(null); } }}
                          autoFocus
                          min={0}
                          className="w-full px-1 py-0.5 text-sm text-right rounded border border-gw-green-400 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-gw-green-600 text-gw-stone-700"
                          onClick={(e) => { e.stopPropagation(); startEditingMaterial(material.id, 'quantity', material.quantity.toString()); }}
                        >
                          {material.quantity}
                        </span>
                      )}
                    </td>

                    {/* $/Unit - inline edit */}
                    <td className="px-3 py-2 text-right">
                      {isEditing && editingMaterialField === 'unit_cost' ? (
                        <input
                          type="number"
                          value={editingMaterialValue}
                          onChange={(e) => setEditingMaterialValue(e.target.value)}
                          onBlur={() => commitMaterialEdit(material.id, 'unit_cost')}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitMaterialEdit(material.id, 'unit_cost'); if (e.key === 'Escape') { setEditingMaterialId(null); setEditingMaterialField(null); } }}
                          autoFocus
                          step="0.01"
                          min={0}
                          className="w-full px-1 py-0.5 text-sm text-right rounded border border-gw-green-400 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-gw-green-600 text-gw-stone-700"
                          onClick={(e) => { e.stopPropagation(); startEditingMaterial(material.id, 'unit_cost', material.unit_cost?.toString() || ''); }}
                        >
                          {material.unit_cost != null ? `$${material.unit_cost.toFixed(2)}` : '-'}
                        </span>
                      )}
                    </td>

                    {/* Total (computed, not editable) */}
                    <td className="px-3 py-2 text-right font-medium text-gw-stone-800">
                      {total > 0 ? `$${total.toFixed(2)}` : '-'}
                    </td>

                    {/* Source - inline edit */}
                    <td className="px-3 py-2">
                      {isEditing && editingMaterialField === 'source' ? (
                        <input
                          type="text"
                          value={editingMaterialValue}
                          onChange={(e) => setEditingMaterialValue(e.target.value)}
                          onBlur={() => commitMaterialEdit(material.id, 'source')}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitMaterialEdit(material.id, 'source'); if (e.key === 'Escape') { setEditingMaterialId(null); setEditingMaterialField(null); } }}
                          autoFocus
                          className="w-full px-1 py-0.5 text-sm rounded border border-gw-green-400 focus:outline-none focus:ring-1 focus:ring-gw-green-500"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-gw-green-600 text-gw-stone-500"
                          onClick={(e) => { e.stopPropagation(); startEditingMaterial(material.id, 'source', material.source || ''); }}
                        >
                          {material.source || '-'}
                        </span>
                      )}
                    </td>

                    {/* Status - cycle toggle */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCycleMaterialStatus(material); }}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          MATERIAL_STATUS_STYLES[material.status] || 'bg-gw-stone-100 text-gw-stone-500'
                        }`}
                        title="Click to cycle: needed -> ordered -> acquired"
                      >
                        {material.status}
                      </button>
                    </td>

                    {/* Blocks count */}
                    <td className="px-3 py-2 text-center">
                      {blocksCount > 0 ? (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                          {blocksCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gw-stone-300">0</span>
                      )}
                    </td>

                    {/* Delete button */}
                    <td className="px-2 py-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(material.id); }}
                        className="text-gw-stone-300 hover:text-red-500 transition-colors p-1"
                        title="Delete material"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Budget summary footer */}
          {projectMaterials.length > 0 && (
            <tfoot>
              <tr className="bg-gw-stone-50 border-t-2 border-gw-stone-200">
                <td className="px-3 py-2 font-semibold text-gw-stone-700 text-xs uppercase">Total Budget</td>
                <td className="px-3 py-2 text-right text-xs text-gw-stone-400">
                  {projectMaterials.reduce((sum, m) => sum + m.quantity, 0)} items
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right font-bold text-gw-stone-900">
                  ${totalBudget.toFixed(2)}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add material form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleAddMaterial(); }}
        className="flex gap-2 mt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={newMaterialName}
          onChange={(e) => setNewMaterialName(e.target.value)}
          placeholder="Add a material..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500 focus:border-transparent placeholder:text-gw-stone-400"
        />
        <button
          type="submit"
          disabled={!newMaterialName.trim()}
          className="px-3 py-2 text-sm bg-gw-green-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-gw-green-700 transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  );
}
