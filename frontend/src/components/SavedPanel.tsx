import { ArrowRight, Bookmark, Compass, MapPin, Route, Trash2 } from 'lucide-react';
import { useT } from '../lib/i18n';
import type { Language, SavedItem, SavedJourney } from '../types/transit';

interface SavedPanelProps {
  saved: SavedItem[];
  savedJourneys?: SavedJourney[];
  lang?: Language;
  onSelectRoute: (id: string) => void;
  onSelectStop: (id: string) => void;
  onOpenJourney?: (j: SavedJourney) => void;
  onRemove: (item: Omit<SavedItem, 'savedAt'>) => void;
  onRemoveJourney?: (id: string) => void;
}

export function SavedPanel({
  saved,
  savedJourneys = [],
  lang = 'en',
  onSelectRoute,
  onSelectStop,
  onOpenJourney,
  onRemove,
  onRemoveJourney,
}: SavedPanelProps) {
  const t = useT(lang);

  if (saved.length === 0 && savedJourneys.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F6F8] text-[#737373] dark:bg-neutral-900">
          <Bookmark className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-sm font-semibold text-[#171717] dark:text-neutral-100">
          {t.noSavedTitle}
        </h2>
        <p className="mt-1 max-w-[260px] text-xs text-[#737373]">
          {t.noSavedBody}
        </p>
      </div>
    );
  }

  return (
    <div className="thin-scroll h-full space-y-5 overflow-y-auto p-4">
      {/* Saved Commutes / Journeys */}
      {savedJourneys.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-[#737373] uppercase dark:text-neutral-400">
            {t.savedJourneys}
          </h3>
          {savedJourneys.map((j) => (
            <div
              key={j.id}
              className="flex min-h-[58px] items-center justify-between gap-2 rounded-xl border border-[#176B52]/25 bg-[#eaf3f0]/40 px-3.5 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            >
              <button
                type="button"
                onClick={() => onOpenJourney?.(j)}
                className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Compass className="h-4 w-4 shrink-0 text-[#176B52] dark:text-emerald-400" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm leading-snug font-semibold text-[#171717] dark:text-neutral-100">
                    <span>{j.fromName}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#737373]" aria-hidden="true" />
                    <span>{j.toName}</span>
                  </div>
                  <div className="text-xs text-[#176B52] dark:text-emerald-400">
                    {j.tag ? `${j.tag.charAt(0).toUpperCase() + j.tag.slice(1)} · ` : ''}Tap to check buses now
                  </div>
                </div>
              </button>
              {onRemoveJourney && (
                <button
                  type="button"
                  onClick={() => onRemoveJourney(j.id)}
                  aria-label={`Remove saved journey ${j.fromName} to ${j.toName}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#737373] transition hover:bg-white/70 hover:text-[#dc2626] dark:hover:bg-neutral-800"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Saved Routes & Stops */}
      {saved.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-[#737373] uppercase dark:text-neutral-400">
            {t.savedRoutesStops}
          </h3>
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
                  <MapPin className="h-4 w-4 shrink-0 text-[#f97316]" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <div className="text-sm leading-snug font-semibold text-[#171717] dark:text-neutral-100">
                    {item.title}
                  </div>
                  <div className="text-xs leading-snug text-[#737373]">{item.subtitle}</div>
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
        </section>
      )}
    </div>
  );
}
