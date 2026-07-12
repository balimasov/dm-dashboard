"use client";

import { useLayoutEffect, useRef, useState } from "react";

const EDGE_MARGIN = 8;

/**
 * Truncating an element requires `overflow: hidden`, which would also clip an
 * absolutely-positioned tooltip nested inside it. So the truncated text and
 * the tooltip panel are siblings under one non-clipping `relative` wrapper —
 * only the text span truncates, the panel is free to render outside its box.
 *
 * Shown on `:hover`/`:focus` for mouse/keyboard users, but neither fires from
 * a tap on a touch screen — confirmed a real tap does nothing on mobile.
 * `open` state adds a tap-to-toggle affordance on top of the existing CSS
 * triggers (a second tap, or a tap outside, closes it) without changing
 * anything for mouse users.
 *
 * The panel defaults to appearing below and left-aligned with the trigger,
 * which overflows off-screen for a trigger near the right edge or bottom of
 * the viewport (confirmed on a real phone — clipped on both edges for a hint
 * near the corner of a long list). Its actual size is measured and the
 * position clamped/flipped to stay fully on-screen — done on tap/click *and*
 * on mouse enter/focus, not just the tap-driven `open` state: the panel is
 * also shown by plain CSS on `:hover`/`:focus` (see the className below) for
 * desktop mouse users, and that path doesn't touch React state at all. Only
 * repositioning on `open` left the hover path stuck on the unclamped CSS
 * default (confirmed overflowing badly once a narrower container made more
 * triggers sit close to an edge), and since clicking a hovered trigger then
 * *does* snap it to the corrected position, the two together looked exactly
 * like a jumping tooltip.
 */
export function InfoTooltip({
  children,
  panel,
  hoverOnly = false,
  inline = false,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
  /** Skips the tap-to-toggle affordance and the dotted-underline hint styling — for wrapping an element that already has its own onClick (e.g. a toggle button), so a click there isn't hijacked into opening the tooltip instead of firing that handler. Hover/focus still shows the panel via CSS. */
  hoverOnly?: boolean;
  /**
   * For a short label (e.g. "Resist:") that needs to sit on the same line as
   * plain text right after it — the default trigger is `block`/`truncate`
   * for standalone use (a whole pill, a whole row), which forces a line
   * break before any inline sibling. `inline` skips both, since a short
   * label never needs truncation anyway.
   */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);

  function positionPanel() {
    const panelEl = panelRef.current;
    const wrapper = wrapperRef.current;
    if (!panelEl || !wrapper) return;

    panelEl.style.left = "0px";
    const wrapperRect = wrapper.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();

    const maxLeft = window.innerWidth - panelRect.width - EDGE_MARGIN;
    const desiredLeft = Math.max(Math.min(wrapperRect.left, maxLeft), EDGE_MARGIN);
    panelEl.style.left = `${desiredLeft - wrapperRect.left}px`;

    const fitsBelow = wrapperRect.bottom + 4 + panelRect.height <= window.innerHeight - EDGE_MARGIN;
    if (fitsBelow) {
      panelEl.style.top = "100%";
      panelEl.style.bottom = "auto";
      panelEl.style.marginTop = "4px";
      panelEl.style.marginBottom = "0";
    } else {
      // `top-full` (Tailwind's `top: 100%`) is still active from the
      // className below — clearing the inline override to "" only means "no
      // override", not "cancelled", so without an explicit `auto` here it
      // stacks with the `bottom: 100%` below and the browser stretches the
      // box between two 100% constraints, collapsing it to near-zero height
      // (confirmed: a 148px-tall panel measured 18px tall until this was
      // set explicitly).
      panelEl.style.top = "auto";
      panelEl.style.bottom = "100%";
      panelEl.style.marginTop = "0";
      panelEl.style.marginBottom = "4px";
    }
  }

  useLayoutEffect(() => {
    if (open) {
      positionPanel();
    } else {
      const panelEl = panelRef.current;
      if (!panelEl) return;
      panelEl.style.left = "";
      panelEl.style.top = "";
      panelEl.style.bottom = "";
      panelEl.style.marginTop = "";
      panelEl.style.marginBottom = "";
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className={`group/tooltip relative inline-block max-w-full ${hoverOnly ? "" : "cursor-help"}`}
      onClick={
        hoverOnly
          ? undefined
          : (e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }
      }
      onMouseEnter={positionPanel}
      onFocus={positionPanel}
    >
      <span
        className={
          inline
            ? hoverOnly
              ? ""
              : "underline decoration-dotted decoration-slate-600 underline-offset-2"
            : hoverOnly
              ? "block"
              : "block truncate underline decoration-dotted decoration-slate-600 underline-offset-2"
        }
      >
        {children}
      </span>
      <span
        ref={panelRef}
        className={`pointer-events-none absolute left-0 top-full z-20 mt-1 ${open ? "block" : "hidden"} w-64 max-w-[80vw] rounded-md border border-slate-700 bg-slate-950 p-2 text-xs font-normal normal-case leading-snug text-slate-300 shadow-xl group-hover/tooltip:block group-focus/tooltip:block`}
      >
        {panel}
      </span>
    </span>
  );
}
