import {
  ArrowLeft,
  Bookmark,
  Bus,
  MapPin,
  Radio,
  WifiOff,
  X,
} from 'lucide-react';
import { formatClockTime, formatETA, formatRelativeAge } from '../lib/format';
import type {
  RouteDetail,
  SavedItem,
  Selection,
  StopDetail,
  Vehicle,
  VehicleStopProgress,
} from '../types/transit';
import { RouteBadge, StatusBadge } from './ui/StatusBadge';

interface DetailDrawerProps {
  selection: Selection;
  canGoBack?: boolean;
  vehicle: Vehicle | null;
  vehicleStops?: VehicleStopProgress[];
  vehicleOrigin?: string;
  vehicleDestination?: string;
  followVehicle?: boolean;
  onToggleFollow?: () => void;
  routeDetail: RouteDetail | null;
  stopDetail: StopDetail | null;
  loading: boolean;
  error: string | null;
  isSaved: (kind: 'route' | 'stop', id: string) => boolean;
  onToggleSave: (item: Omit<SavedItem, 'savedAt'>) => void;
  onBack: () => void;
  onClose: () => void;
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (stopId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

export function DetailDrawer({
  selection,
  canGoBack = false,
  vehicle,
  vehicleStops = [],
  vehicleOrigin,
  vehicleDestination,
  followVehicle = false,
  onToggleFollow,
  routeDetail,
  stopDetail,
  loading,
  error,
  isSaved,
  onToggleSave,
  onBack,
  onClose,
  onSelectRoute,
  onSelectStop,
  onSelectVehicle,
}: DetailDrawerProps) {
  if (!selection) return null;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-neutral-950">
      {/* Header Bar */}
      <div className="flex min-h-[48px] items-center justify-between border-b border-[#E5E7EB] px-3 py-2 dark:border-neutral-800">
        <button
          onClick={onBack}
          className="flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#171717] transition hover:bg-[#F5F6F8] dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{canGoBack ? 'Back' : 'All'}</span>
        </button>
        <button
          onClick={onClose}
          aria-label="Close details"
          title="Close panel"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-900"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="py-12 text-center text-xs text-[#737373]">Loading details…</div>
        )}
        {error && (
          <div className="rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/5 p-3.5 text-xs text-[#dc2626] dark:text-rose-300">
            {error}
          </div>
        )}

        {/* VEHICLE DETAIL — Unavailable if disappeared from feed */}
        {selection.kind === 'vehicle' && !vehicle && !loading && (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <WifiOff className="mx-auto h-6 w-6 text-[#737373]" aria-hidden="true" />
            <h2 className="mt-2 text-sm font-semibold text-[#171717] dark:text-neutral-100">
              Location unavailable
            </h2>
            <p className="mt-1 text-xs text-[#737373]">
              This bus is not currently reporting a live GPS position in the feed.
            </p>
          </div>
        )}

        {/* VEHICLE DETAIL */}
        {selection.kind === 'vehicle' && vehicle && (
          <div className="space-y-4">
            {/* Clean Header matching reference */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {vehicle.routeShortName && (
                    <RouteBadge number={`Route ${vehicle.routeShortName}`} size="sm" />
                  )}
                  <StatusBadge freshness={vehicle.freshness} size="sm" />
                </div>
                {vehicle.routeId && (
                  <button
                    onClick={() => onSelectRoute(vehicle.routeId!)}
                    className="text-xs font-medium text-[#176B52] hover:underline dark:text-emerald-400"
                  >
                    Route details
                  </button>
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#171717] dark:text-neutral-100">
                  {vehicleDestination || vehicle.headsign || vehicle.routeLongName || 'APSRTC Bus'}
                </h2>
                {vehicleOrigin && (
                  <p className="text-xs text-[#737373] dark:text-neutral-400">
                    From {vehicleOrigin}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#737373] dark:text-neutral-400">
                <span className="font-mono-num font-medium text-[#171717] dark:text-neutral-200">
                  {vehicle.registrationNumber || vehicle.displayLabel || vehicle.label}
                </span>
                <span>·</span>
                <span>GPS {formatRelativeAge(vehicle.ageSec)}</span>
                <span>·</span>
                <span>
                  Speed <strong className="font-mono-num text-[#171717] dark:text-neutral-200">{vehicle.speedKmh > 0 ? `${vehicle.speedKmh} km/h` : '0 km/h'}</strong>
                </span>
              </div>

              {onToggleFollow && (
                <button
                  type="button"
                  onClick={onToggleFollow}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    followVehicle
                      ? 'border border-[#176B52] bg-[#eaf3f0] text-[#176B52] dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-[#176B52] text-white hover:bg-[#125642]'
                  }`}
                >
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{followVehicle ? 'Following bus' : 'Follow bus'}</span>
                </button>
              )}
            </div>

            {vehicle.freshness !== 'fresh' && (
              <div className="rounded-xl border border-[#b45309]/25 bg-[#b45309]/10 p-3 text-xs text-[#b45309] dark:text-amber-200">
                Last location update: {formatClockTime(vehicle.gpsTimestamp)} ({formatRelativeAge(vehicle.ageSec)}). Position is not live.
              </div>
            )}

            {/* Stops in order — Clean vertical timeline */}
            {vehicleStops.length > 0 && (
              <div className="border-t border-[#E5E7EB] pt-3.5 dark:border-neutral-800">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xs font-semibold text-[#171717] dark:text-neutral-100">
                      Stops in order · {vehicleStops.length}
                    </h3>
                    <span className="text-[11px] text-[#737373] dark:text-neutral-400">
                      Scheduled · IST
                    </span>
                  </div>
                  <span className="rounded-md border border-[#176B52]/25 bg-[#eaf3f0] px-2 py-0.5 text-[11px] font-medium text-[#176B52] dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Live position
                  </span>
                </div>

                {vehicleStops.every((s) => s.status === 'unknown') && (
                  <p className="mb-2.5 text-[11px] text-[#737373] dark:text-neutral-400">
                    Stop progress unavailable — showing route stops in order.
                  </p>
                )}

                <div className="space-y-0">
                  {vehicleStops.map((s, idx) => {
                    const isPassed = s.status === 'completed';
                    const isNext = s.status === 'next';
                    const isLastPassed =
                      isPassed && idx + 1 < vehicleStops.length && vehicleStops[idx + 1].status === 'next';
                    const isLast = idx === vehicleStops.length - 1;
                    const isFirst = idx === 0;
                    const inActiveSegment = isLastPassed || isNext;

                    return (
                      <button
                        key={`${s.stopId}-${s.sequence}`}
                        onClick={() => onSelectStop(s.stopId)}
                        className={`group relative flex w-full items-stretch justify-between gap-2 px-2.5 py-0 text-left transition ${
                          isLastPassed
                            ? 'rounded-t-xl bg-[#eaf3f0] dark:bg-emerald-950/30'
                            : isNext
                              ? 'rounded-b-xl bg-[#eaf3f0] dark:bg-emerald-950/35'
                              : 'rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-neutral-900'
                        }`}
                      >
                        {/* Continuous timeline rail & dot (zero vertical padding on button) */}
                        <div className="flex min-w-0 flex-1 items-stretch gap-3">
                          <div className="relative flex w-4 shrink-0 items-center justify-center">
                            {/* Top half of rail */}
                            {!isFirst && (
                              <span
                                aria-hidden="true"
                                className={`absolute top-0 bottom-1/2 w-0.5 ${
                                  isPassed || isNext
                                    ? 'bg-[#176B52]'
                                    : 'bg-[#E5E7EB] dark:bg-neutral-700'
                                }`}
                              />
                            )}
                            {/* Bottom half of rail */}
                            {!isLast && (
                              <span
                                aria-hidden="true"
                                className={`absolute top-1/2 bottom-0 w-0.5 ${
                                  isPassed
                                    ? 'bg-[#176B52]'
                                    : 'bg-[#E5E7EB] dark:bg-neutral-700'
                                }`}
                              />
                            )}
                            {/* Stop dot */}
                            <span
                              aria-hidden="true"
                              className={`relative z-10 rounded-full ${
                                isPassed
                                  ? 'h-2.5 w-2.5 bg-[#176B52]'
                                  : isNext
                                    ? 'h-3 w-3 border-2 border-[#176B52] bg-white ring-2 ring-[#176B52]/25 dark:bg-neutral-950'
                                    : 'h-2.5 w-2.5 border-2 border-[#a3a3a3] bg-white dark:border-neutral-600 dark:bg-neutral-950'
                              }`}
                            />
                            {/* Bus diamond marker on the active segment boundary */}
                            {isLastPassed && (
                              <span
                                aria-hidden="true"
                                className="absolute -bottom-1.5 z-20 h-2.5 w-2.5 rotate-45 border border-white bg-[#176B52] dark:border-neutral-950"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 py-2.5">
                            <div
                              className={`truncate text-xs ${
                                inActiveSegment
                                  ? 'font-semibold text-[#171717] dark:text-neutral-100'
                                  : isPassed
                                    ? 'font-medium text-[#171717] dark:text-neutral-200'
                                    : 'font-normal text-[#525252] dark:text-neutral-400'
                              }`}
                            >
                              {s.name}
                            </div>
                            {isNext && (
                              <div className="mt-0.5 text-[11px] font-semibold text-[#176B52] dark:text-emerald-400">
                                Next stop
                                {vehicle.etaSec && vehicle.etaSource === 'trip_update' && vehicle.freshness === 'fresh'
                                  ? ` · ${formatETA(vehicle.etaSec)}`
                                  : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 py-2.5 text-[11px]">
                          {isFirst && (
                            <span className="text-[#737373] dark:text-neutral-400">Start</span>
                          )}
                          {isLast && (
                            <span className="text-[#737373] dark:text-neutral-400">Destination</span>
                          )}
                          {s.scheduledTime && (
                            <span
                              className={`font-mono-num ${
                                inActiveSegment
                                  ? 'font-semibold text-[#171717] dark:text-neutral-100'
                                  : 'text-[#737373] dark:text-neutral-400'
                              }`}
                            >
                              {s.scheduledTime}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROUTE DETAIL */}
        {selection.kind === 'route' && !loading && routeDetail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <RouteBadge number={routeDetail.route.shortName} size="lg" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[#171717] dark:text-neutral-100">
                      {routeDetail.origin && routeDetail.destination
                        ? `${routeDetail.origin} → ${routeDetail.destination}`
                        : routeDetail.route.longName}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      {routeDetail.stops.length} stops
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  onToggleSave({
                    kind: 'route',
                    id: routeDetail.route.routeId,
                    title: `${routeDetail.route.shortName} · ${routeDetail.route.longName}`,
                    subtitle: `${routeDetail.stops.length} stops`,
                  })
                }
                aria-label={
                  isSaved('route', routeDetail.route.routeId)
                    ? 'Remove route from saved'
                    : 'Save route'
                }
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                  isSaved('route', routeDetail.route.routeId)
                    ? 'border-[#176B52] bg-[#eaf3f0] text-[#176B52] dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'border-[#E5E7EB] text-[#737373] hover:bg-[#F5F6F8] dark:border-neutral-800 dark:hover:bg-neutral-900'
                }`}
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Direction / Variant switcher */}
            {routeDetail.variants.length > 1 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#737373] uppercase">
                  Direction ({routeDetail.variants.length} available)
                </div>
                <div className="space-y-1.5">
                  {routeDetail.variants.map((v) => {
                    const active = v.routeId === routeDetail.route.routeId;
                    return (
                      <button
                        key={v.routeId}
                        onClick={() => onSelectRoute(v.routeId)}
                        className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                          active
                            ? 'border-[#176B52] bg-[#eaf3f0] font-semibold text-[#176B52] dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-[#E5E7EB] text-[#171717] hover:bg-[#F5F6F8] dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900'
                        }`}
                      >
                        <span className="truncate">
                          {active ? `Viewing: ${v.longName}` : v.longName}
                        </span>
                        <span className="font-mono-num shrink-0 text-[11px] opacity-75">
                          {v.stopCount} stops
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Buses on Route */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-[#737373] uppercase">
                  Live Buses ({routeDetail.vehicles.length})
                </h3>
              </div>
              {routeDetail.vehicles.length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900">
                  No live buses currently detected on this route.
                </div>
              ) : (
                <div className="space-y-2">
                  {routeDetail.vehicles.map((v) => (
                    <button
                      key={v.vehicleId}
                      onClick={() => onSelectVehicle(v.vehicleId)}
                      className="flex min-h-[56px] w-full items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-left transition hover:border-[#176B52]/50 hover:bg-[#F5F6F8] dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Bus
                            className={`h-4 w-4 shrink-0 ${
                              v.freshness === 'fresh' ? 'text-[#176B52]' : 'text-[#737373]'
                            }`}
                            aria-hidden="true"
                          />
                          <StatusBadge freshness={v.freshness} size="sm" />
                          {v.registrationNumber && (
                            <span className="font-mono-num text-[11px] text-[#737373]">
                              {v.registrationNumber}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-[#171717] dark:text-neutral-200">
                          {v.nextStopName
                            ? `Next: ${v.nextStopName}`
                            : `Updated ${formatRelativeAge(v.ageSec)}`}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {v.etaSec !== undefined &&
                        v.etaSource === 'trip_update' &&
                        v.freshness === 'fresh' ? (
                          <span className="font-mono-num text-xs font-bold text-[#176B52] dark:text-emerald-400">
                            {formatETA(v.etaSec)}
                          </span>
                        ) : (
                          <span className="font-mono-num text-[11px] text-[#737373]">
                            {formatRelativeAge(v.ageSec)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ordered Stops */}
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-[#737373] uppercase">
                Stops ({routeDetail.stops.length})
              </h3>
              {routeDetail.stops.length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900">
                  Stop list unavailable for this route.
                </div>
              ) : (
                <div className="relative space-y-0.5 pl-4 before:absolute before:top-4 before:bottom-4 before:left-[7px] before:w-0.5 before:bg-[#E5E7EB] dark:before:bg-neutral-800">
                  {routeDetail.stops.map((s, idx) => (
                    <button
                      key={`${s.stopId}-${s.sequence}`}
                      onClick={() => onSelectStop(s.stopId)}
                      className="group relative flex min-h-[44px] w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-900"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[13px] h-2.5 w-2.5 rounded-full border-2 border-white dark:border-neutral-950 ${
                          idx === 0 || idx === routeDetail.stops.length - 1
                            ? 'bg-[#176B52]'
                            : 'bg-[#737373]/60 group-hover:bg-[#176B52]'
                        }`}
                      />
                      <span className="truncate text-sm font-medium text-[#171717] dark:text-neutral-200">
                        {s.name}
                      </span>
                      <span className="font-mono-num text-[11px] text-[#737373]">#{s.sequence}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STOP DETAIL */}
        {selection.kind === 'stop' && !loading && stopDetail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#176B52] uppercase dark:text-emerald-400">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Bus Stop</span>
                </div>
                <h2 className="mt-1 text-base font-semibold text-[#171717] dark:text-neutral-100">
                  {stopDetail.stop.name}
                </h2>
                <p className="mt-0.5 text-xs text-[#737373]">
                  {stopDetail.routes.length} routes serving this stop
                </p>
              </div>
              <button
                onClick={() =>
                  onToggleSave({
                    kind: 'stop',
                    id: stopDetail.stop.stopId,
                    title: stopDetail.stop.name,
                    subtitle: `${stopDetail.routes.length} routes`,
                  })
                }
                aria-label={
                  isSaved('stop', stopDetail.stop.stopId)
                    ? 'Remove stop from saved'
                    : 'Save stop'
                }
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                  isSaved('stop', stopDetail.stop.stopId)
                    ? 'border-[#176B52] bg-[#eaf3f0] text-[#176B52] dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'border-[#E5E7EB] text-[#737373] hover:bg-[#F5F6F8] dark:border-neutral-800 dark:hover:bg-neutral-900'
                }`}
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Routes serving stop */}
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-[#737373] uppercase">
                Routes Serving Stop
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {stopDetail.routes.map((r) => (
                  <button
                    key={r.routeId}
                    onClick={() => onSelectRoute(r.routeId)}
                    title={r.longName}
                    className="font-mono-num min-h-[36px] rounded-lg border border-[#E5E7EB] bg-[#F5F6F8] px-2.5 py-1 text-xs font-semibold text-[#171717] transition hover:border-[#176B52] hover:bg-[#eaf3f0] hover:text-[#176B52] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    {r.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Upcoming Buses */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#176B52] uppercase dark:text-emerald-400">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Live Upcoming Buses</span>
              </div>
              {!stopDetail.feedStatus.online ? (
                <div className="rounded-xl border border-[#b45309]/25 bg-[#b45309]/10 p-3.5 text-xs text-[#b45309] dark:text-amber-200">
                  Live tracking is temporarily unavailable. Scheduled timetable is shown below.
                </div>
              ) : stopDetail.liveArrivals.length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900">
                  No live buses currently detected for this stop.
                </div>
              ) : (
                <div className="space-y-2">
                  {stopDetail.liveArrivals.map((a) => (
                    <button
                      key={`${a.vehicleId}-${a.arrivalTime}`}
                      onClick={() => onSelectVehicle(a.vehicleId)}
                      className="flex min-h-[56px] w-full items-center justify-between gap-2 rounded-xl border border-[#176B52]/25 bg-[#eaf3f0]/50 px-3.5 py-2.5 text-left transition hover:bg-[#eaf3f0] dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <RouteBadge number={a.routeShortName} size="sm" />
                          <span className="truncate text-sm font-medium text-[#171717] dark:text-neutral-100">
                            {a.headsign || a.routeLongName}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[#737373]">
                          Live · Updated{' '}
                          {formatRelativeAge(
                            Math.max(0, Math.floor(Date.now() / 1000) - a.gpsTimestamp),
                          )}
                        </div>
                      </div>
                      <span className="font-mono-num shrink-0 text-sm font-bold text-[#176B52] dark:text-emerald-400">
                        {a.etaSec > 0 ? formatETA(a.etaSec) : 'Arrival time unavailable'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Departures (Static GTFS) */}
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-[#737373] uppercase">
                Scheduled Timetable
              </h3>
              {stopDetail.scheduled.length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900">
                  No remaining scheduled departures today.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                  {stopDetail.scheduled.map((sd) => (
                    <button
                      key={`${sd.tripId}-${sd.departureTime}`}
                      onClick={() => onSelectRoute(sd.routeId)}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-xs transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-800"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono-num rounded bg-[#F5F6F8] px-1.5 py-0.5 text-xs font-semibold text-[#171717] dark:bg-neutral-800 dark:text-neutral-200">
                          {sd.shortName}
                        </span>
                        <span className="truncate text-[#171717] dark:text-neutral-300">
                          {sd.headsign || sd.longName}
                        </span>
                      </div>
                      <span className="font-mono-num shrink-0 text-xs text-[#737373]">
                        {sd.departureTime}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
