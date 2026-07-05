"use client";

import { useEffect, useRef, useState } from "react";

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
 */
export function InfoTooltip({
  children,
  panel,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  return (
    <span
      ref={ref}
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
        className={`pointer-events-none absolute left-0 top-full z-20 mt-1 ${open ? "block" : "hidden"} w-64 max-w-[80vw] rounded-md border border-slate-700 bg-slate-950 p-2 text-xs font-normal normal-case leading-snug text-slate-300 shadow-xl group-hover/tooltip:block group-focus/tooltip:block`}
      >
        {panel}
      </span>
    </span>
  );
}
