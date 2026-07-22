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
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);

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
