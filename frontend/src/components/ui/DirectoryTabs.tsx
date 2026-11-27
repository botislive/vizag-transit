import { Bus, MapPin, Route } from 'lucide-react';
import { useT } from '../../lib/i18n';
import type { Language, NavTab } from '../../types/transit';

interface DirectoryTabsProps {
  active: 'routes' | 'stops' | 'buses';
  lang?: Language;
  liveBusCount?: number;
  onSwitch: (tab: NavTab) => void;
}

export function DirectoryTabs({
  active,
  lang = 'en',
  liveBusCount = 0,
  onSwitch,
}: DirectoryTabsProps) {
  const t = useT(lang);
  const busesLabel = lang === 'en' ? 'Buses' : t.buses;
  const items: { id: 'routes' | 'stops' | 'buses'; label: string; icon: React.ReactNode }[] = [
    { id: 'routes', label: t.routes, icon: <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> },
    { id: 'stops', label: t.stops, icon: <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> },
    {
      id: 'buses',
      label: liveBusCount > 0 ? `${busesLabel} (${liveBusCount})` : busesLabel,
      icon: <Bus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F5F6F8] p-1 dark:bg-neutral-900">
      {items.map((item) => {
        const isCurrent = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSwitch(item.id)}
            className={`flex min-h-[36px] items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] whitespace-nowrap transition sm:text-xs ${
              isCurrent
                ? 'bg-white font-semibold text-[#176B52] shadow-2xs dark:bg-neutral-800 dark:text-emerald-400'
                : 'font-medium text-[#737373] hover:text-[#171717] dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
