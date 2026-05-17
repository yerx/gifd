'use client';

import { useDroppable } from '@dnd-kit/core';

export default function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] max-w-[320px] rounded-lg p-3 transition-colors ${
        isOver ? 'bg-gw-green-50 ring-2 ring-gw-green-300' : 'bg-gw-stone-50'
      }`}
    >
      {children}
    </div>
  );
}
