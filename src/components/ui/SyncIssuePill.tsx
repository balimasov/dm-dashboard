"use client";

import { InfoTooltip } from "@/components/InfoTooltip";

/**
 * "⚠ Sync failed" / "⚠ Not synced" toolbar pill — same rounded-full/px-2/
 * py-0.5/text-xs shape as `ReminderBadge`'s "🔥 N" and `AskAiPill`'s
 * "✨ Ask AI" on the same row, red instead of amber/sky. Renders whatever
 * `characterSyncIssue` (`lib/sync.ts`) resolved — that's the one place
 * deciding between "last sync failed" and "never synced," so this
 * component just displays the result rather than re-deciding anything.
 *
 * Reflects persisted state (`Character.lastSyncError`/`synced`), not the
 * transient in-flight `error` `useDdbSync` also tracks — this is what's
 * still visible after closing the card or reloading the page.
 *
 * Built on `InfoTooltip` rather than a bare button with its own popover —
 * same hover-preview/click-to-pin/outside-click-to-close behavior every
 * other hint in this app already gets for free. `onRetry` only becomes
 * clickable once pinned open (a plain hover preview stays
 * `pointer-events: none`, see `InfoTooltip`'s own doc comment) — clicking
 * the pill itself is what pins it.
 */
export function SyncIssuePill({
  label,
  message,
  onRetry,
  syncing,
}: {
  label: string;
  message: string;
  onRetry?: () => void;
  syncing?: boolean;
}) {
  return (
    <InfoTooltip
      hoverOnly
      className="flex shrink-0 items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
      panel={
        <div className="w-56 space-y-2">
          <p className="font-semibold text-red-300">{label}</p>
          <p>{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={syncing}
              className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {syncing ? "Syncing…" : "Retry"}
            </button>
          )}
        </div>
      }
    >
      <span aria-hidden="true">⚠</span>
      {label}
    </InfoTooltip>
  );
}
