import type {
  CatalogueResponse,
  JourneyResponse,
  NearbyStop,
  ReportKind,
  RouteDetail,
  RouteSummary,
  SearchResponse,
  StopDetail,
  StopItem,
  VehicleDetailResponse,
} from '../types/transit';

const CACHE_PREFIX = 'vt_cache_v1_';

function saveCache(key: string, data: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore storage full
  }
}

function loadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    // Static GTFS data remains valid offline
    return parsed.data;
  } catch {
    return null;
  }
}

async function fetchJSON<T>(url: string, signal?: AbortSignal, cacheKey?: string): Promise<T> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) msg = body.error;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    const data = (await res.json()) as T;
    if (cacheKey) saveCache(cacheKey, data);
    return data;
  } catch (err) {
    if ((err as Error).name !== 'AbortError' && cacheKey) {
      const cached = loadCache<T>(cacheKey);
      if (cached) return cached;
    }
    throw err;
  }
}

export const api = {
  search: (q: string, signal?: AbortSignal) =>
    fetchJSON<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`, signal),

  listCatalogue: (
    params: { q?: string; classification?: string; limit?: number; offset?: number },
    signal?: AbortSignal,
  ) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.classification && params.classification !== 'all')
      sp.set('classification', params.classification);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    const cacheKey = !params.q ? `cat_${params.classification || 'all'}` : undefined;
    return fetchJSON<CatalogueResponse>(`/api/catalogue?${sp.toString()}`, signal, cacheKey);
  },

  listRoutes: (
    params: { q?: string; category?: string; limit?: number; offset?: number },
    signal?: AbortSignal,
  ) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.category && params.category !== 'All') sp.set('category', params.category);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    const cacheKey = !params.q && !params.offset ? `routes_${params.category || 'All'}` : undefined;
    return fetchJSON<{ routes: RouteSummary[]; total: number }>(
      `/api/routes?${sp.toString()}`,
      signal,
      cacheKey,
    );
  },

  getRoute: (id: string, signal?: AbortSignal) =>
    fetchJSON<RouteDetail>(`/api/routes/${encodeURIComponent(id)}`, signal, `route_${id}`),

  getVehicle: (id: string, signal?: AbortSignal) =>
    fetchJSON<VehicleDetailResponse>(`/api/vehicles/${encodeURIComponent(id)}`, signal),

  listStops: (params: { q?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    const cacheKey = !params.q && !params.offset ? 'stops_all' : undefined;
    return fetchJSON<{ stops: StopItem[]; total: number }>(
      `/api/stops?${sp.toString()}`,
      signal,
      cacheKey,
    );
  },

  getStop: (id: string, signal?: AbortSignal) =>
    fetchJSON<StopDetail>(`/api/stops/${encodeURIComponent(id)}`, signal, `stop_${id}`),

  nearbyStops: (lat: number, lon: number, radius = 2500, limit = 12, signal?: AbortSignal) =>
    fetchJSON<{ stops: NearbyStop[] }>(
      `/api/nearby-stops?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`,
      signal,
    ),

  planJourney: (from: string, to: string, signal?: AbortSignal) =>
    fetchJSON<JourneyResponse>(
      `/api/journey?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      signal,
    ),

  submitReport: async (payload: {
    kind: ReportKind;
    routeId?: string;
    stopId?: string;
    vehicleId?: string;
    note?: string;
  }) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error || `Report failed (${res.status})`);
    }
    return body as { id: number; status: string; recordedAt: number; message: string };
  },
};
