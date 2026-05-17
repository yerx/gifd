export default function HorizontalBarChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-gw-stone-600 w-24 text-right truncate">{d.label}</span>
          <div className="flex-1 bg-gw-stone-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{
                width: `${Math.max((d.value / max) * 100, d.value > 0 ? 8 : 0)}%`,
                backgroundColor: d.color,
              }}
            >
              {d.value > 0 && (
                <span className="text-[10px] font-bold text-white">{d.value}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
