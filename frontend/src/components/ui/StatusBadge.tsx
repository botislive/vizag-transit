import { AlertTriangle, CheckCircle2, Radio, WifiOff } from 'lucide-react';
import type { Freshness } from '../../types/transit';
import { freshnessLabel } from '../../lib/format';

interface StatusBadgeProps {
  freshness: Freshness;
  size?: 'sm' | 'md';
}

export function StatusBadge({ freshness, size = 'sm' }: StatusBadgeProps) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (freshness === 'fresh') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-[#15803d]/20 bg-[#15803d]/10 font-medium text-[#15803d] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 ${pad}`}
      >
        <Radio className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>{freshnessLabel(freshness)}</span>
      </span>
    );
  }

  if (freshness === 'aging') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-[#b45309]/25 bg-[#b45309]/10 font-medium text-[#b45309] dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 ${pad}`}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>{freshnessLabel(freshness)}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-[#737373]/25 bg-[#737373]/10 font-medium text-[#525252] dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ${pad}`}
    >
      <WifiOff className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{freshnessLabel(freshness)}</span>
    </span>
  );
}

interface RouteBadgeProps {
  number: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RouteBadge({ number, size = 'md' }: RouteBadgeProps) {
  const sizing =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs min-w-[2.25rem]'
      : size === 'lg'
        ? 'px-3 py-1.5 text-lg min-w-[3.5rem]'
        : 'px-2.5 py-1 text-sm min-w-[2.75rem]';

  return (
    <span
      className={`font-mono-num inline-flex shrink-0 items-center justify-center rounded-md bg-[#176B52] font-bold tracking-tight text-white dark:bg-[#229975] ${sizing}`}
    >
      {number}
    </span>
  );
}

export function FeedHealthBanner({
  online,
  networkOnline,
}: {
  online: boolean;
  networkOnline: boolean;
}) {
  if (!networkOnline) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 border-b border-[#E5E7EB] bg-[#F5F6F8] px-4 py-2 text-xs text-[#171717] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0 text-[#b45309]" aria-hidden="true" />
        <span>You&apos;re offline. Showing available saved route information.</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 border-b border-[#E5E7EB] bg-[#F5F6F8] px-4 py-2 text-xs text-[#171717] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#b45309]" aria-hidden="true" />
        <span>Live tracking is temporarily unavailable. Route information is still accessible.</span>
      </div>
    );
  }

  return null;
}

export function VerifiedCheck({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#176B52] dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
