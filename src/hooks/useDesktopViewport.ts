"use client";

import { useLayoutEffect, useState } from "react";

/** Tailwind v4's `sm` breakpoint (`min-width: 40rem`) — same convention `InfoTooltip`'s `desktopOnly` already uses. */
const DESKTOP_MEDIA_QUERY = "(min-width: 40rem)";

/**
 * `true` once the viewport is at least `sm`-wide. Lazy `useState` initializer
 * (not a value set from an effect) so the first client render already has
 * the right answer, before paint — same reasoning as `InfoTooltip`'s
 * `desktopOnly`. Server-rendered as `true` (`window` doesn't exist yet);
 * harmless for callers that only use this to gate an interaction, not
 * anything present in the server-rendered HTML itself.
 */
export function useDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === "undefined" || window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  );

  useLayoutEffect(() => {
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
