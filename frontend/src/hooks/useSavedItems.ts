import { useCallback, useEffect, useState } from 'react';
import type { SavedItem, SavedJourney } from '../types/transit';

const SAVED_KEY = 'vizag_transit_saved_v1';
const RECENT_KEY = 'vizag_transit_recent_v1';
const JOURNEYS_KEY = 'vizag_transit_journeys_v1';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useSavedAndRecent() {
  const [saved, setSaved] = useState<SavedItem[]>(() => readStorage(SAVED_KEY, []));
  const [recent, setRecent] = useState<SavedItem[]>(() => readStorage(RECENT_KEY, []));
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>(() =>
    readStorage(JOURNEYS_KEY, []),
  );

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      // ignore storage quota errors
    }
  }, [saved]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      // ignore
    }
  }, [recent]);

  useEffect(() => {
    try {
      localStorage.setItem(JOURNEYS_KEY, JSON.stringify(savedJourneys));
    } catch {
      // ignore
    }
  }, [savedJourneys]);

  const isSaved = useCallback(
    (kind: 'route' | 'stop', id: string) => saved.some((s) => s.kind === kind && s.id === id),
    [saved],
  );

  const toggleSave = useCallback((item: Omit<SavedItem, 'savedAt'>) => {
    setSaved((prev) => {
      const exists = prev.some((s) => s.kind === item.kind && s.id === item.id);
      if (exists) {
        return prev.filter((s) => !(s.kind === item.kind && s.id === item.id));
      }
      return [{ ...item, savedAt: Date.now() }, ...prev].slice(0, 30);
    });
  }, []);

  const recordRecent = useCallback((item: Omit<SavedItem, 'savedAt'>) => {
    setRecent((prev) => {
      const filtered = prev.filter((s) => !(s.kind === item.kind && s.id === item.id));
      return [{ ...item, savedAt: Date.now() }, ...filtered].slice(0, 10);
    });
  }, []);

  const isJourneySaved = useCallback(
    (fromId: string, toId: string) =>
      savedJourneys.some((j) => j.fromId === fromId && j.toId === toId),
    [savedJourneys],
  );

  const saveJourney = useCallback(
    (journey: Omit<SavedJourney, 'id' | 'savedAt'>) => {
      setSavedJourneys((prev) => {
        const filtered = prev.filter(
          (j) => !(j.fromId === journey.fromId && j.toId === journey.toId),
        );
        return [
          {
            ...journey,
            id: `${journey.fromId}__${journey.toId}`,
            savedAt: Date.now(),
          },
          ...filtered,
        ].slice(0, 10);
      });
    },
    [],
  );

  const removeJourney = useCallback((id: string) => {
    setSavedJourneys((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return {
    saved,
    recent,
    savedJourneys,
    isSaved,
    toggleSave,
    recordRecent,
    isJourneySaved,
    saveJourney,
    removeJourney,
  };
}
