import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MapPin, Navigation, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import type { RouteSummary, SavedItem, SearchResponse, StopItem } from '../types/transit';
import { RouteBadge } from './ui/StatusBadge';

interface SearchBarProps {
  recent?: SavedItem[];
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (stopId: string) => void;
  onClose?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

type FlatOption =
  | { kind: 'route'; route: RouteSummary }
  | { kind: 'stop'; stop: StopItem }
  | { kind: 'destination'; destination: string; route: RouteSummary }
  | { kind: 'recent'; item: SavedItem };

export function SearchBar({
  recent = [],
  onSelectRoute,
  onSelectStop,
  onClose,
  autoFocus = false,
  placeholder = 'Search route number, destination or bus stop...',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(autoFocus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      setError(null);
      setActiveIndex(-1);
      return;
    }

    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.search(q, ctrl.signal);
        setResults(res);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Unable to search right now. Try again.');
          setResults({ routes: [], stops: [], vehicles: [] });
        }
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Rank results: 1. Exact route match, 2. Route prefix, 3. Exact stop, 4. Destination, 5. Partial
  const ranked = useMemo(() => {
    if (!results) return { routes: [], stops: [], destinations: [] as { destination: string; route: RouteSummary }[] };
    const qLower = query.trim().toLowerCase();

    const sortedRoutes = [...results.routes].sort((a, b) => {
      const aNum = a.shortName.toLowerCase();
      const bNum = b.shortName.toLowerCase();
      const aExact = aNum === qLower ? 0 : aNum.startsWith(qLower) ? 1 : 2;
      const bExact = bNum === qLower ? 0 : bNum.startsWith(qLower) ? 1 : 2;
      if (aExact !== bExact) return aExact - bExact;
      return b.tripCount - a.tripCount;
    });

    const sortedStops = [...results.stops].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aScore = aName === qLower ? 0 : aName.startsWith(qLower) ? 1 : 2;
      const bScore = bName === qLower ? 0 : bName.startsWith(qLower) ? 1 : 2;
      return aScore - bScore;
    });

    // Extract destination matches for passengers searching by area/destination
    const destSeen = new Set<string>();
    const destinations: { destination: string; route: RouteSummary }[] = [];
    for (const r of sortedRoutes) {
      const dest = r.destination || r.longName.split('–').pop()?.trim() || '';
      if (dest && dest.toLowerCase().includes(qLower) && !destSeen.has(r.routeId)) {
        destSeen.add(r.routeId);
        destinations.push({ destination: dest, route: r });
        if (destinations.length >= 4) break;
      }
    }

    return {
      routes: sortedRoutes.slice(0, 6),
      stops: sortedStops.slice(0, 6),
      destinations,
    };
  }, [results, query]);

  const flatOptions = useMemo<FlatOption[]>(() => {
    const q = query.trim();
    if (!q) {
      return recent.slice(0, 4).map((item) => ({ kind: 'recent', item }));
    }
    const list: FlatOption[] = [];
    for (const route of ranked.routes) list.push({ kind: 'route', route });
    for (const stop of ranked.stops) list.push({ kind: 'stop', stop });
    for (const d of ranked.destinations) list.push({ kind: 'destination', ...d });
    return list;
  }, [query, recent, ranked]);

  const selectOption = (opt: FlatOption) => {
    if (opt.kind === 'route') {
      onSelectRoute(opt.route.routeId);
    } else if (opt.kind === 'stop') {
      onSelectStop(opt.stop.stopId);
    } else if (opt.kind === 'destination') {
      onSelectRoute(opt.route.routeId);
    } else if (opt.kind === 'recent') {
      if (opt.item.kind === 'route') onSelectRoute(opt.item.id);
      else onSelectStop(opt.item.id);
    }
    setOpen(false);
    inputRef.current?.blur();
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      onClose?.();
      return;
    }
    if (!open) {
      if (e.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < flatOptions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
    } else if (e.key === 'Enter' && flatOptions.length > 0) {
      e.preventDefault();
      const target = activeIndex >= 0 ? flatOptions[activeIndex] : flatOptions[0];
      if (target) selectOption(target);
    }
  };

  const showRecent = open && query.trim().length === 0 && recent.length > 0;
  const showResults = open && query.trim().length > 0;
  const hasAny = ranked.routes.length > 0 || ranked.stops.length > 0 || ranked.destinations.length > 0;

  let optionCounter = -1;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        role="combobox"
        aria-expanded={showRecent || showResults}
        aria-haspopup="listbox"
        className="flex min-h-[44px] items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 shadow-xs transition duration-150 focus-within:border-[#176B52] focus-within:ring-2 focus-within:ring-[#176B52]/15 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <Search className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Search route number, destination or bus stop"
          className="w-full bg-transparent text-sm text-[#171717] placeholder:text-[#737373] focus:outline-none dark:text-neutral-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(null);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Recent Searches Dropdown */}
      {showRecent && (
        <div
          role="listbox"
          aria-label="Recent searches"
          className="thin-scroll absolute top-full right-0 left-0 z-30 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-[#737373] uppercase">
            Recent
          </div>
          {recent.slice(0, 4).map((item) => {
            optionCounter++;
            const isActive = optionCounter === activeIndex;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                role="option"
                aria-selected={isActive}
                onClick={() => selectOption({ kind: 'recent', item })}
                className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                  isActive
                    ? 'bg-[#eaf3f0] dark:bg-neutral-800'
                    : 'hover:bg-[#F5F6F8] dark:hover:bg-neutral-800/70'
                }`}
              >
                <Clock className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                    {item.title}
                  </div>
                  <div className="truncate text-xs text-[#737373]">{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && (
        <div
          role="listbox"
          aria-label="Search results"
          className="thin-scroll absolute top-full right-0 left-0 z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          {loading && !results && (
            <div className="px-3 py-5 text-center text-xs text-[#737373]">
              Searching routes and stops…
            </div>
          )}

          {error && (
            <div className="px-3 py-4 text-center text-xs text-[#b45309]">{error}</div>
          )}

          {!loading && !error && results && !hasAny && (
            <div className="px-3 py-5 text-center text-xs text-[#737373]">
              No matching route or bus stop found.
            </div>
          )}

          {ranked.routes.length > 0 && (
            <div className="mb-1">
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-[#737373] uppercase">
                Routes
              </div>
              {ranked.routes.map((r) => {
                optionCounter++;
                const isActive = optionCounter === activeIndex;
                return (
                  <button
                    key={r.routeId}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => selectOption({ kind: 'route', route: r })}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                      isActive
                        ? 'bg-[#eaf3f0] dark:bg-neutral-800'
                        : 'hover:bg-[#F5F6F8] dark:hover:bg-neutral-800/70'
                    }`}
                  >
                    <RouteBadge number={r.shortName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                        {r.longName}
                      </div>
                      <div className="text-xs text-[#737373]">
                        {r.stopCount} stops
                        {r.activeVehicles > 0 ? ` · ${r.activeVehicles} live` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {ranked.stops.length > 0 && (
            <div className="mb-1">
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-[#737373] uppercase">
                Bus stops
              </div>
              {ranked.stops.map((s) => {
                optionCounter++;
                const isActive = optionCounter === activeIndex;
                return (
                  <button
                    key={s.stopId}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => selectOption({ kind: 'stop', stop: s })}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                      isActive
                        ? 'bg-[#eaf3f0] dark:bg-neutral-800'
                        : 'hover:bg-[#F5F6F8] dark:hover:bg-neutral-800/70'
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-[#176B52]" aria-hidden="true" />
                    <span className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {ranked.destinations.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-[#737373] uppercase">
                Destinations
              </div>
              {ranked.destinations.map((d) => {
                optionCounter++;
                const isActive = optionCounter === activeIndex;
                return (
                  <button
                    key={`dest-${d.route.routeId}`}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => selectOption({ kind: 'destination', ...d })}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                      isActive
                        ? 'bg-[#eaf3f0] dark:bg-neutral-800'
                        : 'hover:bg-[#F5F6F8] dark:hover:bg-neutral-800/70'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Navigation className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                          {d.destination}
                        </div>
                        <div className="truncate text-xs text-[#737373]">
                          Served by route {d.route.shortName}
                        </div>
                      </div>
                    </div>
                    <RouteBadge number={d.route.shortName} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
