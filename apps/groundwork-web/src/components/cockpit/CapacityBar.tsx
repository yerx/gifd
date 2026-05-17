export function CapacityBar({
  assignedMinutes,
  availableMinutes,
  bufferPercent,
  calendarMinutes,
}: {
  assignedMinutes: number;
  availableMinutes: number;
  bufferPercent: number;
  calendarMinutes?: number;
}) {
  const calMins = calendarMinutes || 0;
  const usable = Math.max(0, (availableMinutes - calMins) * (1 - bufferPercent / 100));
  const pct = usable > 0 ? (assignedMinutes / usable) * 100 : 0;
  const barColor = pct > 100 ? 'bg-gw-capacity-red' : pct > 80 ? 'bg-gw-capacity-amber' : 'bg-gw-capacity-green';
  const displayPct = Math.min(pct, 100);

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gw-stone-800">Capacity</h2>
        <span className="text-sm font-medium text-gw-stone-500">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full bg-gw-stone-100 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${displayPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gw-stone-400">
        <span>{assignedMinutes} min assigned</span>
        <span>
          {Math.round(usable)} min usable
          ({availableMinutes} total
          {calMins > 0 ? ` - ${calMins}m calendar` : ''}
          {' '}- {bufferPercent}% buffer)
        </span>
      </div>
    </div>
  );
}
