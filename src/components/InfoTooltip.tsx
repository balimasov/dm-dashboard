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
 * near the corner of a long list). Once opened via tap/click, its actual
 * size is measured and the position is clamped/flipped to stay fully
 * on-screen; the hover-only path (desktop) keeps the plain CSS default,
 * since it doesn't have a "just opened" moment to measure from.
 */
export function InfoTooltip({
  children,
  panel,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const panelEl = panelRef.current;
    if (!panelEl) return;

    if (!open) {
      panelEl.style.left = "";
      panelEl.style.top = "";
      panelEl.style.bottom = "";
      panelEl.style.marginTop = "";
      panelEl.style.marginBottom = "";
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

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
      className="group/tooltip relative block max-w-full cursor-help"
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
    >
      <span className="block truncate underline decoration-dotted decoration-slate-600 underline-offset-2">
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
