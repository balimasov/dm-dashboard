import { ReactNode } from "react";

/**
 * The two-column body shared by `CharacterDetailsModal` and
 * `CreatureDetailsModal` — but only from `md:` up. Below that (a phone in
 * portrait, where two ~170px-wide columns would squash every row's trailing
 * numbers into the next line) it collapses back to the original single
 * flowing column — stat block, then tabs, stacked and scrolling together as
 * one long "sausage" the whole modal itself scrolls (`Modal`'s own
 * `scrollable` overlay), exactly how this modal behaved before the
 * two-column redesign. Every column-specific class below (`md:flex-1`,
 * `md:overflow-y-auto`, the divider) is gated the same way, in lockstep with
 * `CharacterDetailsModal`/`CreatureDetailsModal`'s own `panelClassName`
 * gating `max-h-[85vh]` behind `md:` too — that cap is what makes the two
 * columns need their own independent scroll in the first place; without it
 * on mobile, the panel is free to grow with its content and the overlay
 * handles the one shared scroll instead.
 *
 * At `md:`+, an even 50/50 split (`flex-1` on both, not a fixed sidebar
 * width) with each side scrolling independently — `left` is always the
 * entity's stat block, `right` is always its tabs (and, for a creature, the
 * fixed Notes/Quick Notes block below them). `md:min-h-0` on the row is
 * required for the two `overflow-y-auto` children to actually scroll
 * instead of stretching the panel past its own `max-h` (a flex child's
 * default `min-height: auto` otherwise refuses to shrink below its content
 * size).
 *
 * `overflow-x-hidden` alongside `overflow-y-auto` on both columns at `md:`+
 * — per the CSS overflow spec, an axis left at its `visible` default gets
 * silently promoted to `auto` the moment the *other* axis is anything but
 * `visible`, so `overflow-y-auto` alone was enough to grow a horizontal
 * scrollbar the instant any row got even a pixel wider than the column —
 * not real content overflow, just that spec quirk. The right column's
 * `px-1` exists because that same `overflow-x-hidden` then clipped the 2px
 * focus ring on the Notes editor/Quick Notes input the moment either was
 * focused — both sit flush against the column's own box edge with zero
 * horizontal slack otherwise, so the ring (a box-shadow, not real layout
 * width) has nowhere to bleed into before getting cut off left and right.
 */
export function DetailsTwoColumn({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
      <div className="scrollbar-themed flex flex-col gap-3.5 border-b border-slate-800 pb-3.5 md:min-w-0 md:flex-1 md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r md:pb-0 md:pr-3.5">
        {left}
      </div>
      <div className="scrollbar-themed px-1 md:min-w-0 md:flex-1 md:overflow-y-auto md:overflow-x-hidden">{right}</div>
    </div>
  );
}
