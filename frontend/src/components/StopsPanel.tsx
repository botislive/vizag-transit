import { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { StopItem } from '../types/transit';

interface StopsPanelProps {
  stops: StopItem[];
  onSelectStop: (stopId: string) => void;
}

export function StopsPanel({ stops, onSelectStop }: StopsPanelProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? stops.filter((s) => s.name.toLowerCase().includes(q) || s.stopId.toLowerCase().includes(q))
      : stops;
    return list.slice(0, 150);
  }, [stops, filter]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-slate-200/80 p-4 dark:border-slate-800">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter Visakhapatnam bus stops…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
        />
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Showing {filtered.length} of {stops.length} Vizag stops</span>
        </div>
      </div>

      <div className="thin-scroll flex-1 space-y-1 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500">No stops match "{filter.trim()}".</div>
        )}
        {filtered.map((s) => (
          <button
            key={s.stopId}
            onClick={() => onSelectStop(s.stopId)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                  {s.name}
                </div>
                <div className="font-mono-num text-[10px] text-slate-400">
                  {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
