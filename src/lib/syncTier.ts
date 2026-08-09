/**
 * How old a D&D Beyond sync is, bucketed into three tiers the same way
 * `tierColor.ts` buckets HP percentage — except keyed off elapsed time
 * against fixed thresholds instead of a 0-100 percent, so it doesn't reuse
 * that file's `tierColorClass` signature directly. `fresh` stays neutral
 * (`text-slate-500`, the clock icon's original always-on color) rather than
 * emerald — an up-to-date sync isn't a "good" state worth celebrating, just
 * the absence of a problem, so there's nothing to call out.
 *
 * Thresholds: under an hour is normal (right after a sync, or mid-session
 * with auto-sync running), past an hour is worth a glance, past a day is a
 * real flag — HP/resources drift fast enough during actual play that even
 * same-day can be meaningfully out of date.
 */
export type SyncTier = "fresh" | "aging" | "stale";

const AGING_AFTER_MS = 60 * 60 * 1000;
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** `undefined` (never synced) reads as `"fresh"` — callers that care about "never synced" already show a separate banner for that (`DdbSyncStatus`'s `!synced` check); this tier is only meaningful once there's an actual timestamp to age. */
export function syncTier(lastSyncedAt: string | undefined, now: number = Date.now()): SyncTier {
  if (!lastSyncedAt) return "fresh";
  const age = now - new Date(lastSyncedAt).getTime();
  if (age >= STALE_AFTER_MS) return "stale";
  if (age >= AGING_AFTER_MS) return "aging";
  return "fresh";
}

/** The `text-*` color for each tier — shared by the clock icon and its paired timestamp text, deliberately identical rather than a two-tone "muted label, bright value" split, so the icon and the date it explains always read as one colored unit. `fresh` matches the clock icon's original always-on `text-slate-500`. */
export const SYNC_TIER_CLASS: Record<SyncTier, string> = {
  fresh: "text-slate-500",
  aging: "text-amber-400",
  stale: "text-red-400",
};
