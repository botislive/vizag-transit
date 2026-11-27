import { useEffect, useRef, useState } from 'react';
import type { FeedStatus, Vehicle } from '../types/transit';

interface SSEPayload {
  type: 'snapshot' | 'delta' | 'status';
  feedTimestamp: number;
  serverTime: number;
  updated?: Vehicle[];
  removed?: string[];
  status: FeedStatus;
}

const DEFAULT_STATUS: FeedStatus = {
  online: false,
  feedTimestamp: 0,
  lastFetchAt: 0,
  lastSuccessAt: 0,
  vehicleCount: 0,
  freshCount: 0,
  staleCount: 0,
  tripUpdateCount: 0,
};

/**
 * Connects to /api/live via Server-Sent Events and maintains an incremental
 * map of Visakhapatnam vehicles without re-fetching or polling.
 */
export function useLiveVehicles() {
  const vehiclesRef = useRef<Map<string, Vehicle>>(new Map());
  const [vehiclesMap, setVehiclesMap] = useState<Map<string, Vehicle>>(() => new Map());
  const [status, setStatus] = useState<FeedStatus>(DEFAULT_STATUS);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource('/api/live');

      es.onopen = () => {
        setConnected(true);
      };

      es.addEventListener('vehicles', (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data) as SSEPayload;
          if (payload.status) {
            setStatus(payload.status);
          }

          if (payload.type === 'snapshot') {
            const next = new Map<string, Vehicle>();
            for (const v of payload.updated ?? []) {
              next.set(v.vehicleId, v);
            }
            vehiclesRef.current = next;
            setVehiclesMap(next);
          } else if (payload.type === 'delta') {
            const next = new Map(vehiclesRef.current);
            for (const id of payload.removed ?? []) {
              next.delete(id);
            }
            for (const v of payload.updated ?? []) {
              next.set(v.vehicleId, v);
            }
            vehiclesRef.current = next;
            setVehiclesMap(next);
          }
        } catch {
          // ignore malformed SSE frame
        }
      });

      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!closed && reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 4000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);

  return { vehiclesMap, status, connected };
}
