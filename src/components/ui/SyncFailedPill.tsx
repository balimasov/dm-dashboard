"use client";

import { InfoTooltip } from "@/components/InfoTooltip";

/**
 * "⚠ Sync failed" toolbar pill — same rounded-full/px-2/py-0.5/text-xs shape
 * as `ReminderBadge`'s "🔥 N" and `AskAiPill`'s "✨ Ask AI" on the same row,
 * red instead of amber/sky. Reflects `Character.lastSyncError` (persisted),
 * not the transient in-flight `error` state `useDdbSync` also tracks —
 * `DdbSyncStatus`'s own error line already covers that immediate "you just
 * clicked Sync and it broke" moment; this is what's still visible after
 * closing the card or reloading the page, for a sync attempt (individual,
 * "Sync All", or the automatic first sync right after adding by URL) that
 * failed.
 *
 * Built on `InfoTooltip` rather than a bare button with its own popover —
 * same hover-preview/click-to-pin/outside-click-to-close behavior every
 * other hint in this app already gets for free. `onRetry` only becomes
 * clickable once pinned open (a plain hover preview stays
 * `pointer-events: none`, see `InfoTooltip`'s own doc comment) — clicking
 * the pill itself is what pins it.
 */
export function SyncFailedPill({
  error,
  onRetry,
  syncing,
}: {
  error: string;
  onRetry?: () => void;
  syncing?: boolean;
}) {
  return (
    <InfoTooltip
      hoverOnly
      className="flex shrink-0 items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
      panel={
        <div className="w-56 space-y-2">
          <p className="font-semibold text-red-300">Sync failed</p>
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={syncing}
              className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {syncing ? "Retrying…" : "Retry"}
            </button>
          )}
        </div>
      }
    >
      <span aria-hidden="true">⚠</span>
      Sync failed
    </InfoTooltip>
  );
}
