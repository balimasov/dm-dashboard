"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DotsVerticalIcon } from "./icons";

const EDGE_MARGIN = 8;

/**
 * Kebab-triggered dropdown for low-frequency actions (Export, Settings, ...)
 * that don't deserve a permanent slot in an already-crowded toolbar — same
 * click-outside-closes pattern as `SyncAllButton`'s own interval menu.
 * Clicking anywhere inside the panel closes it, so a plain `<a>`/`<button>`
 * child doesn't need its own `onClick` just to dismiss the menu.
 */
export function MoreMenu({
  children,
  label = "More actions",
  portal = false,
  variant = "boxed",
  renderTrigger,
}: {
  children: React.ReactNode;
  label?: string;
  /**
   * Renders the panel through a portal into `document.body`, `position:
   * fixed` from the trigger's own bounding rect, instead of the default
   * in-flow `absolute` panel. Opt-in and off by default so the existing
   * header usage (never inside a scrolling container) stays byte-for-byte
   * unaffected — needed only when the trigger lives inside something with
   * `overflow-x`/`overflow-y` set (a scrolling list, a horizontally
   * scrolling strip), where an in-flow `absolute` panel gets silently
   * clipped by that ancestor's own overflow — the same problem
   * `InfoTooltip.tsx`'s own doc comment describes for its hint panel,
   * fixed here with a smaller, non-persistent version of the same portal
   * approach (no scroll-reposition tracking or height capping — closing
   * on scroll is enough for a short-lived action menu).
   */
  portal?: boolean;
  /**
   * `"boxed"` (default) — the standalone mobile-header control, sitting
   * next to other bordered buttons ("+", the session dropdown) as a peer.
   * `"plain"` — the per-row desktop sidebar trigger, which sits *inside*
   * an already-visually-distinct row (its own hover/selected background);
   * a second bordered box there read as a redundant nested control rather
   * than part of the row.
   */
  variant?: "boxed" | "plain";
  /**
   * Replaces the default kebab-dots trigger button with a caller-supplied
   * one (e.g. `ReminderBadge`'s "🔥 N" pill) while keeping every other
   * `MoreMenu` mechanic — portal positioning, outside-click/scroll close —
   * exactly as-is, so a differently-shaped trigger doesn't need its own
   * from-scratch popover implementation. `toggle` opens/closes the same
   * `open` state the default button drives; the caller wires it to
   * whatever click target it needs.
   */
  renderTrigger?: (args: { open: boolean; toggle: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      // Once portaled, the panel is no longer a DOM descendant of
      // `containerRef` — without also checking `panelRef`, a click on any
      // item inside it would register as "outside" and close the menu
      // before the item's own `onClick` gets a chance to fire.
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Closing on any scroll (rather than repositioning, like `InfoTooltip`
  // does for its longer-lived hints) is enough for a short action menu —
  // capturing catches scrolling inside a nested container (the session
  // sidebar itself), not just the page.
  useEffect(() => {
    if (!open || !portal) return;
    function onScroll() {
      setOpen(false);
    }
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [open, portal]);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    const trigger = containerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    // Right-aligned with the trigger, same as the non-portal `right-0`.
    const maxLeft = window.innerWidth - panelRect.width - EDGE_MARGIN;
    const left = Math.max(Math.min(triggerRect.right - panelRect.width, maxLeft), EDGE_MARGIN);
    panel.style.left = `${left}px`;

    const spaceBelow = window.innerHeight - EDGE_MARGIN - (triggerRect.bottom + 4);
    if (panelRect.height <= spaceBelow) {
      panel.style.top = `${triggerRect.bottom + 4}px`;
      panel.style.bottom = "auto";
    } else {
      panel.style.top = "auto";
      panel.style.bottom = `${window.innerHeight - triggerRect.top + 4}px`;
    }
    panel.style.visibility = "visible";
  }, [open, portal]);

  const panel = open && (
    <div
      ref={panelRef}
      onClick={() => setOpen(false)}
      style={portal ? { left: "-9999px", visibility: "hidden" } : undefined}
      className={
        portal
          ? "fixed z-[60] min-w-[9rem] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40"
          : "absolute right-0 top-10 z-30 min-w-[9rem] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/40"
      }
    >
      {children}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {renderTrigger ? (
        renderTrigger({ open, toggle: () => setOpen((o) => !o) })
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={label}
          title={label}
          className={
            variant === "plain"
              ? "flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-slate-200"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          }
        >
          <DotsVerticalIcon className={variant === "plain" ? "h-4 w-4" : "h-5 w-5"} />
        </button>
      )}
      {portal ? panel && typeof document !== "undefined" && createPortal(panel, document.body) : panel}
    </div>
  );
}

/** Shared look for a plain link/button row inside a `MoreMenu` panel — same treatment as `SyncAllButton`'s own interval items. */
export const MORE_MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800";
