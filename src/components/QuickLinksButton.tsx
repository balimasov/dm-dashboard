"use client";

import { useEffect, useRef, useState } from "react";
import { getLinkVisual, LinkIcon } from "@/lib/linkIcons";
import { QuickLink } from "@/lib/types";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19 3 20l1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A `position: fixed` trigger pinned to the bottom-right corner of the
 * viewport (the same spot the old `FeedbackFab` occupied), so it stays
 * reachable at any scroll position during a session — the whole point is
 * looking something up mid-game without hunting for it. Same
 * click-outside-to-close popover pattern as `SyncAllButton`'s auto-sync menu
 * and `StatusRail`'s "+" add-status trigger.
 */
export function QuickLinksButton({ links, onManage }: { links: QuickLink[]; onManage?: () => void }) {
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
    <div ref={containerRef} className="fixed bottom-5 right-5 z-40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick links"
        aria-expanded={open}
        title="Quick links"
        className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg shadow-black/40 transition hover:scale-105 ${
          open ? "border-sky-400 bg-sky-500 text-white" : "border-sky-600 bg-sky-600 text-white hover:bg-sky-500"
        }`}
      >
        <LinkIcon className="h-6 w-6" />
      </button>

      {open && (
        <div className="scrollbar-themed absolute right-0 bottom-full mb-2 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between px-3 pb-1 pt-0.5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Quick Links</p>
            {onManage && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
                aria-label="Edit quick links"
                title="Edit quick links"
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-800 hover:text-sky-400"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
