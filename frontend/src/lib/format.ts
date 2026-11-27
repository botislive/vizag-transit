import type { Freshness } from '../types/transit';

export function formatRelativeAge(ageSec: number): string {
  if (ageSec < 5) return 'just now';
  if (ageSec < 60) return `${Math.floor(ageSec)}s ago`;
  const mins = Math.floor(ageSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export function formatClockTime(unixSec: number): string {
  if (!unixSec) return '—';
  return new Date(unixSec * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatETA(etaSec: number): string {
  if (etaSec < 60) return 'Due now';
  const mins = Math.round(etaSec / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Passenger-facing GPS freshness labels.
 * Never rely on colour alone to communicate status.
 */
export function freshnessLabel(f: Freshness): string {
  if (f === 'fresh') return 'Live';
  if (f === 'aging') return 'Delayed update';
  return 'Location unavailable';
}
