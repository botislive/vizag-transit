import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { CatalogueEntry } from '../types/transit';
import { RouteBadge } from './ui/StatusBadge';

interface RoutesPanelProps {
  onSelectRoute: (routeId: string) => void;
}

const CLASSIFICATION_FILTERS = [
  { id: 'all', label: 'All Routes' },
  { id: 'vizag_city', label: 'City' },
  { id: 'vizag_regional', label: 'Regional' },
] as const;

export function RoutesPanel({ onSelectRoute }: RoutesPanelProps) {
  const [classification, setClassification] = useState<string>('all');
  const [filter, setFilter] = useState('');
  const [catalogue, setCatalogue] = useState<CatalogueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listCatalogue(
          { q: filter.trim(), classification, limit: 120 },
          ctrl.signal,
        );
        setCatalogue(res.catalogue);
        setTotal(res.total);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setCatalogue([]);
          setError('Unable to load routes right now.');
        }
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [filter, classification]);

  return (
    <div className="flex h-full flex-col">
      {/* Search & Simple Filter */}
      <div className="space-y-3 border-b border-[#E5E7EB] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex min-h-[42px] items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] px-3 py-1.5 focus-within:border-[#176B52] focus-within:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:bg-neutral-900">
          <Search className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by route number or destination…"
            aria-label="Filter routes"
            className="w-full bg-transparent text-sm text-[#171717] placeholder:text-[#737373] focus:outline-none dark:text-neutral-100"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5" role="group" aria-label="Route type filter">
            {CLASSIFICATION_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setClassification(f.id)}
                className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-medium transition ${
                  classification === f.id
                    ? 'bg-[#176B52] text-white'
                    : 'bg-[#F5F6F8] text-[#737373] hover:text-[#171717] dark:bg-neutral-900 dark:text-neutral-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="font-mono-num text-xs text-[#737373]">{total} routes</span>
        </div>
      </div>

      {/* Route List */}
      <div className="thin-scroll flex-1 divide-y divide-[#E5E7EB] overflow-y-auto bg-white dark:divide-neutral-800 dark:bg-neutral-950">
        {loading && catalogue.length === 0 && (
          <div className="py-12 text-center text-xs text-[#737373]">Loading routes…</div>
        )}
        {error && (
          <div className="p-4 text-center text-xs text-[#b45309]">{error}</div>
        )}
        {!loading && !error && catalogue.length === 0 && (
          <div className="py-12 text-center text-xs text-[#737373]">
            No matching route or bus stop found.
          </div>
        )}
        {catalogue.map((entry) => (
          <button
            key={entry.routeNumber}
            onClick={() => onSelectRoute(entry.primaryRouteId)}
            className="group flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-900"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <RouteBadge number={entry.routeNumber} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#171717] dark:text-neutral-100">
                  <span className="truncate">{entry.origin || 'Origin'}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#737373]" aria-hidden="true" />
                  <span className="truncate">{entry.destination || 'Destination'}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#737373]">
                  <span>{entry.totalStops} stops</span>
                  {entry.variantCount > 1 && (
                    <>
                      <span>·</span>
                      <span>{entry.variantCount} directions</span>
                    </>
                  )}
                  {entry.activeVehicles > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-medium text-[#176B52] dark:text-emerald-400">
                        {entry.activeVehicles} live
                      </span>
                    </>
                  )}
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
