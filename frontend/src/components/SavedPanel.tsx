import { Bookmark, MapPin, Route, Trash2 } from 'lucide-react';
import type { SavedItem } from '../types/transit';

interface SavedPanelProps {
  saved: SavedItem[];
  onSelectRoute: (id: string) => void;
  onSelectStop: (id: string) => void;
  onRemove: (item: Omit<SavedItem, 'savedAt'>) => void;
}

export function SavedPanel({ saved, onSelectRoute, onSelectStop, onRemove }: SavedPanelProps) {
  if (saved.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F6F8] text-[#737373] dark:bg-neutral-900">
          <Bookmark className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-sm font-semibold text-[#171717] dark:text-neutral-100">
          No saved routes or stops
        </h2>
        <p className="mt-1 max-w-[240px] text-xs text-[#737373]">
          Save your daily bus routes and stops for quick access anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="thin-scroll h-full space-y-2 overflow-y-auto p-4">
      {saved.map((item) => (
        <div
          key={`${item.kind}-${item.id}`}
          className="flex min-h-[56px] items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <button
            onClick={() => (item.kind === 'route' ? onSelectRoute(item.id) : onSelectStop(item.id))}
            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
          >
            {item.kind === 'route' ? (
              <Route className="h-4 w-4 shrink-0 text-[#176B52]" aria-hidden="true" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-[#176B52]" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#171717] dark:text-neutral-100">
                {item.title}
              </div>
              <div className="truncate text-xs text-[#737373]">{item.subtitle}</div>
            </div>
          </button>
          <button
            onClick={() =>
              onRemove({ kind: item.kind, id: item.id, title: item.title, subtitle: item.subtitle })
            }
            aria-label={`Remove ${item.title} from saved`}
            title="Remove bookmark"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F6F8] hover:text-[#dc2626] dark:hover:bg-neutral-800"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
