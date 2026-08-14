"use client";

import { InfoTooltip } from "@/components/InfoTooltip";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { SYNC_TIER_CLASS, syncTier } from "@/lib/syncTier";

/**
 * "🕐 Sync" toolbar pill — same rounded-full/px-2/py-0.5/text-xs shape as
 * `ReminderBadge`'s "🔥 N" and `AskAiPill`'s "✨ Ask AI" on the same row.
 * Shows *when* this specific character last synced with D&D Beyond, in the
 * hover hint (date+time, via `SyncTimestamp`) — previously nowhere on the
 * card/modal itself once the inline "D&D Beyond ↗" link moved into the
 * kebab menu (see `CharacterHeader`'s own comment), which left no way to
 * tell when a sync actually happened without opening Edit.
 *
 * Renders nothing for an unlinked character (no `dndBeyondUrl`) or one
 * that's never synced and isn't syncing right now — `characterSyncIssue`'s
 * `SyncIssuePill` already owns "never synced"/"sync failed" with its own
 * red pill, so this one only needs the "here's when it last worked" case.
 * Colored by `syncTier` the same way `DdbSyncStatus`'s own clock icon is
 * (plain while fresh, amber once it's worth a glance, red once it's a real
 * flag) — same neutral shell as `AskAiPill` otherwise, since the tier color
 * alone already carries the signal.
 */
export function SyncStatusChip({
  dndBeyondUrl,
  syncing,
  lastSyncedAt,
}: {
  dndBeyondUrl?: string;
  syncing?: boolean;
  lastSyncedAt?: string;
}) {
  if (!dndBeyondUrl || (!syncing && !lastSyncedAt)) return null;
  const tier = syncTier(lastSyncedAt);

  return (
    <InfoTooltip
      hoverOnly
      disableTap
      className={`flex shrink-0 items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs font-semibold ${
        syncing ? "text-slate-400" : SYNC_TIER_CLASS[tier]
      }`}
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
      <span aria-hidden="true">🕐</span>
      Sync
    </InfoTooltip>
  );
}
