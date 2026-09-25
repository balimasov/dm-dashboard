"use client";

import { useEffect, useState } from "react";

/**
 * Which mounted instance currently "owns" rendering the one shared dim
 * layer — same shared-registry + notify pattern as `useFrontZIndex`'s own
 * per-tier `order` (`FloatingPanel` instances have no shared parent to own
 * this state instead, for the same reason that hook's doc comment gives).
 * Deliberately a single global list, not one per caller — unlike z-index
 * tiers, "how many overlays want the background dimmed" has no reason to be
 * split into separate pools.
 */
const order: symbol[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Renders exactly one shared full-viewport dim layer behind however many
 * `FloatingPanel`s currently want one, instead of one per panel — two (or
 * three) independently-rendered `bg-black/38` layers stacked on top of each
 * other visibly compound into something much darker than the single "minimal
 * dim" that was asked for, which is exactly the multi-panel conflict this
 * hook exists to avoid. Only the instance currently first in mount order
 * gets `true` back and is the one that should actually render the dim
 * `<div>`; every other active instance gets `false` and renders nothing for
 * it. If the current owner closes while others are still open, the next one
 * in line picks it up on the very next render — `notify()` fires
 * synchronously from the same unmount effect, so there's no visible gap.
 */
export function useSharedDim(active: boolean): boolean {
  const [id] = useState(() => Symbol("shared-dim"));
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!active) return;
    const listener = () => forceRerender((t) => t + 1);
    listeners.add(listener);
    order.push(id);
    notify();
    return () => {
      const idx = order.indexOf(id);
      if (idx !== -1) order.splice(idx, 1);
      listeners.delete(listener);
      notify();
    };
    // `id` is a stable per-instance identity (lazy `useState` initializer) — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return active && order[0] === id;
}
