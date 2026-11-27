import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Compass, Layers, LocateFixed, Minus, Moon, Plus, Sun, X } from 'lucide-react';
import type { FeedStatus, RouteDetail, Selection, StopItem, Vehicle } from '../types/transit';
import { formatRelativeAge } from '../lib/format';

interface TransitMapProps {
  vehiclesMap: Map<string, Vehicle>;
  stops: StopItem[];
  selectedRoute: RouteDetail | null;
  selection: Selection;
  userLocation: { lat: number; lon: number } | null;
  dark: boolean;
  feedStatus: FeedStatus;
  sseConnected: boolean;
  onToggleTheme: () => void;
  onSelectVehicle: (id: string) => void;
  onSelectStop: (id: string) => void;
  onLocateMe: () => void;
  onClearRoute?: () => void;
  flyToTarget: { lat: number; lon: number; zoom?: number; ts: number } | null;
}

const VIZAG_CENTER: [number, number] = [83.285, 17.732];

// High-performance, open-source vector map styles (no API key required, no watermarks, free forever)
function getMapStyle(dark: boolean): string {
  return dark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/positron';
}

// Satellite imagery style (Esri World Imagery + place/road labels overlay, no API key required)
function getSatelliteStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution:
          'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
      'esri-labels': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 17,
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 18,
      },
      {
        id: 'esri-labels-layer',
        type: 'raster',
        source: 'esri-labels',
        minzoom: 0,
        maxzoom: 18,
      },
    ],
  };
}

// Fallback raster style using standard OpenStreetMap tiles
function getFallbackRasterStyle(dark: boolean): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'osm-layer',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 19,
        paint: dark ? { 'raster-brightness-max': 0.72, 'raster-contrast': 0.15 } : {},
      },
    ],
  };
}

/**
 * Creates a crisp, retina-ready (2x pixelRatio) transit bus logo badge for MapLibre GL JS.
 * Logical display size is 32x32px (badge diameter ~24px) for clean, uncluttered map density.
 */
function createBusImage(fillColor: string, strokeColor: string, isSelected = false): ImageData {
  const size = 64; // 2x retina -> 32x32 logical px
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  // Selected outer ring
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(cx, cy, 29, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(23, 107, 82, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.strokeStyle = '#176B52';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Circular badge with subtle shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.arc(cx, cy, isSelected ? 22 : 20, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
  ctx.restore();

  // Crisp front-facing transit bus icon (white)
  const bw = 18;
  const bh = 19;
  const bx = cx - bw / 2;
  const by = cy - bh / 2 - 1;

  // Bus body silhouette
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.fill();

  // Side mirrors
  ctx.fillRect(bx - 2.2, by + 5, 2, 4.5);
  ctx.fillRect(bx + bw + 0.2, by + 5, 2, 4.5);

  // Wheels
  ctx.fillRect(bx + 2, by + bh - 0.5, 3.5, 3);
  ctx.fillRect(bx + bw - 5.5, by + bh - 0.5, 3.5, 3);

  // Wide front windshield (cutout in badge color)
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(bx + 2.2, by + 3.5, bw - 4.4, 7.5, 1.8);
  ctx.fill();

  // Destination header bar
  ctx.fillRect(bx + 5, by + 1.4, bw - 10, 1.3);

  // Headlights (badge color dots on white lower bumper)
  ctx.beginPath();
  ctx.arc(bx + 4, by + 14.5, 1.6, 0, Math.PI * 2);
  ctx.arc(bx + bw - 4, by + 14.5, 1.6, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

export function TransitMap({
  vehiclesMap,
  stops,
  selectedRoute,
  selection,
  userLocation,
  dark,
  feedStatus,
  sseConnected,
  onToggleTheme,
  onSelectVehicle,
  onSelectStop,
  onLocateMe,
  onClearRoute,
  flyToTarget,
}: TransitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const fallbackActiveRef = useRef(false);

  const [satellite, setSatellite] = useState(false);

  const darkRef = useRef(dark);
  darkRef.current = dark;

  const satelliteRef = useRef(satellite);
  satelliteRef.current = satellite;

  const callbacksRef = useRef({ onSelectVehicle, onSelectStop });
  callbacksRef.current = { onSelectVehicle, onSelectStop };

  const dataRef = useRef({ vehiclesMap, stops, selectedRoute, selection, userLocation });
  dataRef.current = { vehiclesMap, stops, selectedRoute, selection, userLocation };

  // Initialize MapLibre once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(darkRef.current),
      center: VIZAG_CENTER,
      zoom: 12.2,
      minZoom: 9.5,
      maxZoom: 17.5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    // Graceful fallback to standard OSM if vector style fails to load
    map.on('error', (e) => {
      if (
        !fallbackActiveRef.current &&
        e?.error &&
        (String(e.error).includes('style') || String(e.error).includes('Failed to fetch'))
      ) {
        fallbackActiveRef.current = true;
        map.setStyle(getFallbackRasterStyle(darkRef.current));
      }
    });

    const setupLayers = () => {
      loadedRef.current = true;
      const isDark = darkRef.current || satelliteRef.current;

      // Register or update custom directional passenger bus icons
      const icons = [
        ['bus-fresh', '#176B52', '#ffffff', false],
        ['bus-aging', '#b45309', '#ffffff', false],
        ['bus-stale', '#737373', '#f5f6f8', false],
        ['bus-selected', '#171717', '#229975', true],
      ] as const;

      for (const [id, fill, stroke, isSel] of icons) {
        if (map.hasImage(id)) {
          map.removeImage(id);
        }
        map.addImage(id, createBusImage(fill, stroke, isSel), { pixelRatio: 2 });
      }

      // Re-create sources if absent in the current style
      if (!map.getSource('stops-source')) {
        map.addSource('stops-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 11,
          clusterRadius: 40,
        });
      }
      if (!map.getSource('route-line-source')) {
        map.addSource('route-line-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.getSource('route-stops-source')) {
        map.addSource('route-stops-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.getSource('vehicles-source')) {
        map.addSource('vehicles-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.getSource('user-loc-source')) {
        map.addSource('user-loc-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // 1. Clustered Vizag bus stops (orange markers)
      if (!map.getLayer('stops-clusters')) {
        map.addLayer({
          id: 'stops-clusters',
          type: 'circle',
          source: 'stops-source',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': isDark ? '#1e293b' : '#ffffff',
            'circle-radius': ['step', ['get', 'point_count'], 12, 15, 15, 40, 18],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ea580c',
            'circle-opacity': 0.95,
          },
        });
      }
      if (!map.getLayer('stops-cluster-count')) {
        map.addLayer({
          id: 'stops-cluster-count',
          type: 'symbol',
          source: 'stops-source',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 11,
          },
          paint: {
            'text-color': isDark ? '#fdba74' : '#c2410c',
          },
        });
      }
      if (!map.getLayer('stops-circle')) {
        map.addLayer({
          id: 'stops-circle',
          type: 'circle',
          source: 'stops-source',
          filter: ['!', ['has', 'point_count']],
          minzoom: 11,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3.2, 13, 4.5, 16, 6.5],
            'circle-color': '#f97316',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': isDark ? '#111315' : '#ffffff',
            'circle-opacity': 0.95,
          },
        });
      }
      if (!map.getLayer('stops-label')) {
        map.addLayer({
          id: 'stops-label',
          type: 'symbol',
          source: 'stops-source',
          filter: ['!', ['has', 'point_count']],
          minzoom: 14.5,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.1],
            'text-anchor': 'top',
            'text-max-width': 10,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': isDark ? '#d1d5db' : '#171717',
            'text-halo-color': isDark ? '#111315' : '#ffffff',
            'text-halo-width': 1.5,
          },
        });
      }

      // 2. Active Route Highlighting Layers (crisp indigo line + white/indigo stop pins)
      if (!map.getLayer('route-glow')) {
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route-line-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#4f46e5',
            'line-width': 12,
            'line-opacity': isDark ? 0.35 : 0.16,
            'line-blur': 3,
          },
        });
      }

      if (!map.getLayer('route-casing')) {
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route-line-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': isDark ? '#0f172a' : '#ffffff',
            'line-width': 6.5,
            'line-opacity': 0.96,
          },
        });
      }

      if (!map.getLayer('route-line')) {
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#4f46e5',
            'line-width': 4,
            'line-opacity': 1.0,
          },
        });
      }

      if (!map.getLayer('route-stops-halo')) {
        map.addLayer({
          id: 'route-stops-halo',
          type: 'circle',
          source: 'route-stops-source',
          paint: {
            'circle-radius': 7,
            'circle-color': '#4f46e5',
            'circle-opacity': 0.18,
          },
        });
      }
      if (!map.getLayer('route-stops-circle')) {
        map.addLayer({
          id: 'route-stops-circle',
          type: 'circle',
          source: 'route-stops-source',
          paint: {
            'circle-radius': 4.5,
            'circle-color': '#ffffff',
            'circle-stroke-width': 2.25,
            'circle-stroke-color': '#4f46e5',
          },
        });
      }
      if (!map.getLayer('route-stops-label')) {
        map.addLayer({
          id: 'route-stops-label',
          type: 'symbol',
          source: 'route-stops-source',
          minzoom: 13.5,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11.5,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-max-width': 9,
          },
          paint: {
            'text-color': isDark ? '#e0e7ff' : '#312e81',
            'text-halo-color': isDark ? '#111315' : '#ffffff',
            'text-halo-width': 2,
          },
        });
      }

      // 3. User location layer
      if (!map.getLayer('user-loc-halo')) {
        map.addLayer({
          id: 'user-loc-halo',
          type: 'circle',
          source: 'user-loc-source',
          paint: {
            'circle-radius': 16,
            'circle-color': '#176B52',
            'circle-opacity': 0.2,
          },
        });
      }
      if (!map.getLayer('user-loc-dot')) {
        map.addLayer({
          id: 'user-loc-dot',
          type: 'circle',
          source: 'user-loc-source',
          paint: {
            'circle-radius': 6.5,
            'circle-color': '#176B52',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#ffffff',
          },
        });
      }

      // 4. Live Actual Bus Vehicles Layer
      if (!map.getLayer('vehicles-layer')) {
        map.addLayer({
          id: 'vehicles-layer',
          type: 'symbol',
          source: 'vehicles-source',
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 13, 0.9, 16, 1.05],
            'icon-rotation-alignment': 'viewport',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'text-field': ['step', ['zoom'], '', 12.5, ['get', 'shortName']],
            'text-size': 10.5,
            'text-offset': [0, 1.3],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'icon-opacity': [
              'case',
              ['==', ['get', 'isSelected'], true],
              1.0,
              ['==', ['get', 'isRouteActive'], true],
              1.0,
              ['==', ['get', 'hasActiveRoute'], true],
              0.35,
              ['==', ['get', 'freshness'], 'stale'],
              0.45,
              0.96,
            ],
            'text-color': isDark ? '#f8fafc' : '#0f172a',
            'text-halo-color': isDark ? '#090d16' : '#ffffff',
            'text-halo-width': 1.6,
            'text-opacity': [
              'case',
              ['==', ['get', 'isSelected'], true],
              1.0,
              ['==', ['get', 'isRouteActive'], true],
              1.0,
              ['==', ['get', 'hasActiveRoute'], true],
              0.35,
              1.0,
            ],
          },
        });
      }

      // Hydrate current data into sources
      syncAllSources(map, dataRef.current);
    };

    map.on('style.load', setupLayers);

    map.on('click', 'vehicles-layer', (e) => {
      const f = e.features?.[0];
      const id = f?.properties?.vehicleId as string | undefined;
      if (id) callbacksRef.current.onSelectVehicle(id);
    });

    map.on('click', 'route-stops-circle', (e) => {
      const f = e.features?.[0];
      const id = f?.properties?.stopId as string | undefined;
      if (id) callbacksRef.current.onSelectStop(id);
    });

    map.on('click', 'stops-clusters', async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['stops-clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      if (clusterId === undefined) return;
      const src = map.getSource('stops-source') as maplibregl.GeoJSONSource;
      try {
        const zoom = await src.getClusterExpansionZoom(clusterId);
        const geom = features[0].geometry as GeoJSON.Point;
        map.easeTo({
          center: geom.coordinates as [number, number],
          zoom: Math.min(zoom, 16),
          duration: 350,
        });
      } catch {
        // ignore cluster expansion failure
      }
    });

    map.on('click', 'stops-circle', (e) => {
      const veh = map.queryRenderedFeatures(e.point, { layers: ['vehicles-layer'] });
      if (veh.length > 0) return;
      const f = e.features?.[0];
      const id = f?.properties?.stopId as string | undefined;
      if (id) callbacksRef.current.onSelectStop(id);
    });

    for (const layerId of ['vehicles-layer', 'stops-circle', 'stops-clusters', 'route-stops-circle']) {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    return () => {
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Theme & satellite mode switch without destroying map instance
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const maxZ = satellite ? 17 : 17.5;
    map.setMaxZoom(maxZ);
    if (map.getZoom() > maxZ) {
      map.zoomTo(maxZ, { duration: 200 });
    }
    if (satellite) {
      map.setStyle(getSatelliteStyle());
    } else if (fallbackActiveRef.current) {
      map.setStyle(getFallbackRasterStyle(dark));
    } else {
      map.setStyle(getMapStyle(dark));
    }
  }, [dark, satellite]);

  // Track previous coordinates for restrained interpolation between valid fresh GPS updates
  const prevCoordsRef = useRef<Map<string, { lat: number; lon: number }>>(new Map());
  const animFrameRef = useRef<number | null>(null);

  // Incremental vehicle updates with restrained interpolation (fresh GPS only)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const startCoords = new Map<string, { lat: number; lon: number }>();
    let needsAnim = false;

    for (const [id, v] of vehiclesMap.entries()) {
      const prev = prevCoordsRef.current.get(id);
      if (
        prev &&
        v.freshness === 'fresh' &&
        (prev.lat !== v.lat || prev.lon !== v.lon) &&
        Math.abs(prev.lat - v.lat) < 0.015 &&
        Math.abs(prev.lon - v.lon) < 0.015
      ) {
        startCoords.set(id, prev);
        needsAnim = true;
      }
    }

    const commitPrev = () => {
      const nextPrev = new Map<string, { lat: number; lon: number }>();
      for (const [id, v] of vehiclesMap.entries()) {
        nextPrev.set(id, { lat: v.lat, lon: v.lon });
      }
      prevCoordsRef.current = nextPrev;
    };

    if (!needsAnim) {
      updateVehiclesSource(map, vehiclesMap, selection, selectedRoute?.route.routeId);
      commitPrev();
      return;
    }

    const duration = 700;
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const interpolated = new Map<string, Vehicle>();

      for (const [id, v] of vehiclesMap.entries()) {
        const from = startCoords.get(id);
        if (from && v.freshness === 'fresh') {
          interpolated.set(id, {
            ...v,
            lat: from.lat + (v.lat - from.lat) * ease,
            lon: from.lon + (v.lon - from.lon) * ease,
          });
        } else {
          interpolated.set(id, v);
        }
      }

      updateVehiclesSource(map, interpolated, selection, selectedRoute?.route.routeId);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        animFrameRef.current = null;
        commitPrev();
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [vehiclesMap, selection, selectedRoute]);

  // Stops source update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    updateStopsSource(map, stops);
  }, [stops]);

  // Selected route geometry + stops update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    updateSelectedRouteSource(map, selectedRoute);
    if (
      selectedRoute &&
      selectedRoute.shape &&
      selectedRoute.shape.length >= 2 &&
      selection?.kind === 'route'
    ) {
      const bounds = new maplibregl.LngLatBounds();
      for (const [lon, lat] of selectedRoute.shape) {
        bounds.extend([lon, lat]);
      }
      map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, maxZoom: 14.5, duration: 600 });
    }
  }, [selectedRoute, selection]);

  // User location update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource('user-loc-source') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(
      userLocation
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [userLocation.lon, userLocation.lat] },
                properties: {},
              },
            ],
          }
        : { type: 'FeatureCollection', features: [] },
    );
  }, [userLocation]);

  // Fly-to target
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    map.flyTo({
      center: [flyToTarget.lon, flyToTarget.lat],
      zoom: flyToTarget.zoom ?? Math.max(map.getZoom(), 14.5),
      duration: 600,
    });
  }, [flyToTarget]);

  const nowSec = Math.floor(Date.now() / 1000);
  const feedAge = feedStatus.feedTimestamp ? Math.max(0, nowSec - feedStatus.feedTimestamp) : 0;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating Active Route Banner (Top Center on Desktop, below search on mobile) */}
      {selectedRoute && (
        <div className="pointer-events-auto absolute top-16 left-1/2 z-10 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 shadow-sm md:top-3 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="font-mono-num rounded-md bg-[#176B52] px-2 py-0.5 text-xs font-bold text-white">
            {selectedRoute.route.shortName}
          </span>
          <span className="max-w-[170px] truncate text-xs font-medium text-[#171717] sm:max-w-[280px] dark:text-neutral-100">
            {selectedRoute.route.longName}
          </span>
          {onClearRoute && (
            <button
              onClick={onClearRoute}
              aria-label="Clear highlighted route"
              title="Clear highlighted route"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Live Feed Status Pill (Top Right) */}
      <div
        role="status"
        className="pointer-events-auto absolute top-3 right-3 z-10 hidden items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium shadow-xs md:flex dark:border-neutral-800 dark:bg-neutral-900"
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${
            feedStatus.online && sseConnected
              ? 'bg-[#15803d]'
              : feedStatus.online
                ? 'bg-[#b45309]'
                : 'bg-[#dc2626]'
          }`}
        />
        <span className="text-[#171717] dark:text-neutral-200">
          {feedStatus.online ? (
            <>
              <span className="font-mono-num font-semibold">{feedStatus.freshCount}</span> live
              {feedStatus.staleCount > 0 && (
                <span className="text-[#737373]"> · {feedStatus.staleCount} delayed</span>
              )}
              {feedStatus.feedTimestamp > 0 && (
                <span className="hidden text-[#737373] lg:inline">
                  {' '}
                  · {formatRelativeAge(feedAge)}
                </span>
              )}
            </>
          ) : (
            <span className="text-[#dc2626] dark:text-rose-400">Live feed unavailable</span>
          )}
        </span>
      </div>

      {/* Floating Map Controls (Bottom Right) */}
      <div className="pointer-events-auto absolute right-3 bottom-32 z-10 flex flex-col gap-2 md:bottom-6">
        <button
          onClick={onLocateMe}
          aria-label="Find my current location"
          title="Find my location"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] shadow-sm transition hover:bg-[#F5F6F8] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <LocateFixed className="h-4.5 w-4.5 text-[#176B52]" aria-hidden="true" />
        </button>
        <button
          onClick={() => mapRef.current?.flyTo({ center: VIZAG_CENTER, zoom: 12.2, duration: 500 })}
          aria-label="Recenter map on Visakhapatnam"
          title="Recenter Visakhapatnam"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] shadow-sm transition hover:bg-[#F5F6F8] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <Compass className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <button
          onClick={() => setSatellite((s) => !s)}
          aria-label={satellite ? 'Switch to standard map' : 'Switch to satellite map'}
          aria-pressed={satellite}
          title={satellite ? 'Standard map' : 'Satellite view'}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition ${
            satellite
              ? 'border-[#176B52] bg-[#176B52] text-white'
              : 'border-[#E5E7EB] bg-white text-[#171717] hover:bg-[#F5F6F8] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Layers className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <button
          onClick={onToggleTheme}
          aria-label={dark ? 'Switch to light map' : 'Switch to dark map'}
          title={dark ? 'Switch to light map' : 'Switch to dark map'}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#171717] shadow-sm transition hover:bg-[#F5F6F8] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          {dark ? <Sun className="h-4.5 w-4.5" aria-hidden="true" /> : <Moon className="h-4.5 w-4.5" aria-hidden="true" />}
        </button>
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
            aria-label="Zoom in"
            title="Zoom in"
            className="flex h-10 w-11 items-center justify-center border-b border-[#E5E7EB] text-[#171717] transition hover:bg-[#F5F6F8] dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
            aria-label="Zoom out"
            title="Zoom out"
            className="flex h-10 w-11 items-center justify-center text-[#171717] transition hover:bg-[#F5F6F8] dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function syncAllSources(
  map: maplibregl.Map,
  d: {
    vehiclesMap: Map<string, Vehicle>;
    stops: StopItem[];
    selectedRoute: RouteDetail | null;
    selection: Selection;
    userLocation: { lat: number; lon: number } | null;
  },
) {
  updateStopsSource(map, d.stops);
  updateSelectedRouteSource(map, d.selectedRoute);
  updateVehiclesSource(map, d.vehiclesMap, d.selection, d.selectedRoute?.route.routeId);
}

function updateStopsSource(map: maplibregl.Map, stops: StopItem[]) {
  const src = map.getSource('stops-source') as maplibregl.GeoJSONSource | undefined;
  if (!src) return;
  src.setData({
    type: 'FeatureCollection',
    features: stops.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { stopId: s.stopId, name: s.name },
    })),
  });
}

function updateSelectedRouteSource(map: maplibregl.Map, selectedRoute: RouteDetail | null) {
  const lineSrc = map.getSource('route-line-source') as maplibregl.GeoJSONSource | undefined;
  const stopsSrc = map.getSource('route-stops-source') as maplibregl.GeoJSONSource | undefined;
  if (!lineSrc || !stopsSrc) return;

  if (!selectedRoute) {
    lineSrc.setData({ type: 'FeatureCollection', features: [] });
    stopsSrc.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const coords =
    selectedRoute.shape && selectedRoute.shape.length >= 2
      ? selectedRoute.shape
      : selectedRoute.stops.map((s) => [s.lon, s.lat] as [number, number]);

  lineSrc.setData(
    coords.length >= 2
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: coords },
              properties: {},
            },
          ],
        }
      : { type: 'FeatureCollection', features: [] },
  );

  stopsSrc.setData({
    type: 'FeatureCollection',
    features: selectedRoute.stops.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { stopId: s.stopId, name: s.name },
    })),
  });
}

function updateVehiclesSource(
  map: maplibregl.Map,
  vehiclesMap: Map<string, Vehicle>,
  selection: Selection,
  selectedRouteId?: string,
) {
  const src = map.getSource('vehicles-source') as maplibregl.GeoJSONSource | undefined;
  if (!src) return;

  const selectedVehicleId = selection?.kind === 'vehicle' ? selection.id : null;
  const features: GeoJSON.Feature[] = [];

  for (const v of vehiclesMap.values()) {
    const isSel = v.vehicleId === selectedVehicleId;
    const isRouteActive = Boolean(selectedRouteId && v.routeId === selectedRouteId);
    const icon = isSel
      ? 'bus-selected'
      : v.freshness === 'fresh'
        ? 'bus-fresh'
        : v.freshness === 'aging'
          ? 'bus-aging'
          : 'bus-stale';

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
      properties: {
        vehicleId: v.vehicleId,
        shortName: v.routeShortName || v.label || '',
        bearing: v.bearing || 0,
        freshness: v.freshness,
        isRouteActive,
        hasActiveRoute: Boolean(selectedRouteId),
        isSelected: isSel,
        icon,
      },
    });
  }

  src.setData({ type: 'FeatureCollection', features });
}
