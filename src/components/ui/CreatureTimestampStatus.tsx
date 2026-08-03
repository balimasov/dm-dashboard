import { InfoTooltip } from "@/components/InfoTooltip";
import { SyncTimestamp } from "@/components/SyncTimestamp";
import { ClockIcon } from "./icons";

/**
 * Fills the same card row `DdbSyncStatus` occupies on a `Character` — a
 * creature has no external source to sync with, so instead of a sync link
 * this just surfaces the DM's own last-edited record as a fixed-width clock
 * icon (same convention `DdbSyncStatus` uses for its own sync date, for the
 * same reason: a variable-width date string was the first thing to
 * truncate/disappear once the reminder badge, AI pill, and kebab all shared
 * this row). Hovering/tapping the icon reveals the actual date in a hint.
 * Shows only ONE timestamp, never both: `updatedAt` labeled "Edited" once it
 * differs from `createdAt` (i.e. it's actually been edited since creation),
 * otherwise `createdAt` labeled "Created" (a never-edited creature has
 * identical `createdAt`/`updatedAt`, so showing "Edited" there would be
 * misleading). Renders nothing for a creature saved before this field
 * existed (both optional, no backfill — same convention as
 * `Character.dndBeyondUrl`).
 */
export function CreatureTimestampStatus({ createdAt, updatedAt }: { createdAt?: string; updatedAt?: string }) {
  const iso = updatedAt ?? createdAt;
  if (!iso) return null;

  const edited = Boolean(updatedAt && createdAt && updatedAt !== createdAt);

  return (
    <InfoTooltip
      hoverOnly
      panel={
        <p>
          {edited ? "Edited" : "Created"} <SyncTimestamp iso={iso} />
        </p>
      }
    >
      <ClockIcon className="h-3 w-3 shrink-0 text-slate-500" />
    </InfoTooltip>
  );
}
