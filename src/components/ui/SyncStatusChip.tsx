"use client";

import { InfoTooltip } from "@/components/InfoTooltip";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { SYNC_TIER_CLASS, syncTier } from "@/lib/syncTier";

/**
 * "🕐 Sync" toolbar pill — same rounded-full/px-2/py-0.5/text-xs/gap-1 shape
 * as `ReminderBadge`'s "🔥 N" and `AskAiPill`'s "✨ Ask AI" on the same row,
 * built the same way `AskAiPill` is: a real `<button>` with `onSync` as its
 * click handler, an inner `hoverOnly disableTap` `InfoTooltip` for the hint
 * so a click reaches the button instead of just pinning the hint open. Also
 * shows *when* this specific character last synced with D&D Beyond, in that
 * hint (date+time, via `SyncTimestamp`) — previously nowhere on the card/
 * modal itself once the inline "D&D Beyond ↗" link moved into the kebab
 * menu (see `CharacterHeader`'s own comment), which left no way to tell when
 * a sync actually happened without opening Edit.
 *
 * Renders nothing for an unlinked character (no `dndBeyondUrl`) or one
 * that's never synced and isn't syncing right now — `characterSyncIssue`'s
 * `SyncIssuePill` already owns "never synced"/"sync failed" with its own
 * red pill, so this one only needs the "here's when it last worked" case.
 * The emoji+label sit in their own inner `flex items-center gap-1` span
 * (not relying on the outer button's own `gap-1`, which only spaces direct
 * flex children — this button's only direct child is the `InfoTooltip`
 * itself) — matches `AskAiPill`/`ReminderBadge`'s own inner-wrapper pattern,
 * without it the emoji and "Sync" rendered flush against each other with no
 * gap at all.
 */
export function SyncStatusChip({
  dndBeyondUrl,
  syncing,
  lastSyncedAt,
  onSync,
}: {
  dndBeyondUrl?: string;
  syncing?: boolean;
  lastSyncedAt?: string;
  onSync?: () => void;
}) {
  if (!dndBeyondUrl || (!syncing && !lastSyncedAt)) return null;
  const tier = syncTier(lastSyncedAt);
  const tone = syncing ? "text-slate-400" : SYNC_TIER_CLASS[tier];

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={!onSync || syncing}
      className={`flex shrink-0 items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs font-semibold hover:border-slate-600 hover:bg-slate-700/60 disabled:cursor-default disabled:hover:border-slate-700 disabled:hover:bg-slate-800/60 ${tone}`}
    >
      {/* `disableTap` — this button already has its own `onClick` (triggering
          a sync); without it, a tap on a touch screen would fight between
          opening this hint and firing the sync instead, same reasoning as
          every other `InfoTooltip` nested inside its own clickable parent
          (e.g. `AskAiPill`). */}
      <InfoTooltip
        hoverOnly
        disableTap
        panel={
          <p>
            {syncing ? (
              "Syncing with D&D Beyond…"
            ) : (
              lastSyncedAt && (
                <>
                  Synced <span className={`font-semibold ${SYNC_TIER_CLASS[tier]}`}><SyncTimestamp iso={lastSyncedAt} /></span>
                </>
              )
            )}
          </p>
        }
      >
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🕐</span>
          Sync
        </span>
      </InfoTooltip>
    </button>
  );
}
