"use client";

import { getLinkVisual } from "@/lib/linkIcons";
import { QuickLink } from "@/lib/types";
import { useDismissiblePopover } from "@/hooks/useDismissiblePopover";
import { IconButton } from "./ui/IconButton";
import { QuickMenuPanel } from "./ui/QuickMenuPanel";
import { PencilIcon } from "./ui/icons";

/**
 * A `position: fixed` trigger pinned to the bottom-right corner of the
 * viewport (the same spot the old `FeedbackFab` occupied), so it stays
 * reachable at any scroll position during a session — the whole point is
 * looking something up mid-game without hunting for it. Shell and header
 * come from the shared `QuickMenuPanel` (same recipe as `RemindersFab`),
 * so the two float in the same corner of the screen and read as one
 * button family instead of two independently-styled ones.
 *
 * The popover opens *sideways* (`right-full`, growing left) rather than
 * upward (`bottom-full`) — this corner also stacks `RemindersFab`/
 * `DiceRollerFab` directly above this button with barely 12px between rows,
 * so an upward-opening panel used to render right on top of them, making
 * those FABs untappable until this one was dismissed first. Opening left
 * instead keeps the whole vertical FAB column clear no matter which of the
 * three is open.
 *
 * `z-[60]` — `Modal`'s own `z-50` convention plus one tier, the same value
 * `Toast.tsx`/a nested modal already use to float above an open `Modal` —
 * so this stays reachable (and its popover renders on top, not behind) while
 * a character/creature Details modal is open, since looking something up
 * mid-lookup at one is a real table moment, not an edge case worth ignoring.
 */
export function QuickLinksButton({ links, onManage }: { links: QuickLink[]; onManage?: () => void }) {
  const { open, setOpen, containerRef } = useDismissiblePopover();

  if (links.length === 0) return null;

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-[60]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick Links"
        aria-expanded={open}
        title="Quick Links"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-500/40 bg-slate-900 text-xl shadow-lg shadow-black/40 hover:bg-slate-800"
      >
        <span aria-hidden="true">🔗</span>
      </button>

      {open && (
        <QuickMenuPanel
          icon={<span aria-hidden="true">🔗</span>}
          title="Quick Links"
          count={links.length}
          manageAction={
            onManage && (
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
            )
          }
          className="scrollbar-themed absolute right-full bottom-0 mr-2 max-h-[70vh] w-64 max-w-[calc(100vw-5.5rem)] overflow-y-auto"
        >
          {/* Cancels the shell's own `p-3` on three sides so these rows can
              hover full-bleed edge-to-edge, same as before this shared
              `QuickMenuPanel` shell existed — each row's own `px-3 py-2`
              now plays the inset role the shell's padding used to. */}
          <div className="-mx-3 -mb-3">
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
        </QuickMenuPanel>
      )}
    </div>
  );
}
