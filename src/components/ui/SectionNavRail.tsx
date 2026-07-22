"use client";

import { useEffect, useState } from "react";

export interface SectionNavItem {
  id: string;
  emoji: string;
  label: string;
}

/**
 * First item (in page order) whose section is already scrolled into the
 * same activation band the `IntersectionObserver` below watches for —
 * `130`/`0.3` mirror that effect's own `rootMargin: "-130px 0px -70% 0px"`
 * math, just evaluated once via direct `getBoundingClientRect()` reads
 * instead of waiting on the observer's own (inherently async) first
 * callback. Falls back to the first item when nothing matches yet (e.g. the
 * page hasn't scrolled at all).
 */
function findActiveSection(items: SectionNavItem[]): string | undefined {
  if (typeof document === "undefined") return items[0]?.id;
  const bandTop = 130;
  const bandBottom = window.innerHeight * 0.3;
  for (const item of items) {
    const el = document.getElementById(item.id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top < bandBottom && rect.bottom > bandTop) return item.id;
  }
  return items[0]?.id;
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
  // Lazy initializer (runs once, synchronously, during the very first
  // render) instead of defaulting to `items[0]?.id` and correcting it later
  // in an effect — reloading mid-scroll (the browser restores the prior
  // scroll position on refresh) made that first paint briefly highlight the
  // first item before snapping to the right one once the effect's own
  // `IntersectionObserver` caught up. Computing the real answer up front, by
  // reading the DOM the server already rendered (hydration attaches to
  // existing markup, so these elements and their layout are already there),
  // means the first paint is already correct.
  const [activeId, setActiveId] = useState<string | undefined>(() => findActiveSection(items));

  useEffect(() => {
    const intersecting = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) intersecting.set(entry.target.id, entry.isIntersecting);
        const firstVisible = items.find((item) => intersecting.get(item.id));
        if (firstVisible) setActiveId(firstVisible.id);
      },
      // Top offset clears the sticky header + action bar; the large negative
      // bottom margin means a section only counts as "active" once its top
      // has scrolled into the upper slice of the viewport, not merely
      // anywhere on screen.
      { rootMargin: "-130px 0px -70% 0px", threshold: 0 }
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
