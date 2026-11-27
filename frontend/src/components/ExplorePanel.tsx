import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Bus,
  ChevronDown,
  ChevronRight,
  Clock,
  LocateFixed,
  MapPin,
  Radio,
  Route,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDistance, formatETA, formatRelativeAge } from '../lib/format';
import type {
  FeedStatus,
  JourneyOption,
  NearbyStop,
  RouteSummary,
  SavedItem,
  StopItem,
} from '../types/transit';
import { RouteBadge, StatusBadge } from './ui/StatusBadge';

interface ExplorePanelProps {
  feedStatus: FeedStatus;
  nearbyStops: NearbyStop[];
  popularRoutes: RouteSummary[];
  recent: SavedItem[];
  userLocation: { lat: number; lon: number } | null;
  locationDenied?: boolean;
  onLocateMe: () => void;
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (stopId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

export function ExplorePanel({
  feedStatus,
  nearbyStops,
  popularRoutes,
  recent,
  userLocation,
  locationDenied = false,
  onLocateMe,
  onSelectRoute,
  onSelectStop,
  onSelectVehicle,
}: ExplorePanelProps) {
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<StopItem[]>([]);
  const [toSuggestions, setToSuggestions] = useState<StopItem[]>([]);
  const [journeys, setJourneys] = useState<JourneyOption[] | null>(null);
  const [journeyMsg, setJourneyMsg] = useState('');
  const [planning, setPlanning] = useState(false);

  // Stop autocomplete for From / To
  useEffect(() => {
    if (!fromText.trim() || fromId) {
      setFromSuggestions([]);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await api.listStops({ q: fromText.trim(), limit: 6 });
        setFromSuggestions(res.stops);
      } catch {
        setFromSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [fromText, fromId]);

  useEffect(() => {
    if (!toText.trim() || toId) {
      setToSuggestions([]);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await api.listStops({ q: toText.trim(), limit: 6 });
        setToSuggestions(res.stops);
      } catch {
        setToSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [toText, toId]);

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = fromId || fromText.trim();
    const t = toId || toText.trim();
    if (!f || !t) return;
    setPlanning(true);
    setJourneyMsg('');
    try {
      const res = await api.planJourney(f, t);
      setJourneys(res.journeys);
      if (res.message) setJourneyMsg(res.message);
    } catch (err) {
      setJourneys([]);
      setJourneyMsg((err as Error).message || 'Unable to calculate a route.');
    } finally {
      setPlanning(false);
    }
  };

  const swapStops = () => {
    setFromText(toText);
    setToText(fromText);
    setFromId(toId);
    setToId(fromId);
    setJourneys(null);
    setJourneyMsg('');
  };

  return (
    <div className="space-y-5 p-4">
      {/* Find Buses Between Two Stops — Primary Top Card */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setPlannerOpen((o) => !o)}
          aria-expanded={plannerOpen}
          className="flex min-h-[44px] w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-[#171717] dark:text-neutral-100"
        >
          <span>Find buses between two stops</span>
          <ChevronDown
            className={`h-4 w-4 text-[#737373] transition-transform duration-150 ${
              plannerOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {plannerOpen && (
          <div className="border-t border-[#E5E7EB] p-3.5 dark:border-neutral-800">
            <form onSubmit={handlePlan} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={fromText}
                      onChange={(e) => {
                        setFromText(e.target.value);
                        setFromId('');
                      }}
                      placeholder="From stop…"
                      aria-label="Origin bus stop"
                      className="min-h-[40px] w-full rounded-lg border border-[#E5E7EB] bg-[#F5F6F8] px-3 py-1.5 text-xs text-[#171717] placeholder:text-[#737373] focus:border-[#176B52] focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:border-[#229975] dark:focus:bg-neutral-950"
                    />
                    {fromSuggestions.length > 0 && (
                      <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        {fromSuggestions.map((s) => (
                          <button
                            key={s.stopId}
                            type="button"
                            onClick={() => {
                              setFromText(s.name);
                              setFromId(s.stopId);
                              setFromSuggestions([]);
                            }}
                            className="block min-h-[36px] w-full truncate rounded px-2.5 py-1.5 text-left text-xs text-[#171717] hover:bg-[#F5F6F8] dark:text-neutral-100 dark:hover:bg-neutral-800"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={toText}
                      onChange={(e) => {
                        setToText(e.target.value);
                        setToId('');
                      }}
                      placeholder="To stop…"
                      aria-label="Destination bus stop"
                      className="min-h-[40px] w-full rounded-lg border border-[#E5E7EB] bg-[#F5F6F8] px-3 py-1.5 text-xs text-[#171717] placeholder:text-[#737373] focus:border-[#176B52] focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:border-[#229975] dark:focus:bg-neutral-950"
                    />
                    {toSuggestions.length > 0 && (
                      <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        {toSuggestions.map((s) => (
                          <button
                            key={s.stopId}
                            type="button"
                            onClick={() => {
                              setToText(s.name);
                              setToId(s.stopId);
                              setToSuggestions([]);
                            }}
                            className="block min-h-[36px] w-full truncate rounded px-2.5 py-1.5 text-left text-xs text-[#171717] hover:bg-[#F5F6F8] dark:text-neutral-100 dark:hover:bg-neutral-800"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={swapStops}
                  aria-label="Swap origin and destination"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#737373] hover:bg-[#F5F6F8] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={planning || !fromText.trim() || !toText.trim()}
                className="min-h-[40px] w-full rounded-lg bg-[#176B52] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#125642] disabled:opacity-40"
              >
                {planning ? 'Finding routes…' : 'Find Routes'}
              </button>
            </form>

            {journeyMsg && (
              <p className="mt-2.5 rounded-lg bg-[#F5F6F8] p-2.5 text-xs text-[#737373] dark:bg-neutral-800 dark:text-neutral-300">
                {journeyMsg}
              </p>
            )}

            {journeys && journeys.length > 0 && (
              <div className="mt-3 space-y-2.5">
                <div className="text-[11px] font-semibold tracking-wide text-[#737373] uppercase dark:text-neutral-400">
                  {journeys.length} {journeys.length === 1 ? 'route' : 'routes'} available
                </div>
                {journeys.map((j, idx) => (
                  <div
                    key={idx}
                    className="space-y-2.5 rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {j.legs.map((leg, li) => (
                          <span key={li} className="flex items-center gap-1">
                            {li > 0 && <ArrowRight className="h-3 w-3 text-[#737373]" />}
                            <button
                              type="button"
                              onClick={() => onSelectRoute(leg.routeId)}
                              className="font-mono-num rounded-md bg-[#176B52] px-2.5 py-0.5 text-xs font-bold text-white transition hover:bg-[#125642]"
                            >
                              {leg.shortName}
                            </button>
                          </span>
                        ))}
                        <span className="text-[11px] text-[#737373] dark:text-neutral-400">
                          {j.type === 'direct' ? 'Direct' : '1 transfer'}
                        </span>
                      </div>
                      <span className="font-mono-num text-xs font-semibold text-[#171717] dark:text-neutral-100">
                        ~{j.totalMinutes} min
                      </span>
                    </div>

                    {j.legs.map((leg, li) => (
                      <div key={li} className="space-y-2 border-t border-[#E5E7EB] pt-2 first:border-t-0 first:pt-0 dark:border-neutral-700/60">
                        <div className="flex items-center justify-between text-xs text-[#171717] dark:text-neutral-200">
                          <span className="truncate font-medium">
                            {leg.fromStopName} → {leg.toStopName}
                          </span>
                          <span className="shrink-0 text-[11px] text-[#737373] dark:text-neutral-400">
                            {leg.stopCount} stops
                          </span>
                        </div>

                        {/* Live Buses Running on This Route */}
                        {leg.liveBuses && leg.liveBuses.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-[#176B52] uppercase dark:text-emerald-400">
                              <Radio className="h-3 w-3" aria-hidden="true" />
                              <span>{leg.liveBuses.length} Live {leg.liveBuses.length === 1 ? 'Bus' : 'Buses'} Running</span>
                            </div>
                            <div className="space-y-1">
                              {leg.liveBuses.slice(0, 3).map((b) => (
                                <button
                                  key={b.vehicleId}
                                  type="button"
                                  onClick={() => onSelectVehicle(b.vehicleId)}
                                  className="flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-left transition hover:border-[#176B52] dark:border-neutral-700 dark:bg-neutral-900"
                                >
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <Bus className="h-3.5 w-3.5 shrink-0 text-[#176B52] dark:text-emerald-400" aria-hidden="true" />
                                    <StatusBadge freshness={b.freshness} size="sm" />
                                    <span className="truncate text-[11px] text-[#171717] dark:text-neutral-200">
                                      {b.nextStopName ? `Next: ${b.nextStopName}` : b.label}
                                    </span>
                                  </div>
                                  <span className="font-mono-num shrink-0 text-[11px] font-semibold text-[#176B52] dark:text-emerald-400">
                                    {b.etaSec ? formatETA(b.etaSec) : formatRelativeAge(b.ageSec)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#737373] dark:text-neutral-400">
                            No live buses running right now
                          </div>
                        )}

                        {/* Upcoming Scheduled Buses */}
                        {leg.scheduledTrips && leg.scheduledTrips.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-semibold tracking-wide text-[#737373] uppercase dark:text-neutral-400">
                              <span>Upcoming Schedule</span>
                              {leg.totalScheduledToday ? (
                                <span>{leg.totalScheduledToday} trips/day</span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {leg.scheduledTrips.slice(0, 4).map((st) => (
                                <span
                                  key={st.tripId}
                                  className="font-mono-num inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] text-[#171717] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                                >
                                  <span className="font-semibold">{st.departureTime}</span>
                                  <span className="text-[#737373]">→ {st.arrivalTime}</span>
                                  {st.minutesAway <= 60 && (
                                    <span className="text-[10px] font-medium text-[#176B52] dark:text-emerald-400">
                                      ({st.minutesAway}m)
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          leg.totalScheduledToday ? (
                            <div className="text-[11px] text-[#737373] dark:text-neutral-400">
                              {leg.totalScheduledToday} scheduled trips/day (none remaining today)
                            </div>
                          ) : null
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Live Status & Location Row */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#171717] dark:text-neutral-100">
            {feedStatus.online
              ? `${feedStatus.freshCount} live buses on the map`
              : 'Live tracking temporarily unavailable'}
          </div>
          <div className="text-[11px] text-[#737373] dark:text-neutral-400">
            {userLocation
              ? 'Showing stops near your location'
              : locationDenied
                ? 'Search for a route or bus stop instead.'
                : 'Centered on Visakhapatnam'}
          </div>
        </div>
        <button
          type="button"
          onClick={onLocateMe}
          aria-label="Use current location"
          className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#171717] transition hover:bg-[#F5F6F8] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <LocateFixed className="h-3.5 w-3.5 text-[#176B52] dark:text-emerald-400" aria-hidden="true" />
          <span>Locate</span>
        </button>
      </div>

      {/* Nearby Stops */}
      <section aria-labelledby="nearby-stops-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2
            id="nearby-stops-heading"
            className="text-xs font-semibold tracking-wide text-[#737373] uppercase dark:text-neutral-400"
          >
            Nearby Bus Stops
          </h2>
          {userLocation && (
            <span className="text-[11px] font-medium text-[#176B52] dark:text-emerald-400">GPS active</span>
          )}
        </div>

        {nearbyStops.length === 0 ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            No nearby stops found. Search for a route or bus stop instead.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {nearbyStops.slice(0, 5).map((s) => (
              <button
                key={s.stopId}
                onClick={() => onSelectStop(s.stopId)}
                className="flex min-h-[48px] w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-800/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#f97316]" aria-hidden="true" />
                    <span className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                      {s.name}
                    </span>
                  </div>
                  {s.routes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-5">
                      {s.routes.slice(0, 4).map((r) => (
                        <span
                          key={r}
                          className="font-mono-num rounded bg-[#F5F6F8] px-1.5 py-0.5 text-[10px] font-semibold text-[#171717] dark:bg-neutral-800 dark:text-neutral-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-mono-num shrink-0 text-xs text-[#737373] dark:text-neutral-400">
                  {formatDistance(s.distanceM)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recently Viewed */}
      {recent.length > 0 && (
        <section aria-labelledby="recent-heading">
          <h2
            id="recent-heading"
            className="mb-2 text-xs font-semibold tracking-wide text-[#737373] uppercase dark:text-neutral-400"
          >
            Recently Viewed
          </h2>
          <div className="divide-y divide-[#E5E7EB] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {recent.slice(0, 4).map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => (item.kind === 'route' ? onSelectRoute(item.id) : onSelectStop(item.id))}
                className="flex min-h-[44px] w-full items-center justify-between gap-2.5 px-3.5 py-2 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-800/70"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {item.kind === 'route' ? (
                    <Route className="h-4 w-4 shrink-0 text-[#176B52] dark:text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-[#737373] dark:text-neutral-400" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                      {item.title}
                    </div>
                    <div className="truncate text-xs text-[#737373] dark:text-neutral-400">{item.subtitle}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Popular City Routes */}
      <section aria-labelledby="popular-routes-heading">
        <h2
          id="popular-routes-heading"
          className="mb-2 text-xs font-semibold tracking-wide text-[#737373] uppercase dark:text-neutral-400"
        >
          Popular City Routes
        </h2>
        <div className="space-y-1.5">
          {popularRoutes.slice(0, 6).map((r) => (
            <button
              key={r.routeId}
              onClick={() => onSelectRoute(r.routeId)}
              className="flex min-h-[48px] w-full items-center justify-between gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left transition hover:border-[#176B52]/40 hover:bg-[#F5F6F8] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/70"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <RouteBadge number={r.shortName} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                    {r.longName}
                  </div>
                  <div className="text-xs text-[#737373] dark:text-neutral-400">{r.stopCount} stops</div>
                </div>
              </div>
              {r.activeVehicles > 0 && (
                <span className="font-mono-num shrink-0 rounded-md bg-[#176B52]/10 px-2 py-0.5 text-xs font-semibold text-[#176B52] dark:text-emerald-400">
                  {r.activeVehicles} live
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
