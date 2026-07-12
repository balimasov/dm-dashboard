"use client";

import { createContext, useContext } from "react";

const TimeZoneContext = createContext<string | undefined>(undefined);

/**
 * Makes the visitor's real IANA timezone (read from a cookie server-side in
 * `layout.tsx`, same idea as `CollapsibleSection`'s open/closed cookie)
 * available to any client component without prop-drilling it through every
 * intermediate one. `SyncTimestamp` is the only consumer today — it uses
 * this to render the correct local time on the very first paint instead of
 * guessing UTC and correcting a moment later.
 */
export function TimezoneProvider({ timeZone, children }: { timeZone?: string; children: React.ReactNode }) {
  return <TimeZoneContext.Provider value={timeZone}>{children}</TimeZoneContext.Provider>;
}

export function useTimeZone() {
  return useContext(TimeZoneContext);
}
