"use client";

import { useEffect, useState } from "react";
import { formatSyncTimestamp } from "@/lib/types";

/**
 * Renders a sync timestamp in the viewer's own local timezone. The server
 * can't know that timezone, so the very first render (both the server's and
 * the client's pre-hydration pass) uses a fixed UTC formatting — the two
 * always agree, so no hydration mismatch — then a `useEffect` immediately
 * corrects it to the browser's real local zone once mounted. This avoids the
 * older "render nothing until mounted" approach's visible empty-then-text
 * pop-in (a real timestamp is on screen from the first paint, it just gets
 * corrected a beat later) while still ending up right for wherever the
 * viewer actually is.
 */
export function SyncTimestamp({ iso }: { iso: string }) {
  const [formatted, setFormatted] = useState(() => formatSyncTimestamp(iso, "UTC"));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- correcting a UTC-guess bootstrap to the browser's real timezone, not derived state
    setFormatted(formatSyncTimestamp(iso));
  }, [iso]);

  return <>{formatted}</>;
}
