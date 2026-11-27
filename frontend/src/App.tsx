import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Bookmark, Bus, Compass, Languages, Maximize2, Minimize2, Route, Search, Wifi, X } from 'lucide-react';
import { api } from './lib/api';
import { useT } from './lib/i18n';
import { useLiveVehicles } from './hooks/useLiveVehicles';
import { useSavedAndRecent } from './hooks/useSavedItems';
import { useBusAlert } from './hooks/useBusAlert';
import type {
  Language,
  NavTab,
  NearbyStop,
  RouteDetail,
  RouteSummary,
  SavedJourney,
  Selection,
  StopDetail,
  StopItem,
  VehicleStopProgress,
} from './types/transit';
import { TransitMap } from './components/TransitMap';
import { SearchBar } from './components/SearchBar';
import { DetailDrawer } from './components/DetailDrawer';
import { FeedHealthBanner } from './components/ui/StatusBadge';

// Lazy-load panels so initial map view stays ultra-light
const ExplorePanel = lazy(() =>
  import('./components/ExplorePanel').then((m) => ({ default: m.ExplorePanel })),
);
const RoutesPanel = lazy(() =>
  import('./components/RoutesPanel').then((m) => ({ default: m.RoutesPanel })),
);
const StopsPanel = lazy(() =>
  import('./components/StopsPanel').then((m) => ({ default: m.StopsPanel })),
);
const BusesPanel = lazy(() =>
  import('./components/BusesPanel').then((m) => ({ default: m.BusesPanel })),
);
const SavedPanel = lazy(() =>
  import('./components/SavedPanel').then((m) => ({ default: m.SavedPanel })),
);

const VIZAG_DEFAULT_LOC = { lat: 17.73615, lon: 83.32006 }; // Maddilapalem

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vizag_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [lang, setLang] = useState<Language>(() => {
    try {
      return localStorage.getItem('vizag_lang') === 'te' ? 'te' : 'en';
    } catch {
      return 'en';
    }
  });

  const [lowDataMode, setLowDataMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vizag_low_data') === '1';
    } catch {
      return false;
    }
  });

  const t = useT(lang);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('vizag_theme', dark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem('vizag_lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('vizag_low_data', lowDataMode ? '1' : '0');
    } catch {
      // ignore
    }
  }, [lowDataMode]);

  const [networkOnline, setNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const onOnline = () => setNetworkOnline(true);
    const onOffline = () => setNetworkOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const { vehiclesMap, status: feedStatus, connected: sseConnected } = useLiveVehicles();
  const {
    saved,
    recent,
    savedJourneys,
    isSaved,
    toggleSave,
    recordRecent,
    isJourneySaved,
    saveJourney,
    removeJourney,
  } = useSavedAndRecent();
  const {
    alert: busAlert,
    permission: alertPermission,
    inAppBanner,
    enableAlert,
    cancelAlert,
    dismissBanner,
  } = useBusAlert();

  // Map-first on initial load
  const [activeTab, setActiveTab] = useState<NavTab | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [initialJourney, setInitialJourney] = useState<{ from: string; fromName?: string; to: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [selection, setSelection] = useState<Selection>(null);
  const [history, setHistory] = useState<Selection[]>([]);

  const [stops, setStops] = useState<StopItem[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<RouteSummary[]>([]);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
    ts: number;
  } | null>(null);

  const [routeDetail, setRouteDetail] = useState<RouteDetail | null>(null);
  const [stopDetail, setStopDetail] = useState<StopDetail | null>(null);
  const [vehicleStops, setVehicleStops] = useState<VehicleStopProgress[]>([]);
  const [vehicleMeta, setVehicleMeta] = useState<{ origin?: string; destination?: string }>({});
  const [followVehicle, setFollowVehicle] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Keyboard shortcut (Cmd/Ctrl+K or /) to open floating search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (!inInput && e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  // Close search popover when clicking outside
  useEffect(() => {
    if (!searchOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [searchOpen]);

  // Initial static data load (Vizag stops + popular routes)
  useEffect(() => {
    api
      .listStops({ limit: 700 })
      .then((r) => setStops(r.stops))
      .catch(() => {});
    api
      .listRoutes({ category: 'City', limit: 12 })
      .then((r) => setPopularRoutes(r.routes))
      .catch(() => {});
  }, []);

  // Load nearby stops for current or default location
  useEffect(() => {
    const loc = userLocation ?? VIZAG_DEFAULT_LOC;
    api
      .nearbyStops(loc.lat, loc.lon, 2500, 8)
      .then((r) => setNearbyStops(r.stops))
      .catch(() => {});
  }, [userLocation]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      setFlyToTarget({ ...VIZAG_DEFAULT_LOC, zoom: 13.5, ts: Date.now() });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationDenied(false);
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        setFlyToTarget({ ...loc, zoom: 14.5, ts: Date.now() });
      },
      () => {
        setLocationDenied(true);
        setFlyToTarget({ ...VIZAG_DEFAULT_LOC, zoom: 13.5, ts: Date.now() });
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const pushSelection = useCallback((next: Selection, current: Selection) => {
    if (current && (current.kind !== next?.kind || current.id !== next?.id)) {
      setHistory((prev) => [...prev.slice(-8), current]);
    }
    setSelection(next);
  }, []);

  const handleSelectVehicle = useCallback(
    async (id: string) => {
      pushSelection({ kind: 'vehicle', id }, selection);
      setStopDetail(null);
      setVehicleStops([]);
      setVehicleMeta({});
      setFollowVehicle(false);
      setDetailError(null);
      setSearchOpen(false);
      if (window.location.pathname !== `/bus/${id}`) {
        window.history.replaceState(null, '', `/bus/${id}`);
      }
      const v = vehiclesMap.get(id);
      if (v) {
        setFlyToTarget({ lat: v.lat, lon: v.lon, zoom: 15, ts: Date.now() });
      }
      try {
        const [vehRes, routeRes] = await Promise.all([
          api.getVehicle(id).catch(() => null),
          v?.routeId ? api.getRoute(v.routeId).catch(() => null) : Promise.resolve(null),
        ]);
        if (vehRes) {
          setVehicleStops(vehRes.stops);
          setVehicleMeta({ origin: vehRes.origin, destination: vehRes.destination });
        }
        if (routeRes && vehRes) {
          const patchedRoute = { ...routeRes };
          if (vehRes.shape && vehRes.shape.length >= 2) {
            patchedRoute.shape = vehRes.shape;
          }
          if (vehRes.stops && vehRes.stops.length >= 2) {
            patchedRoute.stops = vehRes.stops.map((s) => ({
              sequence: s.sequence,
              stopId: s.stopId,
              name: s.name,
              lat: s.lat,
              lon: s.lon,
            }));
          }
          setRouteDetail(patchedRoute);
        } else {
          setRouteDetail(routeRes);
        }
      } catch {
        setRouteDetail(null);
      }
    },
    [vehiclesMap, selection, pushSelection],
  );

  const handleClearRoute = useCallback(() => {
    setRouteDetail(null);
    if (selection?.kind === 'route') {
      setSelection(null);
      setHistory([]);
    }
  }, [selection]);

  const handleSelectRoute = useCallback(
    async (id: string) => {
      pushSelection({ kind: 'route', id }, selection);
      setStopDetail(null);
      setDetailLoading(true);
      setDetailError(null);
      setSearchOpen(false);
      try {
        const detail = await api.getRoute(id);
        setRouteDetail(detail);
        document.title = `Route ${detail.route.shortName} (${detail.route.longName}) — VizagTransit`;
        if (window.location.pathname !== `/routes/${id}`) {
          window.history.replaceState(null, '', `/routes/${id}`);
        }
        recordRecent({
          kind: 'route',
          id: detail.route.routeId,
          title: `${detail.route.shortName} · ${detail.route.longName}`,
          subtitle: `${detail.stops.length} stops`,
        });
      } catch (err) {
        setDetailError((err as Error).message);
      } finally {
        setDetailLoading(false);
      }
    },
    [recordRecent, selection, pushSelection],
  );

  const handleSelectStop = useCallback(
    async (id: string) => {
      pushSelection({ kind: 'stop', id }, selection);
      setRouteDetail(null);
      setDetailLoading(true);
      setDetailError(null);
      setSearchOpen(false);
      try {
        const detail = await api.getStop(id);
        setStopDetail(detail);
        document.title = `${detail.stop.name} Bus Stop — VizagTransit`;
        if (window.location.pathname !== `/stops/${id}`) {
          window.history.replaceState(null, '', `/stops/${id}`);
        }
        setFlyToTarget({ lat: detail.stop.lat, lon: detail.stop.lon, zoom: 15.2, ts: Date.now() });
        recordRecent({
          kind: 'stop',
          id: detail.stop.stopId,
          title: detail.stop.name,
          subtitle: `${detail.routes.length} routes`,
        });
      } catch (err) {
        setDetailError((err as Error).message);
      } finally {
        setDetailLoading(false);
      }
    },
    [recordRecent, selection, pushSelection],
  );

  // Sync deep link paths (/routes/:id, /route/:id, /stops/:id, /stop/:id, /bus/:id, /journey?from=...&to=...)
  useEffect(() => {
    const p = window.location.pathname;
    if (p.startsWith('/routes/')) {
      const rid = decodeURIComponent(p.slice('/routes/'.length).replace(/\/+$/, ''));
      if (rid) void handleSelectRoute(rid);
    } else if (p.startsWith('/route/')) {
      const rid = decodeURIComponent(p.slice('/route/'.length).replace(/\/+$/, ''));
      if (rid) void handleSelectRoute(rid);
    } else if (p.startsWith('/stops/')) {
      const sid = decodeURIComponent(p.slice('/stops/'.length).replace(/\/+$/, ''));
      if (sid) void handleSelectStop(sid);
    } else if (p.startsWith('/stop/')) {
      const sid = decodeURIComponent(p.slice('/stop/'.length).replace(/\/+$/, ''));
      if (sid) void handleSelectStop(sid);
    } else if (p.startsWith('/bus/')) {
      const vid = decodeURIComponent(p.slice('/bus/'.length).replace(/\/+$/, ''));
      if (vid) void handleSelectVehicle(vid);
    } else if (p.startsWith('/vehicle/')) {
      const vid = decodeURIComponent(p.slice('/vehicle/'.length).replace(/\/+$/, ''));
      if (vid) void handleSelectVehicle(vid);
    } else if (p === '/journey') {
      const sp = new URLSearchParams(window.location.search);
      const from = sp.get('from')?.trim() ?? '';
      const to = sp.get('to')?.trim() ?? '';
      if (from && to) {
        setInitialJourney({ from, to });
        setActiveTab('explore');
      }
    }
    // Run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeSelection = useCallback(() => {
    setSelection(null);
    setHistory([]);
    setRouteDetail(null);
    setStopDetail(null);
    setVehicleStops([]);
    setVehicleMeta({});
    setFollowVehicle(false);
    setDetailError(null);
    document.title = 'VizagTransit — Live Vizag Bus Tracking & APSRTC Visakhapatnam Bus Routes';
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  const closeAll = useCallback(() => {
    closeSelection();
    setActiveTab(null);
  }, [closeSelection]);

  const handleBack = useCallback(() => {
    if (history.length === 0) {
      closeSelection();
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    if (!prev) {
      closeSelection();
      return;
    }
    if (prev.kind === 'route') {
      setSelection(prev);
      setStopDetail(null);
      setDetailLoading(true);
      api
        .getRoute(prev.id)
        .then((d) => {
          setRouteDetail(d);
          document.title = `Route ${d.route.shortName} (${d.route.longName}) — VizagTransit`;
          if (window.location.pathname !== `/routes/${prev.id}`) {
            window.history.replaceState(null, '', `/routes/${prev.id}`);
          }
        })
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    } else if (prev.kind === 'stop') {
      setSelection(prev);
      setRouteDetail(null);
      setDetailLoading(true);
      api
        .getStop(prev.id)
        .then((d) => {
          setStopDetail(d);
          document.title = `${d.stop.name} Bus Stop — VizagTransit`;
          if (window.location.pathname !== `/stops/${prev.id}`) {
            window.history.replaceState(null, '', `/stops/${prev.id}`);
          }
        })
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    } else {
      setSelection(prev);
      if (window.location.pathname !== `/bus/${prev.id}`) {
        window.history.replaceState(null, '', `/bus/${prev.id}`);
      }
    }
  }, [history, closeSelection]);

  const selectedVehicle = useMemo(
    () => (selection?.kind === 'vehicle' ? vehiclesMap.get(selection.id) ?? null : null),
    [selection, vehiclesMap],
  );

  // Live-sync trip stop progress whenever the selected bus receives a new GPS fix
  useEffect(() => {
    if (selection?.kind !== 'vehicle' || !selectedVehicle) return;
    const ctrl = new AbortController();
    api
      .getVehicle(selectedVehicle.vehicleId, ctrl.signal)
      .then((res) => {
        setVehicleStops(res.stops);
        setVehicleMeta({ origin: res.origin, destination: res.destination });
      })
      .catch(() => {});
    if (followVehicle && selectedVehicle.freshness === 'fresh') {
      setFlyToTarget({
        lat: selectedVehicle.lat,
        lon: selectedVehicle.lon,
        zoom: 15.2,
        ts: Date.now(),
      });
    }
    return () => ctrl.abort();
  }, [selection?.kind, selectedVehicle?.vehicleId, selectedVehicle?.gpsTimestamp, followVehicle]);

  const panelTitles: Record<NavTab, string> = {
    explore: t.explore,
    routes: t.routes,
    stops: t.stops,
    buses: t.buses,
    saved: t.saved,
  };

  // Strict 3-item primary navigation on mobile & desktop dock (Explore, Routes, Saved)
  const dockItems: { id: 'explore' | 'routes' | 'saved'; label: string; icon: React.ReactNode; badgeCount?: number }[] = [
    { id: 'explore', label: t.explore, icon: <Compass className="h-4 w-4" aria-hidden="true" /> },
    { id: 'routes', label: t.routes, icon: <Route className="h-4 w-4" aria-hidden="true" /> },
    {
      id: 'saved',
      label: t.saved,
      icon: <Bookmark className="h-4 w-4" aria-hidden="true" />,
      badgeCount: saved.length + savedJourneys.length,
    },
  ];

  const handleDockClick = (id: 'explore' | 'routes' | 'saved') => {
    if (selection) {
      closeSelection();
      setActiveTab(id);
      return;
    }
    setActiveTab((prev) => (prev === id ? null : id));
  };

  const handlePlanFromStop = useCallback((stopId: string, stopName?: string) => {
    closeSelection();
    setInitialJourney({ from: stopId, fromName: stopName, to: '' });
    setActiveTab('explore');
  }, [closeSelection]);

  const handleOpenSavedJourney = useCallback((j: SavedJourney) => {
    setInitialJourney({ from: j.fromId, to: j.toId });
    setActiveTab('explore');
  }, []);

  const renderPanelContent = () => {
    const loadingFallback = (
      <div className="p-8 text-center text-xs text-[#737373]">Loading…</div>
    );

    switch (activeTab) {
      case 'routes':
        return (
          <Suspense fallback={loadingFallback}>
            <RoutesPanel
              lang={lang}
              liveBusCount={feedStatus.freshCount}
              onSelectRoute={handleSelectRoute}
              onSwitchTab={setActiveTab}
            />
          </Suspense>
        );
      case 'stops':
        return (
          <Suspense fallback={loadingFallback}>
            <StopsPanel
              lang={lang}
              liveBusCount={feedStatus.freshCount}
              stops={stops}
              onSelectStop={handleSelectStop}
              onSwitchTab={setActiveTab}
            />
          </Suspense>
        );
      case 'buses':
        return (
          <Suspense fallback={loadingFallback}>
            <BusesPanel
              lang={lang}
              vehiclesMap={vehiclesMap}
              onSelectVehicle={handleSelectVehicle}
              onSwitchTab={setActiveTab}
            />
          </Suspense>
        );
      case 'explore':
        return (
          <Suspense fallback={loadingFallback}>
            <ExplorePanel
              lang={lang}
              feedStatus={feedStatus}
              nearbyStops={nearbyStops}
              popularRoutes={popularRoutes}
              recent={recent}
              savedJourneys={savedJourneys}
              initialJourney={initialJourney}
              userLocation={userLocation}
              locationDenied={locationDenied}
              onLocateMe={handleLocateMe}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
              onSelectVehicle={handleSelectVehicle}
              onSwitchTab={setActiveTab}
              onSaveJourney={saveJourney}
              isJourneySaved={isJourneySaved}
            />
          </Suspense>
        );
      case 'saved':
        return (
          <Suspense fallback={loadingFallback}>
            <SavedPanel
              saved={saved}
              savedJourneys={savedJourneys}
              lang={lang}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
              onOpenJourney={handleOpenSavedJourney}
              onRemove={toggleSave}
              onRemoveJourney={removeJourney}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const drawerOpen = Boolean(selection || activeTab);
  const directorySubTabActive = activeTab === 'routes' || activeTab === 'stops' || activeTab === 'buses';

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f4f6f8] dark:bg-neutral-950">
      {/* FULL-BLEED MAP CANVAS */}
      <TransitMap
        vehiclesMap={vehiclesMap}
        stops={stops}
        selectedRoute={routeDetail}
        selection={selection}
        userLocation={userLocation}
        dark={dark}
        lowDataMode={lowDataMode}
        feedStatus={feedStatus}
        sseConnected={sseConnected}
        onToggleTheme={() => setDark((d) => !d)}
        onSelectVehicle={handleSelectVehicle}
        onSelectStop={handleSelectStop}
        onLocateMe={handleLocateMe}
        onClearRoute={handleClearRoute}
        flyToTarget={flyToTarget}
      />

      {/* COMPACT TOP HEADER BAR */}
      <header
        ref={searchWrapRef}
        className="pointer-events-none fixed top-3 right-2.5 left-2.5 z-30 flex flex-col items-start gap-2 md:top-3.5 md:right-auto md:left-3.5"
      >
        <div className="pointer-events-auto flex min-h-[46px] w-full items-center justify-between gap-1 rounded-2xl border border-black/10 bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-md md:w-auto md:justify-start md:gap-1.5 md:px-2 dark:border-white/10 dark:bg-neutral-900/95">
          <div className="flex min-w-0 items-center gap-1 md:gap-1.5">
            <button
              type="button"
              onClick={closeAll}
              title="VizagTransit — Reset panels"
              className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-1.5 py-1 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-800"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#176B52] text-white shadow-2xs">
                <Bus className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-[12.5px] font-semibold tracking-tight text-[#171717] sm:text-[13px] dark:text-neutral-100">
                VizagTransit
              </span>
            </button>

            <span className="h-5 w-px shrink-0 bg-black/10 dark:bg-white/10" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-expanded={searchOpen}
              aria-label="Search routes and stops"
              className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium whitespace-nowrap transition ${
                searchOpen
                  ? 'bg-[#eaf3f0] text-[#176B52] dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'text-[#525252] hover:bg-[#F5F6F8] hover:text-[#171717] dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t.search}</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Language Switch: EN / తెలుగు */}
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'en' ? 'te' : 'en'))}
              aria-pressed={lang === 'te'}
              aria-label={lang === 'en' ? 'Switch UI language to Telugu' : 'Switch UI language to English'}
              title={lang === 'en' ? 'Switch to తెలుగు' : 'Switch to English'}
              className={`flex min-h-[40px] items-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition ${
                lang === 'te'
                  ? 'bg-[#eaf3f0] text-[#176B52] dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'text-[#525252] hover:bg-[#F5F6F8] dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <Languages className="h-3.5 w-3.5 hidden sm:block" aria-hidden="true" />
              <span>{lang === 'en' ? 'తె' : 'EN'}</span>
            </button>

            {/* Low-Data / Lite Mode Toggle */}
            <button
              type="button"
              onClick={() => setLowDataMode((m) => !m)}
              aria-pressed={lowDataMode}
              aria-label={t.lowDataMode}
              title={lang === 'te' ? 'సాటిలైట్ మరియు అదనపు మ్యాప్ యానిమేషన్‌ను ఆపివేస్తుంది' : 'Disables satellite imagery & heavy animations'}
              className={`flex min-h-[40px] items-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition ${
                lowDataMode
                  ? 'bg-[#176B52] text-white'
                  : 'text-[#525252] hover:bg-[#F5F6F8] dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.lowDataMode}</span>
            </button>
          </div>
        </div>

        {/* Floating Search Dropdown Card */}
        {searchOpen && (
          <div className="pointer-events-auto w-full rounded-2xl border border-black/10 bg-white/95 p-2 shadow-xl backdrop-blur-md md:w-[min(370px,calc(100vw-28px))] dark:border-white/10 dark:bg-neutral-900/95">
            <SearchBar
              recent={recent}
              autoFocus
              placeholder={t.searchPlaceholder}
              onClose={() => setSearchOpen(false)}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
            />
          </div>
        )}
      </header>

      {/* IN-APP ARRIVAL ALERT BANNER */}
      {inAppBanner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[66px] left-1/2 z-40 flex w-[calc(100vw-20px)] max-w-md -translate-x-1/2 items-center justify-between gap-2 rounded-2xl border border-[#176B52]/30 bg-[#176B52] px-3.5 py-2.5 text-xs font-medium text-white shadow-lg"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{inAppBanner}</span>
          </span>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss alert"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-white/15"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* EXPANDABLE MOBILE BOTTOM SHEET / DESKTOP LEFT RAIL */}
      {drawerOpen && (
        <aside
          aria-label="Transit navigation and details"
          className={`fixed right-2.5 bottom-[78px] left-2.5 z-20 flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur-md transition-[max-height] duration-200 sm:bottom-[94px] md:top-[68px] md:right-auto md:bottom-4 md:left-3.5 md:max-h-none md:w-[370px] dark:border-white/10 dark:bg-neutral-950/95 ${
            sheetExpanded ? 'max-h-[80vh]' : 'max-h-[56vh]'
          }`}
        >
          <FeedHealthBanner online={feedStatus.online} networkOnline={networkOnline} />

          {selection ? (
            <DetailDrawer
              selection={selection}
              lang={lang}
              canGoBack={history.length > 0}
              sheetExpanded={sheetExpanded}
              onToggleSheetExpand={() => setSheetExpanded((e) => !e)}
              vehicle={selectedVehicle}
              vehicleStops={vehicleStops}
              vehicleOrigin={vehicleMeta.origin}
              vehicleDestination={vehicleMeta.destination}
              followVehicle={followVehicle}
              onToggleFollow={() => setFollowVehicle((f) => !f)}
              routeDetail={routeDetail}
              stopDetail={stopDetail}
              loading={detailLoading}
              error={detailError}
              isSaved={isSaved}
              onToggleSave={toggleSave}
              busAlert={busAlert}
              alertPermission={alertPermission}
              onEnableAlert={enableAlert}
              onCancelAlert={cancelAlert}
              onPlanFromStop={handlePlanFromStop}
              onBack={handleBack}
              onClose={closeSelection}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
              onSelectVehicle={handleSelectVehicle}
            />
          ) : (
            activeTab && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex min-h-[48px] shrink-0 items-center justify-between border-b border-[#E5E7EB] px-3.5 py-2 dark:border-neutral-800">
                  <h2 className="text-sm font-semibold text-[#171717] dark:text-neutral-100">
                    {panelTitles[activeTab]}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSheetExpanded((e) => !e)}
                      aria-label={sheetExpanded ? t.collapseSheet : t.expandSheet}
                      title={sheetExpanded ? t.collapseSheet : t.expandSheet}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] md:hidden dark:hover:bg-neutral-900"
                    >
                      {sheetExpanded ? (
                        <Minimize2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(null)}
                      aria-label="Close panel"
                      title="Close panel"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-900"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
                  {renderPanelContent()}
                </div>
              </div>
            )
          )}
        </aside>
      )}

      {/* 3-ITEM PRIMARY BOTTOM NAVIGATION DOCK (Explore · Routes · Saved) */}
      <nav
        aria-label="Primary"
        className="pointer-events-auto fixed bottom-2.5 left-1/2 z-20 mb-[env(safe-area-inset-bottom)] flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-black/10 bg-white/95 p-1 shadow-lg backdrop-blur-md sm:bottom-9 sm:gap-1 dark:border-white/10 dark:bg-neutral-900/95"
      >
        {dockItems.map((item) => {
          const active =
            !selection &&
            (activeTab === item.id || (item.id === 'routes' && directorySubTabActive));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleDockClick(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[44px] items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition sm:gap-1.5 sm:px-5 sm:text-xs ${
                active
                  ? 'bg-[#eaf3f0] font-semibold text-[#176B52] dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'text-[#525252] hover:bg-[#F5F6F8] hover:text-[#171717] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className="ml-0.5 rounded-full bg-[#176B52] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-white">
                  {item.badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* SUBTLE BOTTOM DISCLAIMER / LIVE COUNT PILL (tablet & desktop, clear of mobile attribution) */}
      <div className="pointer-events-none fixed bottom-1.5 left-1/2 z-10 hidden max-w-[calc(100vw-24px)] -translate-x-1/2 items-center sm:flex">
        <div className="pointer-events-auto flex items-center gap-1.5 truncate rounded-full border border-black/8 bg-white/90 px-3 py-0.5 text-[10.5px] whitespace-nowrap text-[#737373] shadow-2xs backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/90 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                feedStatus.online && sseConnected
                  ? 'bg-[#15803d]'
                  : feedStatus.online
                    ? 'bg-[#b45309]'
                    : 'bg-[#dc2626]'
              }`}
            />
            <span className="font-mono-num font-semibold text-[#171717] dark:text-neutral-200">
              {feedStatus.online
                ? `${feedStatus.freshCount} live`
                : lang === 'te'
                  ? 'ఆఫ్‌లైన్'
                  : 'Offline'}
            </span>
            <span>·</span>
          </span>
          <span className="truncate">
            {lang === 'te'
              ? 'APSRTC విశాఖ · లైవ్ బస్సుల సమాచారం మరియు సమయాలు మారవచ్చు.'
              : 'APSRTC Vizag · Live bus locations & timings may vary.'}
          </span>
        </div>
      </div>
    </div>
  );
}
