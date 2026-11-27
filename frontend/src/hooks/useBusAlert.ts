import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { BusAlert } from '../types/transit';

const ALERTS_KEY = 'vizag_transit_alerts_v1';

export function useBusAlert() {
  const [alert, setAlert] = useState<BusAlert | null>(() => {
    try {
      const raw = localStorage.getItem(ALERTS_KEY);
      return raw ? (JSON.parse(raw) as BusAlert) : null;
    } catch {
      return null;
    }
  });
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [inAppBanner, setInAppBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (alert) localStorage.setItem(ALERTS_KEY, JSON.stringify(alert));
      else localStorage.removeItem(ALERTS_KEY);
    } catch {
      // ignore
    }
  }, [alert]);

  const enableAlert = useCallback(
    async (params: {
      routeId: string;
      routeShortName: string;
      stopId: string;
      stopName: string;
      thresholdMin: 10 | 5 | 2;
    }) => {
      let nextPerm: NotificationPermission =
        typeof Notification !== 'undefined' ? Notification.permission : 'denied';
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try {
          nextPerm = await Notification.requestPermission();
          setPermission(nextPerm);
        } catch {
          setPermission('denied');
        }
      } else {
        setPermission(nextPerm);
      }

      setAlert({
        id: `${params.routeId}_${params.stopId}_${Date.now()}`,
        routeId: params.routeId,
        routeShortName: params.routeShortName,
        stopId: params.stopId,
        stopName: params.stopName,
        thresholdMin: params.thresholdMin,
        triggered: false,
        createdAt: Date.now(),
      });
    },
    [],
  );

  const cancelAlert = useCallback(() => {
    setAlert(null);
    setInAppBanner(null);
  }, []);

  // Poll stop arrivals every 20s only while an untriggered alert is active
  useEffect(() => {
    if (!alert || alert.triggered) return;
    let active = true;

    const check = async () => {
      try {
        const stopRes = await api.getStop(alert.stopId);
        if (!active || !stopRes.feedStatus.online) return;
        const nowSec = Math.floor(Date.now() / 1000);
        const match = stopRes.liveArrivals.find(
          (a) =>
            (a.routeShortName === alert.routeShortName || a.routeId === alert.routeId) &&
            nowSec - a.gpsTimestamp < 120 &&
            a.etaSec > 0 &&
            a.etaSec <= alert.thresholdMin * 60,
        );
        if (match) {
          const mins = Math.max(1, Math.round(match.etaSec / 60));
          const msg = `Route ${alert.routeShortName} bus is ~${mins} min from ${alert.stopName}.`;
          setInAppBanner(msg);
          setAlert((prev) => (prev ? { ...prev, triggered: true } : null));
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(`VizagTransit: Route ${alert.routeShortName} Approaching`, {
                body: msg,
                icon: '/favicon.svg',
                tag: alert.id,
              });
            } catch {
              // ignore browser notification exception
            }
          }
        }
      } catch {
        // ignore poll failure
      }
    };

    void check();
    const timer = window.setInterval(check, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [alert]);

  return {
    alert,
    permission,
    inAppBanner,
    dismissBanner: () => setInAppBanner(null),
    enableAlert,
    cancelAlert,
  };
}
