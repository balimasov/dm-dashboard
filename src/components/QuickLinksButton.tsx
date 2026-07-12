"use client";

import { useEffect, useRef, useState } from "react";
import { getLinkVisual, LinkIcon } from "@/lib/linkIcons";
import { QuickLink } from "@/lib/types";

/**
 * A `position: fixed` trigger pinned to the right edge of the viewport, so
 * it stays reachable at any scroll position during a session — the whole
 * point is looking something up mid-game without hunting for it. Same
 * click-outside-to-close popover pattern as `SyncAllButton`'s auto-sync menu
 * and `StatusRail`'s "+" add-status trigger.
 */
export function QuickLinksButton({ links }: { links: QuickLink[] }) {
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

  if (links.length === 0) return null;

  return (
    <div ref={containerRef} className="fixed right-3 top-1/2 z-40 -translate-y-1/2 sm:right-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick links"
        aria-expanded={open}
        title="Quick links"
        className={`flex h-11 w-11 items-center justify-center rounded-full border bg-slate-900 shadow-lg shadow-black/40 hover:bg-slate-800 ${
          open ? "border-sky-500 text-sky-400" : "border-slate-700 text-slate-300"
        }`}
      >
        <LinkIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="scrollbar-themed absolute right-0 top-full mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40">
          <p className="px-3 pb-1 pt-0.5 text-[10px] uppercase tracking-wide text-slate-500">Quick Links</p>
          {links.map((link) => {
            const visual = getLinkVisual(link.url);
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                {visual.kind === "known" ? (
                  <visual.Icon className={`h-4 w-4 shrink-0 ${visual.colorClass}`} />
                ) : (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{
                      color: `hsl(${visual.hue}, 80%, 78%)`,
                      backgroundColor: `hsla(${visual.hue}, 70%, 50%, 0.18)`,
                      border: `1px solid hsl(${visual.hue}, 70%, 50%)`,
                    }}
                  >
                    {visual.abbr}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{link.label || link.url}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
