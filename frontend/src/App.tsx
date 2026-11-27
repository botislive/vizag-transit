import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Bus, Compass, MapPin, Route, Search, X } from 'lucide-react';
import { api } from './lib/api';
import { useLiveVehicles } from './hooks/useLiveVehicles';
import { useSavedAndRecent } from './hooks/useSavedItems';
import type {
  NavTab,
  NearbyStop,
  RouteDetail,
  RouteSummary,
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

const PANEL_TITLES: Record<NavTab, string> = {
  routes: 'Routes',
  stops: 'Bus Stops',
  buses: 'Live Buses',
  plan: 'Trip Planner',
  saved: 'Saved',
};

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vizag_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('vizag_theme', dark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [dark]);

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
  const { saved, recent, isSaved, toggleSave, recordRecent } = useSavedAndRecent();

  // Map-first: no panel open on initial load
  const [activeTab, setActiveTab] = useState<NavTab | null>(null);
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

  const closeSelection = useCallback(() => {
    setSelection(null);
    setHistory([]);
    setRouteDetail(null);
    setStopDetail(null);
    setVehicleStops([]);
    setVehicleMeta({});
    setFollowVehicle(false);
    setDetailError(null);
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
        .then((d) => setRouteDetail(d))
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    } else if (prev.kind === 'stop') {
      setSelection(prev);
      setRouteDetail(null);
      setDetailLoading(true);
      api
        .getStop(prev.id)
        .then((d) => setStopDetail(d))
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    } else {
      setSelection(prev);
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

  // 4-item clean bottom dock matching reference UI
  const dockItems: { id: Exclude<NavTab, 'saved'>; label: string; icon: React.ReactNode }[] = [
    { id: 'routes', label: 'Routes', icon: <Route className="h-4 w-4" aria-hidden="true" /> },
    { id: 'stops', label: 'Stops', icon: <MapPin className="h-4 w-4" aria-hidden="true" /> },
    { id: 'buses', label: 'Buses', icon: <Bus className="h-4 w-4" aria-hidden="true" /> },
    { id: 'plan', label: 'Plan', icon: <Compass className="h-4 w-4" aria-hidden="true" /> },
  ];

  const handleDockClick = (id: Exclude<NavTab, 'saved'>) => {
    if (selection) {
      closeSelection();
      setActiveTab(id);
      return;
    }
    setActiveTab((prev) => (prev === id ? null : id));
  };

  const renderPanelContent = () => {
    const loadingFallback = (
      <div className="p-8 text-center text-xs text-[#737373]">Loading…</div>
    );

    switch (activeTab) {
      case 'routes':
        return (
          <Suspense fallback={loadingFallback}>
            <RoutesPanel onSelectRoute={handleSelectRoute} />
          </Suspense>
        );
      case 'stops':
        return (
          <Suspense fallback={loadingFallback}>
            <StopsPanel stops={stops} onSelectStop={handleSelectStop} />
          </Suspense>
        );
      case 'buses':
        return (
          <Suspense fallback={loadingFallback}>
            <BusesPanel vehiclesMap={vehiclesMap} onSelectVehicle={handleSelectVehicle} />
          </Suspense>
        );
      case 'plan':
        return (
          <Suspense fallback={loadingFallback}>
            <ExplorePanel
              feedStatus={feedStatus}
              nearbyStops={nearbyStops}
              popularRoutes={popularRoutes}
              recent={recent}
              userLocation={userLocation}
              locationDenied={locationDenied}
              onLocateMe={handleLocateMe}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
              onSelectVehicle={handleSelectVehicle}
            />
          </Suspense>
        );
      case 'saved':
        return (
          <Suspense fallback={loadingFallback}>
            <SavedPanel
              saved={saved}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
              onRemove={toggleSave}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const drawerOpen = Boolean(selection || activeTab);

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
        feedStatus={feedStatus}
        sseConnected={sseConnected}
        onToggleTheme={() => setDark((d) => !d)}
        onSelectVehicle={handleSelectVehicle}
        onSelectStop={handleSelectStop}
        onLocateMe={handleLocateMe}
        onClearRoute={handleClearRoute}
        flyToTarget={flyToTarget}
      />

      {/* TOP-LEFT FLOATING BRAND + SEARCH PILL */}
      <div
        ref={searchWrapRef}
        className="pointer-events-none fixed top-3.5 left-3.5 z-30 flex flex-col items-start gap-2"
      >
        <div className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-2xl border border-black/10 bg-white/95 px-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95">
          <button
            type="button"
            onClick={closeAll}
            title="VizagTransit — Reset panels"
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-[#F5F6F8] dark:hover:bg-neutral-800"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#176B52] text-white shadow-2xs">
              <Bus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-[#171717] dark:text-neutral-100">
              VizagTransit
            </span>
          </button>

          <span className="h-5 w-px bg-black/10 dark:bg-white/10" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-expanded={searchOpen}
            aria-label="Search routes and stops"
            className={`flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition ${
              searchOpen
                ? 'bg-[#eaf3f0] text-[#176B52] dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'text-[#525252] hover:bg-[#F5F6F8] hover:text-[#171717] dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selection) closeSelection();
              setActiveTab((prev) => (prev === 'saved' ? null : 'saved'));
              setSearchOpen(false);
            }}
            aria-label="Saved routes and stops"
            title="Saved routes & stops"
            className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition ${
              activeTab === 'saved' && !selection
                ? 'bg-[#eaf3f0] text-[#176B52] dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'text-[#525252] hover:bg-[#F5F6F8] hover:text-[#171717] dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            {saved.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#176B52] dark:bg-emerald-400"
              />
            )}
          </button>
        </div>

        {/* Floating Search Dropdown Card */}
        {searchOpen && (
          <div className="pointer-events-auto w-[min(360px,calc(100vw-28px))] rounded-2xl border border-black/10 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95">
            <SearchBar
              recent={recent}
              autoFocus
              onClose={() => setSearchOpen(false)}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
            />
          </div>
        )}
      </div>

      {/* FLOATING LEFT PANEL (Desktop) / FLOATING BOTTOM SHEET (Mobile) */}
      {drawerOpen && (
        <aside
          aria-label="Transit navigation and details"
          className="fixed right-3 bottom-[84px] left-3 z-20 flex max-h-[58vh] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur-md md:top-[68px] md:right-auto md:bottom-4 md:left-3.5 md:max-h-none md:w-[360px] dark:border-white/10 dark:bg-neutral-950/95"
        >
          <FeedHealthBanner online={feedStatus.online} networkOnline={networkOnline} />

          {selection ? (
            <DetailDrawer
              selection={selection}
              canGoBack={history.length > 0}
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
              onBack={handleBack}
              onClose={closeSelection}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
              onSelectVehicle={handleSelectVehicle}
            />
          ) : (
            activeTab && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex min-h-[46px] shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4 py-2 dark:border-neutral-800">
                  <h2 className="text-sm font-semibold text-[#171717] dark:text-neutral-100">
                    {PANEL_TITLES[activeTab]}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    aria-label="Close panel"
                    title="Close panel"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-900"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
                  {renderPanelContent()}
                </div>
              </div>
            )
          )}
        </aside>
      )}

      {/* BOTTOM-CENTER FLOATING 4-TAB NAVIGATION DOCK */}
      <nav
        aria-label="Primary"
        className="pointer-events-auto fixed bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95"
      >
        {dockItems.map((item) => {
          const active = !selection && activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleDockClick(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition sm:px-3.5 ${
                active
                  ? 'bg-[#eaf3f0] font-semibold text-[#176B52] dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'text-[#525252] hover:bg-[#F5F6F8] hover:text-[#171717] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* SUBTLE BOTTOM DISCLAIMER / MOBILE LIVE COUNT PILL */}
      <div className="pointer-events-none fixed bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 items-center">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-black/8 bg-white/88 px-3 py-0.5 text-[10.5px] whitespace-nowrap text-[#737373] shadow-2xs backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/88 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1 sm:hidden">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                feedStatus.online && sseConnected
                  ? 'bg-[#15803d]'
                  : feedStatus.online
                    ? 'bg-[#b45309]'
                    : 'bg-[#dc2626]'
              }`}
            />
            <span className="font-mono-num font-semibold text-[#171717] dark:text-neutral-200">
              {feedStatus.online ? `${feedStatus.freshCount} live` : 'Offline'}
            </span>
            <span>·</span>
          </span>
          <span>APSRTC Vizag · Live bus locations &amp; timings may vary.</span>
        </div>
      </div>
    </div>
  );
}
