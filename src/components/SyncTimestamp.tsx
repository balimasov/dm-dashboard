"use client";

import { useEffect, useState } from "react";
import { formatSyncTimestamp } from "@/lib/format";
import { useTimeZone } from "./TimezoneProvider";

/**
 * Renders a sync timestamp in the viewer's own local timezone. `TimezoneSync`
 * remembers that zone in a cookie after the first visit, and `TimezoneProvider`
 * (seeded from that same cookie, read server-side in `layout.tsx`) hands it
 * to this component identically on the server's render and the client's
 * pre-hydration pass — so a *returning* visitor sees the correct local time
 * from the very first paint, no correction needed. Only a visitor's very
 * first-ever page load (no cookie yet) falls back to a fixed UTC guess that
 * a `useEffect` corrects a beat later, same as before this cookie existed.
 */
export function SyncTimestamp({ iso }: { iso: string }) {
  const cookieTimeZone = useTimeZone();
  const [formatted, setFormatted] = useState(() => formatSyncTimestamp(iso, cookieTimeZone ?? "UTC"));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- self-heals if the real local zone ever differs from the cookie's (stale cookie, first-ever visit, traveled since)
    setFormatted(formatSyncTimestamp(iso));
  }, [iso]);

  return <>{formatted}</>;
}
