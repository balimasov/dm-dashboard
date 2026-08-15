"use client";

import { useEffect, useRef } from "react";
import { TabDef } from "./TabBar";

/**
 * A second, visually distinct "pick one of N" switcher alongside `TabBar`
 * (icon-over-label pill segments) and `SegmentedControl` (filled pill
 * segments) — this one reads as a browser-style tab strip: icon centered
 * above its label (two rows per tab, same stacked shape `TabBar` uses), a
 * full-width bottom rule under the row, and the active tab marked by an
 * accent bottom border instead of a filled background. Not a `variant` prop
 * on `TabBar`: the two don't share a markup skeleton (border-bottom
 * indicator vs. background-fill indicator), only the same "one active key
 * out of a list" data shape — reuses `TabBar`'s own `TabDef` so callers can
 * switch between the two looks without touching their tab config. Same
 * "nothing to switch between" rule as `TabBar`: a single tab renders no
 * chrome, just its (already-selected) content.
 *
 * Each tab is `flex-1` (stretches to share the row evenly when everything
 * fits) with a `min-w-max` floor (never shrinks below its own icon+label,
 * `whitespace-nowrap` so the label can't wrap to a second line instead of
 * shrinking) — on a narrow phone, 5 tabs' combined minimum width can exceed
 * the panel's, and the row now scrolls horizontally (`overflow-x-auto`)
 * rather than squeezing every tab down to an unreadable sliver, which is
 * what this component used to do instead (documented then as a deliberate
 * "no scroll here" rule — reversed after confirming on a real phone that
 * illegible squashed tabs were worse than a scrollable row).
 */
export function TabStrip<T extends string>({
  tabs,
  current,
  onChange,
  className = "",
}: {
  tabs: TabDef<T>[];
  current: T | undefined;
  onChange: (key: T) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Switching tabs can swap a tall tab's content for a short one (or back) —
  // without this, whatever scroll position the previous tab had left the
  // page/column at stays put, so the newly-short content can leave the
  // viewport looking at empty space, or the sudden height change yanks the
  // scroll position around as the browser clamps it to the new (shorter)
  // scrollable range. Scrolling this strip back into view on every switch
  // (not on mount, hence the `isFirstRender` guard) always lands the reader
  // at the top of whatever they just picked instead — `scrollIntoView` finds
  // whichever ancestor actually scrolls on its own (the modal's own overlay
  // on a phone's single-column layout, this column's own `overflow-y-auto`
  // at `md:`+), so one mechanism covers both breakpoints.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    containerRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [current]);

  if (tabs.length <= 1) return null;
  return (
    <div ref={containerRef} className={`scrollbar-themed flex gap-1 overflow-x-auto border-b border-slate-800 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex min-w-max flex-1 flex-col items-center gap-0.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-center text-sm font-semibold transition-colors ${
            current === tab.key ? "border-sky-400 text-sky-400" : "border-transparent text-slate-500 hover:text-slate-200"
          }`}
        >
          <span aria-hidden="true" className="leading-none">
            {tab.icon}
          </span>
          {tab.text}
        </button>
      ))}
    </div>
  );
}
