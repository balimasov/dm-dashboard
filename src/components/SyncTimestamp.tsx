import { formatSyncTimestamp } from "@/lib/types";

/**
 * Renders a sync timestamp. `formatSyncTimestamp` uses a fixed timezone, so
 * this is a pure function of `iso` — server and client always render the
 * same text, and it can go straight to the DOM with no mount-then-fill-in
 * step (that step used to render nothing for a moment, causing a visible
 * pop-in next to the header's sync button on every page load).
 */
export function SyncTimestamp({ iso }: { iso: string }) {
  return <>{formatSyncTimestamp(iso)}</>;
}
