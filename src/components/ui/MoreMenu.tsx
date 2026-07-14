"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Kebab-triggered dropdown for low-frequency actions (Export, Settings, ...)
 * that don't deserve a permanent slot in an already-crowded toolbar — same
 * click-outside-closes pattern as `SyncAllButton`'s own interval menu.
 * Clicking anywhere inside the panel closes it, so a plain `<a>`/`<button>`
 * child doesn't need its own `onClick` just to dismiss the menu.
 */
export function MoreMenu({ children, label = "More actions" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title={label}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-lg leading-none text-slate-300 hover:bg-slate-800"
      >
        ⋮
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 top-10 z-30 min-w-[9rem] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Shared look for a plain link/button row inside a `MoreMenu` panel — same treatment as `SyncAllButton`'s own interval items. */
export const MORE_MENU_ITEM_CLASS =
  "flex w-full items-center px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800";
