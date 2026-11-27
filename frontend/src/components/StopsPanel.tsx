import { useMemo, useState } from 'react';
import { ChevronRight, MapPin, Search } from 'lucide-react';
import type { Language, NavTab, StopItem } from '../types/transit';
import { DirectoryTabs } from './ui/DirectoryTabs';

interface StopsPanelProps {
  stops: StopItem[];
  lang?: Language;
  liveBusCount?: number;
  onSelectStop: (stopId: string) => void;
  onSwitchTab?: (tab: NavTab) => void;
}

export function StopsPanel({
  stops,
  lang = 'en',
  liveBusCount = 0,
  onSelectStop,
  onSwitchTab,
}: StopsPanelProps) {
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
      <div className="space-y-2.5 border-b border-[#E5E7EB] bg-white/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/80">
        {onSwitchTab && (
          <DirectoryTabs
            active="stops"
            lang={lang}
            liveBusCount={liveBusCount}
            onSwitch={onSwitchTab}
          />
        )}
        <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] px-3 py-1.5 focus-within:border-[#176B52] focus-within:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:bg-neutral-900">
          <Search className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter Visakhapatnam bus stops…"
            aria-label="Filter bus stops"
            className="w-full bg-transparent text-sm text-[#171717] placeholder:text-[#737373] focus:outline-none dark:text-neutral-100"
          />
        </div>
        <div className="flex justify-between text-[11px] text-[#737373]">
          <span>
            Showing <span className="font-mono-num font-medium">{filtered.length}</span> of{' '}
            <span className="font-mono-num font-medium">{stops.length}</span> stops
          </span>
        </div>
      </div>

      <div className="thin-scroll flex-1 divide-y divide-[#E5E7EB] overflow-y-auto bg-white/60 dark:divide-neutral-800 dark:bg-neutral-950/60">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-xs text-[#737373]">
            No stops match &ldquo;{filter.trim()}&rdquo;.
          </div>
        )}
        {filtered.map((s) => (
          <button
            key={s.stopId}
            onClick={() => onSelectStop(s.stopId)}
            className="group flex min-h-[54px] w-full items-center justify-between gap-2.5 px-4 py-2.5 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-50 text-indigo-600 dark:border-indigo-400/30 dark:bg-indigo-950/60 dark:text-indigo-400">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                  {s.name}
                </div>
                <div className="font-mono-num text-[11px] text-[#737373]">
                  {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
                </div>
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-[#737373] transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
