import { useEffect, useState } from "react";

/**
 * Per-tier stacking order (keyed by base z-index) — a plain module-level
 * structure rather than context, same reasoning as `useEscapeToClose`'s own
 * stack: `FloatingPanel` instances have no shared parent (one lives inside
 * whichever `CharacterCard`/`CreatureCard` opened it), so there's no single
 * component that could own this state instead.
 *
 * Every mounted instance in a tier subscribes via `listeners` and re-renders
 * whenever *any* instance in that tier changes `order` — required, not just
 * nice-to-have: without it, a panel's own `index` (and therefore z-index)
 * only recomputes on its own re-renders, so an unrelated sibling closing
 * could leave a stale index behind that later collides with a freshly
 * opened panel's freshly computed one (confirmed by hand-tracing: A opens at
 * index 0, B opens at index 1, A closes, C opens — C also lands at index 1
 * unless B is forced to recompute down to 0 first).
 */
const tiers = new Map<number, { order: symbol[]; listeners: Set<() => void> }>();

function tierFor(baseZ: number) {
  let tier = tiers.get(baseZ);
  if (!tier) {
    tier = { order: [], listeners: new Set() };
    tiers.set(baseZ, tier);
  }
  return tier;
}

function notify(tier: { listeners: Set<() => void> }) {
  tier.listeners.forEach((listener) => listener());
}

/**
 * Assigns each mounted instance within the same `baseZ` tier a z-index that
 * reflects *when it (or its caller) last claimed the front*, not the DOM
 * position its owning component happens to occupy — built for
 * `FloatingPanel`, where every instance shares one literal Tailwind z-index
 * class today, so which one visually stacks on top of the others is
 * otherwise decided by document order (confirmed bug: opening a new AI
 * panel on a party member earlier in the row than whichever one is already
 * open rendered it *underneath* that already-open panel, since its owning
 * card sits earlier in the tree regardless of open order).
 *
 * The offset added on top of `baseZ` is always `< number of currently
 * mounted instances in this tier` (bounded by `order`'s length, which only
 * ever holds *mounted* instances) — safe to keep the default tier below
 * `Modal`'s `z-50` and the nested tier above whatever it needs to clear,
 * indefinitely, unlike an ever-incrementing counter that would eventually
 * grow past those boundaries over a long session of opening/closing panels.
 *
 * Claims the front once on mount (a newly opened panel should always start
 * on top) — call the returned `bringToFront` again on user interaction
 * (e.g. a pointerdown on the panel) for the same behavior a real window
 * manager gives an already-open window brought back into focus.
 */
export function useFrontZIndex(baseZ: number): { zIndex: number; bringToFront: () => void } {
  // Stable per-instance identity — a `useState` initializer (run once, on
  // mount) rather than a ref read directly during render, which a newer
  // React lint rule now flags even for the common "lazily assign a ref
  // once" idiom `useEscapeToClose` still uses (that one's ref is only ever
  // read inside an effect, not the render body itself, which is why it
  // doesn't trip the same rule).
  const [id] = useState(() => Symbol("floating-panel"));
  const [, forceRerender] = useState(0);

  function bringToFront() {
    const tier = tierFor(baseZ);
    tier.order = tier.order.filter((s) => s !== id);
    tier.order.push(id);
    notify(tier);
  }

  useEffect(() => {
    const tier = tierFor(baseZ);
    const listener = () => forceRerender((t) => t + 1);
    tier.listeners.add(listener);
    bringToFront();
    return () => {
      tier.order = tier.order.filter((s) => s !== id);
      tier.listeners.delete(listener);
      notify(tier);
    };
    // `bringToFront` closes over `id`/`baseZ`, both stable for this instance's lifetime — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseZ]);

  const tier = tierFor(baseZ);
  const index = tier.order.indexOf(id);
  return { zIndex: baseZ + Math.max(index, 0), bringToFront };
}
