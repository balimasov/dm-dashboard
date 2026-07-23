"use client";

import { useEffect, useState } from "react";

export interface SectionNavItem {
  id: string;
  emoji: string;
  label: string;
}

/**
 * A tiny fixed rail of emoji-only jump links, one per dashboard section — a
 * DM scrolling through Party/Companions/Enemies/NPCs/Inventory on a long
 * campaign page previously had no way to jump straight to one without
 * scrolling blind and guessing which direction. Deliberately just emoji
 * circles with a native `title` tooltip for the label (no visible text) and
 * hidden below `lg`, so it never competes with the actual page content for
 * space — the whole point was a compact affordance, not a second nav bar.
 *
 * The currently-in-view section is highlighted via `IntersectionObserver`
 * rather than `entries` array order (which doesn't reliably match page
 * order): each item's own DOM order in `items` is walked to find the first
 * one currently intersecting the activation band (`rootMargin`), so the
 * highlight always reflects whichever section's *top* has most recently
 * scrolled into view.
 */
export function SectionNavRail({ items }: { items: SectionNavItem[] }) {
  // Starts `undefined` (nothing highlighted) — this component is
  // server-rendered first, and the server has no scroll position to read at
  // all, so guessing an answer (e.g. defaulting to the first item) during
  // the client's own first render would render markup that mismatches what
  // the server sent and trip up hydration. The effect below resolves the
  // real value as soon as it runs (a synchronous DOM read, not a guess).
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Top offset clears the sticky header + action bar; a section only
    // counts as "active" once its top has scrolled up past that line.
    const topOffset = 130;

    // Resolve the very first highlight with a direct DOM measurement rather
    // than waiting on the IntersectionObserver's own first notification
    // below: that notification's delivery isn't pinned to any particular
    // timing guarantee, and in practice (especially in a dev-mode build,
    // with a page this long) it can trail this effect running by the better
    // part of a second — long enough that the rail visibly sits unlit and
    // then pops on, which reads as a flash of its own. By the time this
    // effect runs, the scroll position is already final (this is a passive
    // effect, and every layout effect — including the parent dashboard's own
    // scroll-restoration one — has already committed tree-wide beforehand),
    // so a `getBoundingClientRect()` read here gets the real answer
    // immediately. `queueMicrotask` (rather than calling `setActiveId`
    // straight from the effect body) is only there to keep this a reaction
    // to a callback rather than a synchronous derive-during-effect — it
    // still lands well before the observer's own notification would.
    let current: string | undefined;
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el && el.getBoundingClientRect().top <= topOffset) current = item.id;
    }
    if (current) queueMicrotask(() => setActiveId(current));

    const intersecting = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) intersecting.set(entry.target.id, entry.isIntersecting);
        const firstVisible = items.find((item) => intersecting.get(item.id));
        if (firstVisible) setActiveId(firstVisible.id);
      },
      // Same top offset as above; the large negative bottom margin means a
      // section only counts as "active" once its top has scrolled into the
      // upper slice of the viewport, not merely anywhere on screen.
      { rootMargin: `-${topOffset}px 0px -70% 0px`, threshold: 0 }
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Jump to section"
      className="fixed right-2 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1 rounded-full border border-slate-700 bg-slate-900/90 p-1.5 shadow-lg backdrop-blur lg:flex"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          aria-label={item.label}
          aria-current={activeId === item.id ? "true" : undefined}
          onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition ${
            activeId === item.id ? "bg-sky-600" : "hover:bg-white/10"
          }`}
        >
          <span aria-hidden="true">{item.emoji}</span>
        </button>
      ))}
    </nav>
  );
}
