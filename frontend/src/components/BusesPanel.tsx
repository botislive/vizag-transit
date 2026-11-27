import { useMemo, useState } from 'react';
import { Bus, ChevronRight, Search } from 'lucide-react';
import type { Freshness, Vehicle } from '../types/transit';
import { formatRelativeAge } from '../lib/format';
import { RouteBadge, StatusBadge } from './ui/StatusBadge';

interface BusesPanelProps {
  vehiclesMap: Map<string, Vehicle>;
  onSelectVehicle: (vehicleId: string) => void;
}

type FilterMode = 'all' | 'fresh' | 'aging';

const FRESHNESS_ORDER: Record<Freshness, number> = {
  fresh: 0,
  aging: 1,
  stale: 2,
};

export function BusesPanel({ vehiclesMap, onSelectVehicle }: BusesPanelProps) {
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState<FilterMode>('all');

  const counts = useMemo(() => {
    let fresh = 0;
    let aging = 0;
    for (const v of vehiclesMap.values()) {
      if (v.freshness === 'fresh') fresh++;
      else if (v.freshness === 'aging') aging++;
    }
    return { total: vehiclesMap.size, fresh, aging };
  }, [vehiclesMap]);

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const items: Vehicle[] = [];
    for (const v of vehiclesMap.values()) {
      if (mode === 'fresh' && v.freshness !== 'fresh') continue;
      if (mode === 'aging' && v.freshness !== 'aging') continue;
      if (q) {
        const hay = `${v.routeShortName || ''} ${v.routeLongName || ''} ${v.headsign || ''} ${
          v.registrationNumber || v.displayLabel || v.label || ''
        } ${v.nextStopName || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      items.push(v);
    }

    items.sort((a, b) => {
      const fDiff = FRESHNESS_ORDER[a.freshness] - FRESHNESS_ORDER[b.freshness];
      if (fDiff !== 0) return fDiff;
      const ar = a.routeShortName || 'zzz';
      const br = b.routeShortName || 'zzz';
      return ar.localeCompare(br, undefined, { numeric: true });
    });

    return items.slice(0, 120);
  }, [vehiclesMap, filter, mode]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-[#E5E7EB] bg-white/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="flex min-h-[40px] items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] px-3 py-1.5 focus-within:border-[#176B52] focus-within:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:bg-neutral-900">
          <Search className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by route, bus number or stop…"
            aria-label="Filter live buses"
            className="w-full bg-transparent text-sm text-[#171717] placeholder:text-[#737373] focus:outline-none dark:text-neutral-100"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5" role="group" aria-label="Bus freshness filter">
            {(
              [
                { id: 'all', label: `All (${counts.total})` },
                { id: 'fresh', label: `Live (${counts.fresh})` },
                { id: 'aging', label: `Delayed (${counts.aging})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setMode(f.id)}
                className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  mode === f.id
                    ? 'bg-[#176B52] text-white'
                    : 'bg-[#F5F6F8] text-[#737373] hover:text-[#171717] dark:bg-neutral-900 dark:text-neutral-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="thin-scroll flex-1 divide-y divide-[#E5E7EB] overflow-y-auto bg-white/60 dark:divide-neutral-800 dark:bg-neutral-950/60">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Bus className="h-6 w-6 text-[#737373]" aria-hidden="true" />
            <p className="mt-2 text-xs text-[#737373]">No matching buses currently active.</p>
          </div>
        ) : (
          list.map((v) => (
            <button
              key={v.vehicleId}
              onClick={() => onSelectVehicle(v.vehicleId)}
              className="group flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-900"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {v.routeShortName ? (
                  <RouteBadge number={v.routeShortName} size="sm" />
                ) : (
                  <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-[#F5F6F8] text-xs font-semibold text-[#737373] dark:bg-neutral-800">
                    BUS
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#171717] dark:text-neutral-100">
                      {v.headsign || v.routeLongName || 'APSRTC Bus'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#737373]">
                    <span className="font-mono-num">
                      {v.registrationNumber || v.displayLabel || v.label}
                    </span>
                    <span>·</span>
                    <span>{formatRelativeAge(v.ageSec)}</span>
                    {v.speedKmh > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono-num">{v.speedKmh} km/h</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusBadge freshness={v.freshness} size="sm" />
                <ChevronRight
                  className="h-4 w-4 text-[#737373] transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
