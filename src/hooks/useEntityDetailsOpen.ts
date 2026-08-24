"use client";

import { useEffect, useState } from "react";

/**
 * Module-level count of currently mounted `CharacterDetailsModal`/
 * `CreatureDetailsModal` instances — same "no shared parent, so no single
 * component can own this state" reasoning as `useFrontZIndex`'s own tiers.
 * `DashboardClient` (which renders the corner Dice/Reminders/Quick Links
 * FABs) has no direct relationship to either modal — each one mounts deep
 * inside whichever `CharacterCard`/`CreatureCard` opened it — so this is the
 * only way it can know one is open at all.
 */
let openCount = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** Called for `CharacterDetailsModal`/`CreatureDetailsModal`'s entire mounted lifetime — both only ever mount while actually open (there's no "mounted but hidden" state for either), so counting mounts is counting open panels. */
export function useMarkEntityDetailsOpen() {
  useEffect(() => {
    openCount++;
    notify();
    return () => {
      openCount--;
      notify();
    };
  }, []);
}

/**
 * Whether any character/creature details panel is open anywhere on the
 * page — `DashboardClient` uses this to hide the corner Dice/Reminders/Quick
 * Links FABs on mobile while one is up. On desktop those FABs are meant to
 * float *above* an open details panel (see `FloatingPanel`'s own doc comment
 * on `zIndexClassName`) since there's normally room beside it to roll dice
 * mid-lookup. On a phone-width screen the details panel is a full-screen
 * sheet instead (`FloatingPanel`'s mobile branch), so there's no "beside
 * it" left — the FABs would just sit on top of the sheet's own content with
 * nothing behind them to legitimately float above.
 */
export function useIsEntityDetailsOpen(): boolean {
  const [, forceRerender] = useState(0);
  useEffect(() => {
    const listener = () => forceRerender((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return openCount > 0;
}
