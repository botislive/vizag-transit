import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Compass, Route } from 'lucide-react';
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
import { ExplorePanel } from './components/ExplorePanel';
import { DetailDrawer } from './components/DetailDrawer';
import { FeedHealthBanner } from './components/ui/StatusBadge';

// Lazy-load secondary tabs to keep initial bundle lean on mobile networks
const RoutesPanel = lazy(() =>
  import('./components/RoutesPanel').then((m) => ({ default: m.RoutesPanel })),
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

  const [tab, setTab] = useState<NavTab>('explore');
  const [selection, setSelection] = useState<Selection>(null);
  const [history, setHistory] = useState<Selection[]>([]);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

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
      setMobileSheetOpen(true);
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
        setRouteDetail(routeRes);
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
      setMobileSheetOpen(true);
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
      setMobileSheetOpen(true);
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
      setFlyToTarget({ lat: selectedVehicle.lat, lon: selectedVehicle.lon, zoom: 15.2, ts: Date.now() });
    }
    return () => ctrl.abort();
  }, [selection?.kind, selectedVehicle?.vehicleId, selectedVehicle?.gpsTimestamp, followVehicle]);

  // Strict 3-destination navigation
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'explore', label: 'Explore', icon: <Compass className="h-4 w-4" aria-hidden="true" /> },
    { id: 'routes', label: 'Routes', icon: <Route className="h-4 w-4" aria-hidden="true" /> },
    { id: 'saved', label: 'Saved', icon: <Bookmark className="h-4 w-4" aria-hidden="true" /> },
  ];

  const renderTabContent = () => {
    switch (tab) {
      case 'explore':
        return (
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
        );
      case 'routes':
        return (
          <Suspense fallback={<div className="p-8 text-center text-xs text-[#737373]">Loading routes…</div>}>
            <RoutesPanel onSelectRoute={handleSelectRoute} />
          </Suspense>
        );
      case 'saved':
        return (
          <Suspense fallback={<div className="p-8 text-center text-xs text-[#737373]">Loading saved…</div>}>
            <SavedPanel
              saved={saved}
              onSelectRoute={handleSelectRoute}
              onSelectStop={handleSelectStop}
              onRemove={toggleSave}
            />
          </Suspense>
        );
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white md:flex-row dark:bg-neutral-950">
      {/* DESKTOP SIDEBAR (~360px) */}
      <aside
        aria-label="Transit navigation and details"
        className="hidden h-full w-[360px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white md:flex dark:border-neutral-800 dark:bg-neutral-950"
      >
        <header className="space-y-3 border-b border-[#E5E7EB] p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B52] text-xs font-bold text-white">
                VT
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-[#171717] dark:text-neutral-100">
                  Vizag Transit
                </h1>
                <p className="text-[11px] text-[#737373]">APSRTC Visakhapatnam</p>
              </div>
            </div>
          </div>

          <SearchBar
            recent={recent}
            onSelectRoute={handleSelectRoute}
            onSelectStop={handleSelectStop}
          />

          {/* Desktop 3-Tab Navigation */}
          <nav aria-label="Primary" className="grid grid-cols-3 gap-1 rounded-xl bg-[#F5F6F8] p-1 dark:bg-neutral-900">
            {navItems.map((n) => {
              const active = tab === n.id && !selection;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setTab(n.id);
                    closeSelection();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-white text-[#176B52] shadow-xs dark:bg-neutral-800 dark:text-emerald-400'
                      : 'text-[#737373] hover:text-[#171717] dark:hover:text-neutral-200'
                  }`}
                >
                  {n.icon}
                  <span>{n.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <FeedHealthBanner online={feedStatus.online} networkOnline={networkOnline} />

        {/* Sidebar Body */}
        <div className="thin-scroll flex-1 overflow-y-auto">
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
            renderTabContent()
          )}
        </div>
      </aside>

      {/* MAIN MAP AREA */}
      <main className="relative flex-1">
        {/* Mobile Floating Brand + Search Bar */}
        <div className="pointer-events-auto absolute top-3 right-3 left-3 z-20 md:hidden">
          <SearchBar
            recent={recent}
            onSelectRoute={handleSelectRoute}
            onSelectStop={handleSelectStop}
          />
          {(!networkOnline || !feedStatus.online) && (
            <div className="mt-1.5 overflow-hidden rounded-xl border border-[#E5E7EB] shadow-sm dark:border-neutral-800">
              <FeedHealthBanner online={feedStatus.online} networkOnline={networkOnline} />
            </div>
          )}
        </div>

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

        {/* MOBILE EXPANDABLE BOTTOM SHEET */}
        <div
          role="region"
          aria-label="Transit details sheet"
          className={`fixed right-0 bottom-14 left-0 z-20 flex flex-col rounded-t-2xl border-t border-[#E5E7EB] bg-white shadow-xl transition-all duration-200 md:hidden dark:border-neutral-800 dark:bg-neutral-950 ${
            mobileSheetOpen ? 'h-[62vh]' : 'h-12'
          }`}
        >
          <button
            onClick={() => setMobileSheetOpen((o) => !o)}
            aria-expanded={mobileSheetOpen}
            className="flex h-12 shrink-0 items-center justify-between px-4 text-xs font-semibold text-[#171717] dark:text-neutral-100"
          >
            <span className="truncate">
              {selection
                ? selection.kind === 'vehicle'
                  ? selectedVehicle?.routeShortName
                    ? `Route ${selectedVehicle.routeShortName} · Live Bus`
                    : 'Bus Details'
                  : selection.kind === 'route'
                    ? `Route ${routeDetail?.route.shortName || ''}`
                    : stopDetail?.stop.name || 'Bus Stop'
                : `${tab.charAt(0).toUpperCase() + tab.slice(1)} · ${
                    feedStatus.online ? `${feedStatus.freshCount} live buses` : 'Offline'
                  }`}
            </span>
            {mobileSheetOpen ? (
              <ChevronDown className="h-4 w-4 text-[#737373]" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-4 w-4 text-[#737373]" aria-hidden="true" />
            )}
          </button>

          {mobileSheetOpen && (
            <div className="thin-scroll flex-1 overflow-y-auto border-t border-[#E5E7EB] dark:border-neutral-800">
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
                renderTabContent()
              )}
            </div>
          )}
        </div>

        {/* MOBILE 3-ITEM BOTTOM NAVIGATION */}
        <nav
          aria-label="Primary"
          className="pb-safe fixed right-0 bottom-0 left-0 z-30 grid h-14 grid-cols-3 border-t border-[#E5E7EB] bg-white md:hidden dark:border-neutral-800 dark:bg-neutral-950"
        >
          {navItems.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => {
                  setTab(n.id);
                  closeSelection();
                  setMobileSheetOpen(true);
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  active
                    ? 'text-[#176B52] dark:text-emerald-400'
                    : 'text-[#737373] dark:text-neutral-400'
                }`}
              >
                {n.icon}
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
