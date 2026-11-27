import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Info,
  Layers,
  LocateFixed,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
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

// High-performance, open-source vector map styles (no API key required)
function getMapStyle(dark: boolean): string {
  return dark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/positron';
}

// Satellite imagery style (Esri World Imagery + place/road labels overlay)
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
 */
function createBusImage(fillColor: string, strokeColor: string, isSelected = false): ImageData {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

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

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.arc(cx, cy, isSelected ? 22 : 20, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
  ctx.restore();

  const bw = 18;
  const bh = 19;
  const bx = cx - bw / 2;
  const by = cy - bh / 2 - 1;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.fill();

  ctx.fillRect(bx - 2.2, by + 5, 2, 4.5);
  ctx.fillRect(bx + bw + 0.2, by + 5, 2, 4.5);

  ctx.fillRect(bx + 2, by + bh - 0.5, 3.5, 3);
  ctx.fillRect(bx + bw - 5.5, by + bh - 0.5, 3.5, 3);

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(bx + 2.2, by + 3.5, bw - 4.4, 7.5, 1.8);
  ctx.fill();

  ctx.fillRect(bx + 5, by + 1.4, bw - 10, 1.3);

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
  const legendWrapRef = useRef<HTMLDivElement>(null);

  const [satellite, setSatellite] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const darkRef = useRef(dark);
  darkRef.current = dark;

  const satelliteRef = useRef(satellite);
  satelliteRef.current = satellite;

  const callbacksRef = useRef({ onSelectVehicle, onSelectStop });
  callbacksRef.current = { onSelectVehicle, onSelectStop };

  const dataRef = useRef({ vehiclesMap, stops, selectedRoute, selection, userLocation });
  dataRef.current = { vehiclesMap, stops, selectedRoute, selection, userLocation };

  // Close legend popover on outside click
  useEffect(() => {
    if (!legendOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (legendWrapRef.current && !legendWrapRef.current.contains(e.target as Node)) {
        setLegendOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [legendOpen]);

  // Initialize MapLibre once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(darkRef.current),
      center: VIZAG_CENTER,
      zoom: 11.8,
      minZoom: 9.5,
      maxZoom: 17.5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

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

      if (!map.getSource('stops-source')) {
        map.addSource('stops-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
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
          cluster: true,
          clusterMaxZoom: 12.8,
          clusterRadius: 42,
        });
      }
      if (!map.getSource('vehicles-focus-source')) {
        map.addSource('vehicles-focus-source', {
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

      // 1. Subtle hollow indigo rings for bus stops (low visual noise)
      if (!map.getLayer('stops-circle')) {
        map.addLayer({
          id: 'stops-circle',
          type: 'circle',
          source: 'stops-source',
          minzoom: 10.6,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10.6, 2.2, 13, 3.2, 16, 5],
            'circle-color': isDark ? '#18181b' : '#ffffff',
            'circle-stroke-width': 1.4,
            'circle-stroke-color': isDark ? '#818cf8' : '#6366f1',
            'circle-opacity': 0.9,
          },
        });
      }
      if (!map.getLayer('stops-label')) {
        map.addLayer({
          id: 'stops-label',
          type: 'symbol',
          source: 'stops-source',
          minzoom: 14.8,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.1],
            'text-anchor': 'top',
            'text-max-width': 10,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': isDark ? '#d1d5db' : '#374151',
            'text-halo-color': isDark ? '#111315' : '#ffffff',
            'text-halo-width': 1.5,
          },
        });
      }

      // 2. Active Route Highlighting Layers
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

      // 4A. Clustered Live Buses (overview zoom: crisp deep-teal pills)
      if (!map.getLayer('vehicles-clusters')) {
        map.addLayer({
          id: 'vehicles-clusters',
          type: 'circle',
          source: 'vehicles-source',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': isDark ? '#158069' : '#0f5e53',
            'circle-radius': ['step', ['get', 'point_count'], 13, 10, 15.5, 30, 18.5, 100, 21.5],
            'circle-stroke-width': 2,
            'circle-stroke-color': isDark ? '#111315' : '#ffffff',
            'circle-opacity': 0.96,
          },
        });
      }
      if (!map.getLayer('vehicles-cluster-count')) {
        map.addLayer({
          id: 'vehicles-cluster-count',
          type: 'symbol',
          source: 'vehicles-source',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 11.5,
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
      }

      // 4B. Unclustered overview dots (zoom < 13.0) for uncluttered city view
      if (!map.getLayer('vehicles-dots')) {
        map.addLayer({
          id: 'vehicles-dots',
          type: 'circle',
          source: 'vehicles-source',
          filter: ['!', ['has', 'point_count']],
          maxzoom: 13.0,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 9.5, 4, 12.8, 5.2],
            'circle-color': [
              'match',
              ['get', 'freshness'],
              'fresh',
              '#0f766e',
              'aging',
              '#b45309',
              '#737373',
            ],
            'circle-stroke-width': 1.6,
            'circle-stroke-color': isDark ? '#111315' : '#ffffff',
            'circle-opacity': [
              'case',
              ['==', ['get', 'hasActiveRoute'], true],
              0.3,
              ['==', ['get', 'freshness'], 'stale'],
              0.55,
              0.96,
            ],
          },
        });
      }

      // 4C. Detailed street-level bus badges (zoom >= 13.0)
      if (!map.getLayer('vehicles-layer')) {
        map.addLayer({
          id: 'vehicles-layer',
          type: 'symbol',
          source: 'vehicles-source',
          filter: ['!', ['has', 'point_count']],
          minzoom: 13.0,
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 16, 1.05],
            'icon-rotation-alignment': 'viewport',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'text-field': ['get', 'shortName'],
            'text-size': 10.5,
            'text-offset': [0, 1.3],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'icon-opacity': [
              'case',
              ['==', ['get', 'hasActiveRoute'], true],
              0.32,
              ['==', ['get', 'freshness'], 'stale'],
              0.45,
              0.96,
            ],
            'text-color': isDark ? '#f8fafc' : '#0f172a',
            'text-halo-color': isDark ? '#090d16' : '#ffffff',
            'text-halo-width': 1.6,
            'text-opacity': [
              'case',
              ['==', ['get', 'hasActiveRoute'], true],
              0.32,
              1.0,
            ],
          },
        });
      }

      // 4D. Focused/Selected Bus or Active Route Buses (always unclustered & visible at any zoom)
      if (!map.getLayer('vehicles-focus-layer')) {
        map.addLayer({
          id: 'vehicles-focus-layer',
          type: 'symbol',
          source: 'vehicles-focus-source',
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 13, 0.95, 16, 1.1],
            'icon-rotation-alignment': 'viewport',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'text-field': ['get', 'shortName'],
            'text-size': 11,
            'text-offset': [0, 1.35],
            'text-anchor': 'top',
            'text-allow-overlap': true,
          },
          paint: {
            'icon-opacity': 1.0,
            'text-color': isDark ? '#f8fafc' : '#0f172a',
            'text-halo-color': isDark ? '#090d16' : '#ffffff',
            'text-halo-width': 1.8,
          },
        });
      }

      syncAllSources(map, dataRef.current);
    };

    map.on('style.load', setupLayers);

    const handleVehicleClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const id = f?.properties?.vehicleId as string | undefined;
      if (id) callbacksRef.current.onSelectVehicle(id);
    };

    map.on('click', 'vehicles-focus-layer', handleVehicleClick);
    map.on('click', 'vehicles-layer', handleVehicleClick);
    map.on('click', 'vehicles-dots', handleVehicleClick);

    map.on('click', 'vehicles-clusters', async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['vehicles-clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      if (clusterId === undefined) return;
      const src = map.getSource('vehicles-source') as maplibregl.GeoJSONSource;
      try {
        const zoom = await src.getClusterExpansionZoom(clusterId);
        const geom = features[0].geometry as GeoJSON.Point;
        map.easeTo({
          center: geom.coordinates as [number, number],
          zoom: Math.min(Math.max(zoom, map.getZoom() + 1.2), 15.5),
          duration: 380,
        });
      } catch {
        // ignore cluster expansion failure
      }
    });

    map.on('click', 'route-stops-circle', (e) => {
      const f = e.features?.[0];
      const id = f?.properties?.stopId as string | undefined;
      if (id) callbacksRef.current.onSelectStop(id);
    });

    map.on('click', 'stops-circle', (e) => {
      const veh = map.queryRenderedFeatures(e.point, {
        layers: ['vehicles-focus-layer', 'vehicles-layer', 'vehicles-dots', 'vehicles-clusters'],
      });
      if (veh.length > 0) return;
      const f = e.features?.[0];
      const id = f?.properties?.stopId as string | undefined;
      if (id) callbacksRef.current.onSelectStop(id);
    });

    for (const layerId of [
      'vehicles-focus-layer',
      'vehicles-layer',
      'vehicles-dots',
      'vehicles-clusters',
      'stops-circle',
      'route-stops-circle',
    ]) {
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

  const prevCoordsRef = useRef<Map<string, { lat: number; lon: number }>>(new Map());
  const animFrameRef = useRef<number | null>(null);

  // Incremental vehicle updates with restrained interpolation
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    updateStopsSource(map, stops);
  }, [stops]);

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
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 100, left: 60, right: 60 },
        maxZoom: 14.5,
        duration: 600,
      });
    }
  }, [selectedRoute, selection]);

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

      {/* TOP-CENTER LIVE STATUS PILL */}
      <div className="pointer-events-none fixed top-3.5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <div
          role="status"
          title={feedStatus.feedTimestamp > 0 ? `Updated ${formatRelativeAge(feedAge)}` : undefined}
          className="pointer-events-auto hidden items-center gap-2 rounded-full border border-black/10 bg-white/95 px-3.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md sm:flex dark:border-white/10 dark:bg-neutral-900/95"
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
          <span className="whitespace-nowrap text-[#171717] dark:text-neutral-200">
            {feedStatus.online ? (
              <>
                <span className="font-mono-num font-semibold">{feedStatus.freshCount}</span>{' '}
                <span>live near Vizag</span>
              </>
            ) : (
              <span className="text-[#dc2626] dark:text-rose-400">Live feed unavailable</span>
            )}
          </span>
        </div>

        {/* Floating Active Route Pill */}
        {selectedRoute && (
          <div className="pointer-events-auto flex max-w-[90vw] items-center gap-2 rounded-full border border-black/10 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95">
            <span className="font-mono-num rounded-md bg-[#176B52] px-2 py-0.5 text-xs font-bold text-white">
              {selectedRoute.route.shortName}
            </span>
            <span className="max-w-[160px] truncate text-xs font-medium text-[#171717] sm:max-w-[260px] dark:text-neutral-100">
              {selectedRoute.route.longName}
            </span>
            {onClearRoute && (
              <button
                onClick={onClearRoute}
                aria-label="Clear highlighted route"
                title="Clear highlighted route"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* TOP-RIGHT FLOATING MAP CONTROLS + LEGEND */}
      <div
        ref={legendWrapRef}
        className="pointer-events-none fixed top-3.5 right-3.5 z-20 flex flex-col items-end gap-2"
      >
        {/* Zoom Group */}
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95">
          <button
            onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
            aria-label="Zoom in"
            title="Zoom in"
            className="flex h-9 w-9 items-center justify-center border-b border-black/8 text-[#171717] transition hover:bg-[#F5F6F8] dark:border-white/10 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
            aria-label="Zoom out"
            title="Zoom out"
            className="flex h-9 w-9 items-center justify-center text-[#171717] transition hover:bg-[#F5F6F8] dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Standalone Satellite & Dark Mode Pills */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <button
            onClick={() => setSatellite((s) => !s)}
            aria-pressed={satellite}
            aria-label="Toggle satellite map view"
            title="Toggle satellite view"
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium shadow-sm backdrop-blur-md transition ${
              satellite
                ? 'border-[#176B52] bg-[#176B52] text-white'
                : 'border-black/10 bg-white/95 text-[#171717] hover:bg-[#F5F6F8] dark:border-white/10 dark:bg-neutral-900/95 dark:text-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Satellite</span>
          </button>
          <button
            onClick={onToggleTheme}
            aria-pressed={dark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium shadow-sm backdrop-blur-md transition ${
              dark
                ? 'border-[#176B52] bg-neutral-900/95 text-emerald-400 hover:bg-neutral-800'
                : 'border-black/10 bg-white/95 text-[#171717] hover:bg-[#F5F6F8]'
            }`}
          >
            {dark ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{dark ? 'Light' : 'Dark'}</span>
          </button>
        </div>

        {/* Recenter / Locate / Legend Stack */}
        <div className="pointer-events-auto flex flex-col items-center overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95">
          <button
            onClick={() =>
              mapRef.current?.flyTo({ center: VIZAG_CENTER, zoom: 11.8, duration: 500 })
            }
            aria-label="Reset view to Visakhapatnam"
            title="Reset map view"
            className="flex h-9 w-full items-center justify-center border-b border-black/8 text-[#171717] transition hover:bg-[#F5F6F8] dark:border-white/10 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={onLocateMe}
            aria-label="Find my current location"
            title="Find my location"
            className="flex h-9 w-full items-center justify-center border-b border-black/8 text-[#171717] transition hover:bg-[#F5F6F8] dark:border-white/10 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <LocateFixed className="h-4 w-4 text-[#176B52] dark:text-emerald-400" aria-hidden="true" />
          </button>
          <button
            onClick={() => setLegendOpen((o) => !o)}
            aria-expanded={legendOpen}
            aria-label="Toggle map legend"
            title="Map legend"
            className={`flex h-9 items-center justify-center gap-1 px-2.5 text-[11px] font-medium transition ${
              legendOpen
                ? 'bg-[#176B52] text-white'
                : 'text-[#171717] hover:bg-[#F5F6F8] dark:text-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Info className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
            <span>Legend</span>
          </button>
        </div>

        {/* Legend Popover */}
        {legendOpen && (
          <div className="pointer-events-auto w-56 rounded-2xl border border-black/10 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#171717] dark:text-neutral-100">
                Map Legend
              </span>
              <button
                onClick={() => setLegendOpen(false)}
                aria-label="Close legend"
                className="rounded-md p-0.5 text-[#737373] hover:bg-[#F5F6F8] hover:text-[#171717] dark:hover:bg-neutral-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#525252] dark:text-neutral-300">
              <div className="flex items-center gap-2.5">
                <span className="font-mono-num flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#0f5e53] text-[9px] font-bold text-white shadow-xs">
                  8
                </span>
                <span>Bus cluster (click to zoom)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-[#0f766e] shadow-xs" />
                <span>Live bus (&lt; 2m)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-[#b45309] shadow-xs" />
                <span>Delayed GPS update</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-[#737373] shadow-xs" />
                <span>Stale location</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full border-[1.5px] border-[#6366f1] bg-white" />
                <span>Bus stop</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-1 w-3.5 rounded-full bg-[#4f46e5]" />
                <span>Active route</span>
              </div>
            </div>
          </div>
        )}
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
  const focusSrc = map.getSource('vehicles-focus-source') as maplibregl.GeoJSONSource | undefined;
  if (!src || !focusSrc) return;

  const selectedVehicleId = selection?.kind === 'vehicle' ? selection.id : null;
  const fleetFeatures: GeoJSON.Feature[] = [];
  const focusFeatures: GeoJSON.Feature[] = [];

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

    const feature: GeoJSON.Feature = {
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
    };

    if (isSel || isRouteActive) {
      focusFeatures.push(feature);
    } else {
      fleetFeatures.push(feature);
    }
  }

  src.setData({ type: 'FeatureCollection', features: fleetFeatures });
  focusSrc.setData({ type: 'FeatureCollection', features: focusFeatures });
}
