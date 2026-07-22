import { SyncTimestamp } from "@/components/SyncTimestamp";
import { ClockIcon } from "./icons";

/**
 * Fills the same card row `DdbSyncStatus` occupies on a `Character` — a
 * creature has no external source to sync with, so instead of a sync link
 * this just surfaces the DM's own last-edited record. Shows only ONE
 * timestamp, never both: `updatedAt` labeled "Edited" once it differs from
 * `createdAt` (i.e. it's actually been edited since creation), otherwise
 * `createdAt` labeled "Created" (a never-edited creature has identical
 * `createdAt`/`updatedAt`, so showing "Edited" there would be misleading).
 * Renders nothing for a creature saved before this field existed (both
 * optional, no backfill — same convention as `Character.dndBeyondUrl`).
 */
export function CreatureTimestampStatus({ createdAt, updatedAt }: { createdAt?: string; updatedAt?: string }) {
  const iso = updatedAt ?? createdAt;
  if (!iso) return null;

  const edited = Boolean(updatedAt && createdAt && updatedAt !== createdAt);

  return (
    <div className="flex items-center gap-1.5 text-xs leading-none text-slate-500">
      <ClockIcon className="h-3 w-3" />
      <span className="whitespace-nowrap">
        {edited ? "Edited" : "Created"} <SyncTimestamp iso={iso} />
      </span>
    </div>
  );
}
