import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Bookmark,
  Bus,
  Check,
  Compass,
  Footprints,
  MapPin,
  Maximize2,
  Minimize2,
  Radio,
  Share2,
  WifiOff,
  X,
} from 'lucide-react';
import { formatClockTime, formatETA, formatRelativeAge } from '../lib/format';
import { useT } from '../lib/i18n';
import type {
  BusAlert,
  Language,
  RouteDetail,
  SavedItem,
  Selection,
  StopDetail,
  Vehicle,
  VehicleStopProgress,
} from '../types/transit';
import { ReportIssueModal } from './ReportIssueModal';
import { RouteBadge, StatusBadge } from './ui/StatusBadge';

interface DetailDrawerProps {
  selection: Selection;
  lang?: Language;
  canGoBack?: boolean;
  sheetState?: 'peek' | 'half' | 'full';
  onSetSheetState?: (state: 'peek' | 'half' | 'full') => void;
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
  busAlert?: BusAlert | null;
  alertPermission?: NotificationPermission;
  onEnableAlert?: (params: {
    routeId: string;
    routeShortName: string;
    stopId: string;
    stopName: string;
    thresholdMin: 10 | 5 | 2;
  }) => void;
  onCancelAlert?: () => void;
  onPlanFromStop?: (stopId: string, stopName: string) => void;
  onBack: () => void;
  onClose: () => void;
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (stopId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

export function DetailDrawer({
  selection,
  lang = 'en',
  canGoBack = false,
  sheetState = 'half',
  onSetSheetState,
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
  busAlert = null,
  alertPermission = 'default',
  onEnableAlert,
  onCancelAlert,
  onPlanFromStop,
  onBack,
  onClose,
  onSelectRoute,
  onSelectStop,
  onSelectVehicle,
}: DetailDrawerProps) {
  const t = useT(lang);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [alertStopId, setAlertStopId] = useState('');
  const [stopNotifyOpen, setStopNotifyOpen] = useState(false);
  const [alertRouteId, setAlertRouteId] = useState('');
  const [alertThreshold, setAlertThreshold] = useState<10 | 5 | 2>(5);

  if (!selection) return null;

  const sharePath =
    selection.kind === 'route'
      ? `/routes/${encodeURIComponent(selection.id)}`
      : selection.kind === 'stop'
        ? `/stops/${encodeURIComponent(selection.id)}`
        : `/bus/${encodeURIComponent(selection.id)}`;

  const handleShare = async () => {
    const url = `${window.location.origin}${sharePath}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
    } catch {
      // fall through
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const reportContext =
    selection.kind === 'vehicle'
      ? `Bus ${vehicle?.routeShortName || ''} (${vehicle?.registrationNumber || selection.id})`
      : selection.kind === 'route'
        ? `Route ${routeDetail?.route.shortName || selection.id}`
        : `Stop ${stopDetail?.stop.name || selection.id}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Header Bar with Back, Share, Report, Minimize/Expand, Close */}
      <div className="flex min-h-[46px] shrink-0 items-center justify-between border-b border-[#E5E7EB] px-2.5 py-1.5 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            onClick={onBack}
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#171717] transition hover:bg-[#F5F6F8] dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{canGoBack ? t.back : t.all}</span>
          </button>
          {sheetState === 'peek' && (
            <button
              type="button"
              onClick={() => onSetSheetState?.('half')}
              className="truncate text-xs font-semibold text-[#176B52] md:hidden dark:text-emerald-400"
            >
              {selection.kind === 'vehicle'
                ? `Route ${vehicle?.routeShortName || ''}`
                : selection.kind === 'route'
                  ? `Route ${routeDetail?.route.shortName || ''}`
                  : stopDetail?.stop.name || ''}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={handleShare}
            aria-label={t.share}
            title={t.share}
            className={`h-10 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-900 dark:hover:text-neutral-200 ${
              sheetState === 'peek' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#15803d]" aria-hidden="true" />
            ) : (
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{copied ? t.copied : t.share}</span>
          </button>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            aria-label={t.reportIssue}
            title={t.reportIssue}
            className={`h-10 w-10 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#b45309] dark:hover:bg-neutral-900 ${
              sheetState === 'peek' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </button>
          {onSetSheetState && (
            <>
              <button
                type="button"
                onClick={() =>
                  onSetSheetState(sheetState === 'peek' ? 'half' : 'peek')
                }
                aria-label={sheetState === 'peek' ? 'Restore sheet' : 'Minimize sheet to map'}
                title={sheetState === 'peek' ? 'Restore sheet' : 'Minimize to map'}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] md:hidden dark:hover:bg-neutral-900"
              >
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onSetSheetState(sheetState === 'full' ? 'half' : 'full')
                }
                aria-label={sheetState === 'full' ? t.collapseSheet : t.expandSheet}
                title={sheetState === 'full' ? t.collapseSheet : t.expandSheet}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] md:hidden dark:hover:bg-neutral-900"
              >
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            aria-label="Close details"
            title="Close panel"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {reportOpen && (
        <ReportIssueModal
          routeId={selection.kind === 'route' ? selection.id : vehicle?.routeId}
          stopId={selection.kind === 'stop' ? selection.id : undefined}
          vehicleId={selection.kind === 'vehicle' ? selection.id : undefined}
          contextLabel={reportContext}
          onClose={() => setReportOpen(false)}
        />
      )}

      <div className="thin-scroll min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4">
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
                              className={`text-xs leading-snug ${
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

            {/* Notify Me When Approaching (Route Boarding Alert) */}
            {onEnableAlert && routeDetail.stops.length > 0 && (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3 dark:border-neutral-800 dark:bg-neutral-900">
                {busAlert && busAlert.routeId === routeDetail.route.routeId ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#176B52] dark:text-emerald-400">
                        <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{t.notifyActive}: ~{busAlert.thresholdMin}m before {busAlert.stopName}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#737373]">
                        {alertPermission === 'denied'
                          ? 'Browser notification permission denied — alerts will show inside the app while open.'
                          : 'Keep this browser tab open for live arrival alerts.'}
                      </p>
                    </div>
                    {onCancelAlert && (
                      <button
                        type="button"
                        onClick={onCancelAlert}
                        className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#dc2626] dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.notifyCancel}</span>
                      </button>
                    )}
                  </div>
                ) : !notifyOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAlertStopId(routeDetail.stops[0]?.stopId || '');
                      setNotifyOpen(true);
                    }}
                    className="flex min-h-[40px] w-full items-center justify-between text-left text-xs font-semibold text-[#171717] dark:text-neutral-200"
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[#176B52]" aria-hidden="true" />
                      <span>{t.notifyMe}</span>
                    </span>
                    <span className="text-[11px] font-medium text-[#176B52]">Set alert</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#171717] dark:text-neutral-200">
                      <span>Boarding Stop Alert</span>
                      <button
                        type="button"
                        onClick={() => setNotifyOpen(false)}
                        className="text-[11px] text-[#737373] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      aria-label="Select boarding stop for alert"
                      value={alertStopId}
                      onChange={(e) => setAlertStopId(e.target.value)}
                      className="min-h-[40px] w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs text-[#171717] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    >
                      {routeDetail.stops.map((s) => (
                        <option key={`${s.stopId}-${s.sequence}`} value={s.stopId}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      {([10, 5, 2] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setAlertThreshold(m)}
                          className={`min-h-[34px] flex-1 rounded-lg border text-xs font-medium ${
                            alertThreshold === m
                              ? 'border-[#176B52] bg-[#176B52] text-white'
                              : 'border-[#E5E7EB] bg-white text-[#171717] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {m === 2 ? 'Approaching' : `${m} min`}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const st = routeDetail.stops.find((x) => x.stopId === alertStopId) || routeDetail.stops[0];
                        if (st) {
                          onEnableAlert({
                            routeId: routeDetail.route.routeId,
                            routeShortName: routeDetail.route.shortName,
                            stopId: st.stopId,
                            stopName: st.name,
                            thresholdMin: alertThreshold,
                          });
                          setNotifyOpen(false);
                        }
                      }}
                      className="min-h-[40px] w-full rounded-lg bg-[#176B52] px-3 text-xs font-semibold text-white"
                    >
                      Enable Browser Alert
                    </button>
                  </div>
                )}
              </div>
            )}

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
                        className={`flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition ${
                          active
                            ? 'border-[#176B52] bg-[#eaf3f0] font-semibold text-[#176B52] dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-[#E5E7EB] text-[#171717] hover:bg-[#F5F6F8] dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900'
                        }`}
                      >
                        <span className="leading-snug">
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
                  Live Buses ({(routeDetail.vehicles ?? []).length})
                </h3>
              </div>
              {(routeDetail.vehicles ?? []).length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900">
                  No live buses currently detected on this route.
                </div>
              ) : (
                <div className="space-y-2">
                  {(routeDetail.vehicles ?? []).map((v) => (
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
                        <div className="text-xs leading-snug text-[#171717] dark:text-neutral-200">
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
                        className="group relative flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-900"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[13px] h-2.5 w-2.5 rounded-full border-2 border-white dark:border-neutral-950 ${
                            idx === 0 || idx === routeDetail.stops.length - 1
                              ? 'bg-[#176B52]'
                              : 'bg-[#737373]/60 group-hover:bg-[#176B52]'
                          }`}
                        />
                        <span className="text-sm leading-snug font-medium text-[#171717] dark:text-neutral-200">
                          {s.name}
                        </span>
                        <span className="font-mono-num shrink-0 text-[11px] text-[#737373]">#{s.sequence}</span>
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
                  {(stopDetail.routes ?? []).length} routes serving this stop
                </p>
              </div>
              <button
                onClick={() =>
                  onToggleSave({
                    kind: 'stop',
                    id: stopDetail.stop.stopId,
                    title: stopDetail.stop.name,
                    subtitle: `${(stopDetail.routes ?? []).length} routes`,
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

            {/* Stop Quick Actions: Plan From Here & Walking Directions */}
            <div className="grid grid-cols-2 gap-2">
              {onPlanFromStop && (
                <button
                  type="button"
                  onClick={() => onPlanFromStop(stopDetail.stop.stopId, stopDetail.stop.name)}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#176B52]/30 bg-[#eaf3f0] px-3 text-xs font-semibold text-[#176B52] transition hover:bg-[#d9ece5] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>Plan from stop</span>
                </button>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${stopDetail.stop.lat},${stopDetail.stop.lon}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] px-3 text-xs font-medium text-[#171717] transition hover:bg-[#eceef1] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <Footprints className="h-4 w-4 text-[#176B52]" aria-hidden="true" />
                <span>{t.walkingDirections}</span>
              </a>
            </div>

            {/* Notify Me When Approaching (Stop Boarding Alert) */}
            {onEnableAlert && (stopDetail.routes ?? []).length > 0 && (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3 dark:border-neutral-800 dark:bg-neutral-900">
                {busAlert && busAlert.stopId === stopDetail.stop.stopId ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#176B52] dark:text-emerald-400">
                        <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {t.notifyActive}: Route {busAlert.routeShortName} (~{busAlert.thresholdMin}m)
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#737373]">
                        {alertPermission === 'denied'
                          ? 'Browser notification permission denied — alerts will show inside the app while open.'
                          : 'Keep this browser tab open for live arrival alerts.'}
                      </p>
                    </div>
                    {onCancelAlert && (
                      <button
                        type="button"
                        onClick={onCancelAlert}
                        className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#dc2626] dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.notifyCancel}</span>
                      </button>
                    )}
                  </div>
                ) : !stopNotifyOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAlertRouteId((stopDetail.routes ?? [])[0]?.routeId || '');
                      setStopNotifyOpen(true);
                    }}
                    className="flex min-h-[40px] w-full items-center justify-between text-left text-xs font-semibold text-[#171717] dark:text-neutral-200"
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[#176B52]" aria-hidden="true" />
                      <span>{t.notifyMe}</span>
                    </span>
                    <span className="text-[11px] font-medium text-[#176B52]">Set alert</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#171717] dark:text-neutral-200">
                      <span>Bus Arrival Alert</span>
                      <button
                        type="button"
                        onClick={() => setStopNotifyOpen(false)}
                        className="text-[11px] text-[#737373] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      aria-label="Select route for stop alert"
                      value={alertRouteId}
                      onChange={(e) => setAlertRouteId(e.target.value)}
                      className="min-h-[40px] w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs text-[#171717] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    >
                      {(stopDetail.routes ?? []).map((sr) => (
                        <option key={sr.routeId} value={sr.routeId}>
                          {sr.shortName} · {sr.longName}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      {([10, 5, 2] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setAlertThreshold(m)}
                          className={`min-h-[34px] flex-1 rounded-lg border text-xs font-medium ${
                            alertThreshold === m
                              ? 'border-[#176B52] bg-[#176B52] text-white'
                              : 'border-[#E5E7EB] bg-white text-[#171717] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {m === 2 ? 'Approaching' : `${m} min`}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sr =
                          (stopDetail.routes ?? []).find((x) => x.routeId === alertRouteId) ||
                          (stopDetail.routes ?? [])[0];
                        if (sr) {
                          onEnableAlert({
                            routeId: sr.routeId,
                            routeShortName: sr.shortName,
                            stopId: stopDetail.stop.stopId,
                            stopName: stopDetail.stop.name,
                            thresholdMin: alertThreshold,
                          });
                          setStopNotifyOpen(false);
                        }
                      }}
                      className="min-h-[40px] w-full rounded-lg bg-[#176B52] px-3 text-xs font-semibold text-white"
                    >
                      Enable Browser Alert
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Routes serving stop */}
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-[#737373] uppercase">
                Routes Serving Stop
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(stopDetail.routes ?? []).map((r) => (
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
              ) : (stopDetail.liveArrivals ?? []).length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900">
                  No live buses currently detected for this stop.
                </div>
              ) : (
                <div className="space-y-2">
                  {(stopDetail.liveArrivals ?? []).map((a) => (
                    <button
                      key={`${a.vehicleId}-${a.arrivalTime}`}
                      onClick={() => onSelectVehicle(a.vehicleId)}
                      className="flex min-h-[56px] w-full flex-col gap-1.5 rounded-xl border border-[#176B52]/25 bg-[#eaf3f0]/60 px-3.5 py-2.5 text-left transition hover:bg-[#eaf3f0] dark:border-emerald-900/40 dark:bg-emerald-950/25"
                    >
                      <div className="flex w-full items-start gap-2">
                        <RouteBadge number={a.routeShortName} size="sm" />
                        <span className="min-w-0 flex-1 text-sm leading-snug font-medium break-words text-[#171717] dark:text-neutral-100">
                          {a.headsign || a.routeLongName}
                        </span>
                      </div>
                      <div className="flex w-full items-center justify-between gap-2 pl-0.5">
                        <span className="text-xs text-[#737373]">
                          Live · Updated{' '}
                          {formatRelativeAge(
                            Math.max(0, Math.floor(Date.now() / 1000) - a.gpsTimestamp),
                          )}
                        </span>
                        <span
                          className={`font-mono-num shrink-0 font-bold ${
                            a.etaSec > 0
                              ? 'text-sm text-[#176B52] dark:text-emerald-400'
                              : 'text-xs text-[#737373] dark:text-neutral-400'
                          }`}
                        >
                          {a.etaSec > 0 ? formatETA(a.etaSec) : 'Arrival time unavailable'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Departure Board: Route | Destination | Arrival | Status */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-[#737373] uppercase">
                  {t.departureBoard}
                </h3>
                <span className="text-[10px] text-[#737373]">Live vs Scheduled</span>
              </div>
              {(stopDetail.liveArrivals ?? []).length === 0 && (stopDetail.scheduled ?? []).length === 0 ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] p-3.5 text-xs text-[#737373] dark:border-neutral-800 dark:bg-neutral-900">
                  No remaining scheduled departures today.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="grid grid-cols-[54px_1fr_auto_auto] gap-2 bg-[#F5F6F8] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#737373] uppercase dark:bg-neutral-900/90">
                    <span>{t.routeCol}</span>
                    <span>{t.destCol}</span>
                    <span className="text-right">{t.arrivalCol}</span>
                    <span className="text-right">{t.statusCol}</span>
                  </div>
                  {(stopDetail.scheduled ?? []).slice(0, 10).map((sd) => (
                    <button
                      key={`${sd.tripId}-${sd.departureTime}`}
                      onClick={() => onSelectRoute(sd.routeId)}
                      className="grid min-h-[46px] w-full grid-cols-[54px_1fr_auto_auto] items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-800"
                    >
                      <span className="font-mono-num inline-flex justify-center rounded bg-[#F5F6F8] px-1.5 py-0.5 text-xs font-semibold text-[#171717] dark:bg-neutral-800 dark:text-neutral-200">
                        {sd.shortName}
                      </span>
                      <span className="leading-snug text-[#171717] dark:text-neutral-200">
                        {sd.headsign || sd.longName}
                      </span>
                      <span className="font-mono-num text-right text-xs font-semibold text-[#171717] dark:text-neutral-200">
                        {sd.departureTime}
                      </span>
                      <span className="rounded bg-[#F5F6F8] px-1.5 py-0.5 text-[10px] font-medium text-[#737373] dark:bg-neutral-800 dark:text-neutral-400">
                        {t.scheduledLabel}
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
