"use client";

import { useSyncExternalStore } from "react";

/** Tailwind v4's `sm` breakpoint (`min-width: 40rem`) — same convention `InfoTooltip`'s `desktopOnly` already uses. */
const DESKTOP_MEDIA_QUERY = "(min-width: 40rem)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

/**
 * `false` rather than `true` — the previous lazy-`useState` version defaulted
 * server-rendered output to `true` ("assume desktop, `window` doesn't exist
 * yet"), reasoned to be harmless since no caller put it in the actual
 * server-rendered HTML. That stopped being true once `DashboardClient`
 * started reading this to gate `dragEnabled`, which `useCardSortable` turns
 * into real DOM attributes (`role`, `tabIndex`, `aria-roledescription`,
 * `aria-describedby`) on every character/creature card — on any mobile
 * client (a narrower viewport than the breakpoint), the server's "assume
 * desktop" guess is simply wrong, so hydration's first client render always
 * disagreed with the server-rendered attributes, on every single mobile
 * load. React can't patch that particular kind of mismatch up quietly; it
 * discards and re-renders the whole mismatched subtree instead — the entire
 * Party row, right as the page becomes interactive, which is exactly the
 * "jerks every time on mobile" symptom this was rewritten to fix. `false`
 * means a mobile client's real value now matches the server's guess (no
 * mismatch there, which is the common case), and a desktop client corrects
 * itself safely after hydration via `useSyncExternalStore`'s own designed
 * mechanism for this — a purely cosmetic ARIA-attribute change, not a
 * visible layout jump — instead of a lazy initializer's DOM-diffing at
 * hydration time producing a real, logged mismatch.
 */
function getServerSnapshot() {
  return false;
}

export function useDesktopViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
