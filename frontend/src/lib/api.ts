import type {
  CatalogueResponse,
  JourneyResponse,
  NearbyStop,
  RouteDetail,
  RouteSummary,
  SearchResponse,
  StopDetail,
  StopItem,
  VehicleDetailResponse,
} from '../types/transit';

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
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
  return res.json() as Promise<T>;
}

export const api = {
  search: (q: string, signal?: AbortSignal) =>
    fetchJSON<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`, signal),

  listCatalogue: (params: { q?: string; classification?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.classification && params.classification !== 'all') sp.set('classification', params.classification);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    return fetchJSON<CatalogueResponse>(`/api/catalogue?${sp.toString()}`, signal);
  },

  listRoutes: (params: { q?: string; category?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.category && params.category !== 'All') sp.set('category', params.category);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    return fetchJSON<{ routes: RouteSummary[]; total: number }>(`/api/routes?${sp.toString()}`, signal);
  },

  getRoute: (id: string, signal?: AbortSignal) =>
    fetchJSON<RouteDetail>(`/api/routes/${encodeURIComponent(id)}`, signal),

  getVehicle: (id: string, signal?: AbortSignal) =>
    fetchJSON<VehicleDetailResponse>(`/api/vehicles/${encodeURIComponent(id)}`, signal),

  listStops: (params: { q?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    return fetchJSON<{ stops: StopItem[]; total: number }>(`/api/stops?${sp.toString()}`, signal);
  },

  getStop: (id: string, signal?: AbortSignal) =>
    fetchJSON<StopDetail>(`/api/stops/${encodeURIComponent(id)}`, signal),

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
};
