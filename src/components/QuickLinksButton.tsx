"use client";

import { useEffect, useRef, useState } from "react";
import { getLinkVisual } from "@/lib/linkIcons";
import { QuickLink } from "@/lib/types";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { IconButton } from "./ui/IconButton";
import { PencilIcon } from "./ui/icons";
import { PANEL_HEADING_CLS } from "./ui/typography";

/**
 * A `position: fixed` trigger pinned to the bottom-right corner of the
 * viewport (the same spot the old `FeedbackFab` occupied), so it stays
 * reachable at any scroll position during a session — the whole point is
 * looking something up mid-game without hunting for it. Same
 * click-outside-to-close popover pattern as `SyncAllButton`'s auto-sync menu
 * and `StatusRail`'s "+" add-status trigger. Trigger button, popover shell,
 * and popover header all match `RemindersFab`'s own recipe now (dark
 * circular button with an emoji glyph, `bg-slate-950` panel, `emoji + label
 * + (count)` heading) — the two float in the same corner of the screen and
 * used to look like two different button families sitting side by side.
 * Deliberately not `POPOVER_SHELL_CLS` here — that shared recipe's
 * `bg-slate-900` reads visibly lighter than `RemindersFab`'s own
 * `bg-slate-950`, which is the darker shade this popover is meant to match.
 */
export function QuickLinksButton({ links, onManage }: { links: QuickLink[]; onManage?: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(() => setOpen(false), open);

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
        className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-500/40 bg-slate-900 text-xl shadow-lg shadow-black/40 hover:bg-slate-800"
      >
        <span aria-hidden="true">🔗</span>
      </button>

      {open && (
        <div className="scrollbar-themed absolute right-0 bottom-full mb-2 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 py-1 shadow-xl">
          <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-0.5">
            <h2 className={`flex items-center gap-2 ${PANEL_HEADING_CLS}`}>
              <span aria-hidden="true">🔗</span>
              Quick Links
              <span className="font-normal text-slate-500">({links.length})</span>
            </h2>
            {onManage && (
              <IconButton
                tone="muted"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
                aria-label="Edit quick links"
                title="Edit quick links"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </IconButton>
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
