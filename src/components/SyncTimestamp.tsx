"use client";

import { useSyncExternalStore } from "react";
import { formatSyncTimestamp } from "@/lib/types";

function subscribe() {
  return () => {};
}

/**
 * Renders a sync timestamp using the viewer's own local timezone. The server
 * has no way to know that timezone, so instead of formatting during SSR
 * (which would mismatch the client and produce a hydration warning), this
 * renders nothing on the server and fills in the real value once mounted in
 * the browser — the sanctioned pattern (via useSyncExternalStore's separate
 * server/client snapshots) for values that only exist on the client.
 */
export function SyncTimestamp({ iso }: { iso: string }) {
  const formatted = useSyncExternalStore(
    subscribe,
    () => formatSyncTimestamp(iso),
    () => null
  );

  if (!formatted) return null;
  return <>{formatted}</>;
}
