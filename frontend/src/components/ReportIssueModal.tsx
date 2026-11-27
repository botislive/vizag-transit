import { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { api } from '../lib/api';
import type { ReportKind } from '../types/transit';

interface ReportIssueModalProps {
  routeId?: string;
  stopId?: string;
  vehicleId?: string;
  contextLabel: string;
  onClose: () => void;
}

const REPORT_OPTIONS: { id: ReportKind; label: string }[] = [
  { id: 'bus_did_not_arrive', label: 'Bus did not arrive' },
  { id: 'bus_skipped_stop', label: 'Bus skipped a stop' },
  { id: 'wrong_gps_position', label: 'GPS position appears incorrect' },
  { id: 'wrong_stop_location', label: 'Incorrect stop location' },
  { id: 'wrong_route_info', label: 'Incorrect route information' },
];

export function ReportIssueModal({
  routeId,
  stopId,
  vehicleId,
  contextLabel,
  onClose,
}: ReportIssueModalProps) {
  const [kind, setKind] = useState<ReportKind>('bus_did_not_arrive');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrMsg(null);
    try {
      const res = await api.submitReport({ kind, routeId, stopId, vehicleId, note });
      setDoneMsg(res.message);
    } catch (err) {
      setErrMsg((err as Error).message || 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-issue-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#b45309]" aria-hidden="true" />
            <h2 id="report-issue-title" className="text-sm font-semibold text-[#171717] dark:text-neutral-100">
              Report an Issue
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#737373] hover:bg-[#F5F6F8] dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-2.5 text-xs text-[#737373] dark:text-neutral-400">
          Context: <strong className="text-[#171717] dark:text-neutral-200">{contextLabel}</strong>.
          Reports are logged as <em>unverified commuter feedback</em> and do not automatically alter official schedules.
        </p>

        {doneMsg ? (
          <div className="mt-4 space-y-3 rounded-xl bg-[#eaf3f0] p-3.5 text-xs text-[#176B52] dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{doneMsg}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] w-full rounded-lg bg-[#176B52] px-3 py-2 text-xs font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <fieldset className="space-y-1.5">
              <legend className="text-[11px] font-semibold text-[#737373] uppercase">Issue Type</legend>
              {REPORT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                    kind === opt.id
                      ? 'border-[#176B52] bg-[#eaf3f0]/70 font-medium text-[#176B52] dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-[#E5E7EB] text-[#171717] dark:border-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportKind"
                    value={opt.id}
                    checked={kind === opt.id}
                    onChange={() => setKind(opt.id)}
                    className="accent-[#176B52]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </fieldset>

            <div>
              <label htmlFor="report-note" className="block text-[11px] font-semibold text-[#737373] uppercase">
                Details (optional)
              </label>
              <textarea
                id="report-note"
                rows={2}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any helpful context (e.g. bus stop landmark, time observed)…"
                className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-[#F5F6F8] p-2.5 text-xs text-[#171717] placeholder:text-[#737373] focus:border-[#176B52] focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>

            {errMsg && (
              <div className="rounded-lg bg-[#dc2626]/10 p-2 text-xs text-[#dc2626]">{errMsg}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] w-full rounded-xl bg-[#176B52] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#125642] disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Unverified Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
