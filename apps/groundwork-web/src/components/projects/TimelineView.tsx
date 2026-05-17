'use client';

import { useState, useRef } from 'react';
import { TaskData, MaterialData, DomainData, parseDependsOn, wouldCreateCycle } from './types';
import { tasks as tasksApi } from '@/lib/api';

interface TimelineViewProps {
  projectId: string;
  projectTasks: TaskData[];
  projectMaterials: MaterialData[];
  domainList: DomainData[];
  projectList: Array<{ id: string; domain_id: string }>;
  expandedProject: string | null;
  loadTasks: (projectId: string) => Promise<void>;
  onDetailTask: (task: TaskData) => void;
  unblockedTasks: Set<string>;
}

export default function TimelineView({
  projectId,
  projectTasks,
  projectMaterials,
  domainList,
  projectList,
  expandedProject,
  loadTasks,
  onDetailTask,
  unblockedTasks,
}: TimelineViewProps) {
  const [timelineDraggingFrom, setTimelineDraggingFrom] = useState<string | null>(null);
  const [timelineDragPos, setTimelineDragPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedDependency, setSelectedDependency] = useState<{ from: string; to: string } | null>(null);
  const [depError, setDepError] = useState<string | null>(null);
  const timelineSvgRef = useRef<SVGSVGElement>(null);

  const domain = domainList.find(d => d.id === projectList.find(p => p.id === projectId)?.domain_id);
  const domainColor = domain?.color || '#4ade80';
  const allTasks = projectTasks;

  function isTaskMaterialBlocked(taskId: string): boolean {
    return projectMaterials.some(m => {
      if (m.status === 'acquired') return false;
      try {
        const blockedTasks: string[] = JSON.parse(m.blocks_tasks || '[]');
        return blockedTasks.includes(taskId);
      } catch {
        return false;
      }
    });
  }

  async function handleCreateDependency(fromTaskId: string, toTaskId: string) {
    if (fromTaskId === toTaskId) return;

    const cyclePath = wouldCreateCycle(fromTaskId, toTaskId, projectTasks);
    if (cyclePath) {
      const taskNames = cyclePath.map(id => {
        const t = projectTasks.find(t => t.id === id);
        return t ? t.title : id.slice(0, 8);
      });
      setDepError(`Circular dependency detected: ${taskNames.join(' -> ')}`);
      setTimeout(() => setDepError(null), 5000);
      return;
    }

    const targetTask = projectTasks.find(t => t.id === toTaskId);
    if (!targetTask) return;

    const currentDeps = parseDependsOn(targetTask);
    if (currentDeps.includes(fromTaskId)) return;

    const newDeps = [...currentDeps, fromTaskId];
    try {
      await tasksApi.update(toTaskId, { depends_on: newDeps } as Record<string, unknown>);
      if (expandedProject) await loadTasks(expandedProject);
    } catch {
      // silently fail
    }
  }

  async function handleRemoveDependency(fromTaskId: string, toTaskId: string) {
    const targetTask = projectTasks.find(t => t.id === toTaskId);
    if (!targetTask) return;

    const currentDeps = parseDependsOn(targetTask);
    const newDeps = currentDeps.filter(d => d !== fromTaskId);
    try {
      await tasksApi.update(toTaskId, { depends_on: newDeps } as Record<string, unknown>);
      setSelectedDependency(null);
      if (expandedProject) await loadTasks(expandedProject);
    } catch {
      // silently fail
    }
  }

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-12 text-gw-stone-400">
        <p className="font-medium">No tasks to display</p>
        <p className="text-sm mt-1">Add tasks to see them on the timeline</p>
      </div>
    );
  }

  // Timeline constants
  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 180;
  const CHART_WIDTH = 600;
  const HEADER_HEIGHT = 32;
  const PIXELS_PER_MINUTE = 2;
  const MIN_BAR_WIDTH = 40;
  const CONNECTOR_RADIUS = 6;

  const taskOrder = [...allTasks].sort((a, b) => a.sort_order - b.sort_order);
  const taskPositions = new Map<string, { x: number; width: number; y: number; row: number }>();

  taskOrder.forEach((task, idx) => {
    const minutes = task.estimated_minutes || 30;
    const barWidth = Math.max(minutes * PIXELS_PER_MINUTE, MIN_BAR_WIDTH);

    let startX = 0;
    const deps = parseDependsOn(task);
    for (const depId of deps) {
      const depPos = taskPositions.get(depId);
      if (depPos) {
        startX = Math.max(startX, depPos.x + depPos.width + 20);
      }
    }

    taskPositions.set(task.id, {
      x: LABEL_WIDTH + startX,
      width: barWidth,
      y: HEADER_HEIGHT + idx * ROW_HEIGHT,
      row: idx,
    });
  });

  let maxRight = CHART_WIDTH;
  taskPositions.forEach(pos => {
    const right = pos.x + pos.width - LABEL_WIDTH;
    if (right > maxRight) maxRight = right;
  });
  const actualTotalWidth = LABEL_WIDTH + maxRight + 40;
  const totalHeight = HEADER_HEIGHT + taskOrder.length * ROW_HEIGHT + 20;
  const todayX = LABEL_WIDTH + maxRight * 0.4;

  const edges: { from: string; to: string; fromPos: { x: number; width: number; y: number }; toPos: { x: number; y: number } }[] = [];
  for (const task of taskOrder) {
    const deps = parseDependsOn(task);
    const toPos = taskPositions.get(task.id);
    if (!toPos) continue;
    for (const depId of deps) {
      const fromPos = taskPositions.get(depId);
      if (fromPos) {
        edges.push({
          from: depId,
          to: task.id,
          fromPos: { x: fromPos.x, width: fromPos.width, y: fromPos.y },
          toPos: { x: toPos.x, y: toPos.y },
        });
      }
    }
  }

  return (
    <div className="relative">
      {/* Circular dependency error */}
      {depError && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {depError}
        </div>
      )}

      {/* Remove dependency confirmation */}
      {selectedDependency && (
        <div className="mb-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-3">
          <span>
            Remove dependency: <strong>{projectTasks.find(t => t.id === selectedDependency.from)?.title || '?'}</strong>
            {' -> '}
            <strong>{projectTasks.find(t => t.id === selectedDependency.to)?.title || '?'}</strong>?
          </span>
          <button
            onClick={() => handleRemoveDependency(selectedDependency.from, selectedDependency.to)}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
          >
            Remove
          </button>
          <button
            onClick={() => setSelectedDependency(null)}
            className="px-2 py-1 bg-gw-stone-200 text-gw-stone-600 rounded text-xs font-medium hover:bg-gw-stone-300"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-gw-stone-200 rounded-lg">
        <svg
          ref={timelineSvgRef}
          width={actualTotalWidth}
          height={totalHeight}
          className="select-none"
          onMouseMove={(e) => {
            if (timelineDraggingFrom) {
              const svgRect = timelineSvgRef.current?.getBoundingClientRect();
              if (svgRect) {
                setTimelineDragPos({
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top,
                });
              }
            }
          }}
          onMouseUp={(e) => {
            if (timelineDraggingFrom) {
              const svgRect = timelineSvgRef.current?.getBoundingClientRect();
              if (svgRect) {
                const mx = e.clientX - svgRect.left;
                const my = e.clientY - svgRect.top;
                for (const task of taskOrder) {
                  if (task.id === timelineDraggingFrom) continue;
                  const pos = taskPositions.get(task.id);
                  if (pos && mx >= pos.x && mx <= pos.x + pos.width && my >= pos.y + 8 && my <= pos.y + 8 + 28) {
                    handleCreateDependency(timelineDraggingFrom, task.id);
                    break;
                  }
                }
              }
              setTimelineDraggingFrom(null);
              setTimelineDragPos(null);
            }
          }}
          onMouseLeave={() => {
            if (timelineDraggingFrom) {
              setTimelineDraggingFrom(null);
              setTimelineDragPos(null);
            }
          }}
        >
          {/* Defs for patterns and markers */}
          <defs>
            <pattern id="material-blocked-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
              <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
            </pattern>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
            </marker>
            <marker id="arrowhead-selected" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={actualTotalWidth} height={totalHeight} fill="#fafaf9" />

          {/* Header row */}
          <rect x="0" y="0" width={actualTotalWidth} height={HEADER_HEIGHT} fill="#f5f5f4" />
          <text x="12" y="21" fontSize="11" fontWeight="600" fill="#78716c">Task</text>
          <text x={LABEL_WIDTH + 8} y="21" fontSize="11" fontWeight="600" fill="#78716c">Timeline</text>
          <line x1="0" y1={HEADER_HEIGHT} x2={actualTotalWidth} y2={HEADER_HEIGHT} stroke="#e7e5e4" />

          {/* Label separator */}
          <line x1={LABEL_WIDTH} y1="0" x2={LABEL_WIDTH} y2={totalHeight} stroke="#e7e5e4" />

          {/* Row backgrounds and labels */}
          {taskOrder.map((task, idx) => {
            const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
            const isUnblocked = unblockedTasks.has(task.id);
            return (
              <g key={`row-${task.id}`}>
                <rect x="0" y={y} width={actualTotalWidth} height={ROW_HEIGHT} fill={idx % 2 === 0 ? '#fafaf9' : '#f5f5f4'} opacity="0.5" />
                <line x1="0" y1={y + ROW_HEIGHT} x2={actualTotalWidth} y2={y + ROW_HEIGHT} stroke="#e7e5e4" strokeOpacity="0.5" />

                <text
                  x="12"
                  y={y + ROW_HEIGHT / 2 + 4}
                  fontSize="12"
                  fill={task.status === 'done' ? '#a8a29e' : '#44403c'}
                  textDecoration={task.status === 'done' ? 'line-through' : 'none'}
                >
                  {task.title.length > 22 ? task.title.slice(0, 20) + '...' : task.title}
                </text>

                {task.estimated_minutes != null && (
                  <text x={LABEL_WIDTH - 8} y={y + ROW_HEIGHT / 2 + 4} fontSize="10" fill="#a8a29e" textAnchor="end">
                    {task.estimated_minutes}m
                  </text>
                )}

                {isUnblocked && (
                  <g>
                    <circle cx={LABEL_WIDTH - 16} cy={y + 10} r="6" fill="#22c55e" />
                    <text x={LABEL_WIDTH - 16} y={y + 13} fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">&#10003;</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* TODAY marker line */}
          <line
            x1={todayX}
            y1={HEADER_HEIGHT}
            x2={todayX}
            y2={totalHeight}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="6,3"
          />
          <text x={todayX} y={HEADER_HEIGHT - 4} fontSize="9" fill="#ef4444" textAnchor="middle" fontWeight="600">
            TODAY
          </text>

          {/* Dependency arrows (SVG) */}
          {edges.map((edge, idx) => {
            const startX = edge.fromPos.x + edge.fromPos.width;
            const startY = edge.fromPos.y + ROW_HEIGHT / 2;
            const endX = edge.toPos.x;
            const endY = edge.toPos.y + ROW_HEIGHT / 2;
            const isSelected = selectedDependency?.from === edge.from && selectedDependency?.to === edge.to;

            const midX = (startX + endX) / 2;
            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

            return (
              <g key={`dep-${idx}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDependency(isSelected ? null : { from: edge.from, to: edge.to });
                  }}
                />
                <path
                  d={path}
                  fill="none"
                  stroke={isSelected ? '#ef4444' : '#94a3b8'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                  className="pointer-events-none"
                />
              </g>
            );
          })}

          {/* Drag connector line (while dragging) */}
          {timelineDraggingFrom && timelineDragPos && (() => {
            const fromPos = taskPositions.get(timelineDraggingFrom);
            if (!fromPos) return null;
            const startX = fromPos.x + fromPos.width;
            const startY = fromPos.y + ROW_HEIGHT / 2;
            return (
              <line
                x1={startX}
                y1={startY}
                x2={timelineDragPos.x}
                y2={timelineDragPos.y}
                stroke={domainColor}
                strokeWidth="2"
                strokeDasharray="4,4"
                pointerEvents="none"
              />
            );
          })()}

          {/* Task bars */}
          {taskOrder.map((task) => {
            const pos = taskPositions.get(task.id);
            if (!pos) return null;
            const barY = pos.y + 8;
            const barHeight = 28;
            const isDone = task.status === 'done';
            const isBlocked = isTaskMaterialBlocked(task.id);

            return (
              <g key={`bar-${task.id}`}>
                <rect
                  x={pos.x}
                  y={barY}
                  width={pos.width}
                  height={barHeight}
                  rx="4"
                  fill={isDone ? '#d6d3d1' : domainColor}
                  opacity={isDone ? 0.5 : 0.85}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDetailTask(task);
                  }}
                />

                {isBlocked && (
                  <rect
                    x={pos.x}
                    y={barY}
                    width={pos.width}
                    height={barHeight}
                    rx="4"
                    fill="url(#material-blocked-pattern)"
                    className="pointer-events-none"
                  />
                )}

                <text
                  x={pos.x + 8}
                  y={barY + barHeight / 2 + 4}
                  fontSize="10"
                  fill="white"
                  fontWeight="500"
                  className="pointer-events-none"
                >
                  {task.title.length > Math.floor(pos.width / 7) ? task.title.slice(0, Math.floor(pos.width / 7) - 2) + '..' : task.title}
                </text>

                {isBlocked && (
                  <g className="pointer-events-none">
                    <rect x={pos.x + pos.width - 22} y={barY + 2} width="20" height="14" rx="2" fill="rgba(0,0,0,0.3)" />
                    <text x={pos.x + pos.width - 18} y={barY + 12} fontSize="8" fill="white" fontWeight="bold">
                      BLK
                    </text>
                  </g>
                )}

                <circle
                  cx={pos.x + pos.width}
                  cy={barY + barHeight / 2}
                  r={CONNECTOR_RADIUS}
                  fill={timelineDraggingFrom === task.id ? domainColor : '#e7e5e4'}
                  stroke={domainColor}
                  strokeWidth="2"
                  className="cursor-crosshair"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setTimelineDraggingFrom(task.id);
                    const svgRect = timelineSvgRef.current?.getBoundingClientRect();
                    if (svgRect) {
                      setTimelineDragPos({
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top,
                      });
                    }
                  }}
                />

                <circle
                  cx={pos.x}
                  cy={barY + barHeight / 2}
                  r={CONNECTOR_RADIUS - 1}
                  fill="#e7e5e4"
                  stroke="#d6d3d1"
                  strokeWidth="1.5"
                  className="pointer-events-none"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Timeline legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gw-stone-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: domainColor }} />
          <span>Task duration</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-red-500" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="8"><path d="M0 4 L12 4" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrowhead)" /></svg>
          <span>Dependency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm relative overflow-hidden" style={{ backgroundColor: domainColor }}>
            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)' }} />
          </div>
          <span>Material-blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 bg-gw-stone-100" style={{ borderColor: domainColor }} />
          <span>Drag to connect</span>
        </div>
      </div>
    </div>
  );
}
