import { ReactNode } from "react";

/**
 * The two-column body shared by `CharacterDetailsModal` and
 * `CreatureDetailsModal`: an even 50/50 split (`flex-1` on both, not a
 * fixed sidebar width) with each side scrolling independently — `left` is
 * always the entity's stat block, `right` is always its tabs (and, for a
 * creature, the fixed Notes/Quick Notes block below them). `min-h-0` on the
 * row is required for the two `overflow-y-auto` children to actually scroll
 * instead of stretching the panel past its own `max-h` (a flex child's
 * default `min-height: auto` otherwise refuses to shrink below its content
 * size).
 *
 * `overflow-x-hidden` alongside `overflow-y-auto` on both columns — per the
 * CSS overflow spec, an axis left at its `visible` default gets silently
 * promoted to `auto` the moment the *other* axis is anything but `visible`,
 * so `overflow-y-auto` alone was enough to grow a horizontal scrollbar the
 * instant any row got even a pixel wider than the column — not real content
 * overflow, just that spec quirk. The right column's `px-1` exists because
 * that same `overflow-x-hidden` then clipped the 2px focus ring on the
 * Notes editor/Quick Notes input the moment either was focused — both sit
 * flush against the column's own box edge with zero horizontal slack
 * otherwise, so the ring (a box-shadow, not real layout width) has nowhere
 * to bleed into before getting cut off left and right.
 */
export function DetailsTwoColumn({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="scrollbar-themed flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto overflow-x-hidden border-r border-slate-800 pr-3.5">
        {left}
      </div>
      <div className="scrollbar-themed min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-1">{right}</div>
    </div>
  );
}
