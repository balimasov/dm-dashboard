"use client";

import { PointerEvent as ReactPointerEvent, ReactNode, useId, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { MODAL_TITLE_CLS } from "./typography";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 260;
const EDGE_MARGIN = 8;

/**
 * A non-modal, draggable, resizable window — `Modal`'s opposite in one
 * specific way: no backdrop, no scroll lock, nothing behind it is inert.
 * Built for `AiAssistantModal`, whose whole point is comparing the model's
 * suggestion against other characters/creatures still on screen — a
 * centered `Modal` with its full-viewport backdrop made that impossible.
 * Position and size are plain component state (not persisted anywhere),
 * dragged from the header and resized from the bottom-right corner, each
 * clamped only against the window's own top/left edge (`EDGE_MARGIN`) the
 * same way the clickable prototype this was built from did — there's no
 * maximum-position clamp, so the panel can be dragged mostly off the right/
 * bottom edge if the user wants it out of the way rather than closed.
 *
 * Deliberately `z-30`, below `Modal`'s default `z-50`: a real modal opened
 * while this panel is up (e.g. editing a different character) should still
 * land on top of it, backdrop and all — this panel losing focus underneath
 * that backdrop is the same behavior a docked/pinned tool window would have
 * against an app's own dialogs.
 *
 * No `aria-modal` (defaults to non-modal) since, unlike `Modal`, this
 * doesn't make the rest of the page inert — a screen reader user can still
 * reach content behind it.
 */
export function FloatingPanel({
  title,
  onClose,
  children,
  initialWidth = 480,
  initialHeight = 560,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
}) {
  const titleId = useId();
  // Lazy initializer runs once, after mount in practice (this component is
  // only ever rendered once its caller's "open" state flips true, never
  // during the initial SSR pass) — anchored near the top-right corner like a
  // chat widget, not centered, so it reads as "a tool window that appeared,"
  // not "the modal that used to be here."
  const [rect, setRect] = useState(() => ({
    width: initialWidth,
    height: initialHeight,
    top: 88,
    left: Math.max(EDGE_MARGIN, window.innerWidth - initialWidth - 32),
  }));

  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  function onHeaderPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Excludes the close button — without this, pressing it would also
    // register as the start of a (zero-distance, but still state-touching)
    // drag.
    if ((e.target as HTMLElement).closest("button")) return;
    dragStart.current = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onHeaderPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStart.current;
    if (!drag) return;
    setRect((r) => ({
      ...r,
      left: Math.max(EDGE_MARGIN, drag.left + (e.clientX - drag.x)),
      top: Math.max(EDGE_MARGIN, drag.top + (e.clientY - drag.y)),
    }));
  }
  function onHeaderPointerUp() {
    dragStart.current = null;
  }

  function onResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Otherwise the header's own drag handler (this handle sits inside the
    // panel, not the header, so this only matters if that ever changes) or
    // any other ancestor listener would also see this as its own gesture.
    e.stopPropagation();
    resizeStart.current = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeStart.current;
    if (!resize) return;
    const maxWidth = window.innerWidth - rect.left - EDGE_MARGIN;
    const maxHeight = window.innerHeight - rect.top - EDGE_MARGIN;
    setRect((r) => ({
      ...r,
      width: Math.min(Math.max(MIN_WIDTH, resize.width + (e.clientX - resize.x)), maxWidth),
      height: Math.min(Math.max(MIN_HEIGHT, resize.height + (e.clientY - resize.y)), maxHeight),
    }));
  }
  function onResizePointerUp() {
    resizeStart.current = null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      className="fixed z-30 flex flex-col rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        className="flex shrink-0 cursor-grab items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 select-none active:cursor-grabbing"
      >
        <h2 id={titleId} className={MODAL_TITLE_CLS}>
          {title}
        </h2>
        <IconButton onClick={onClose} aria-label="Close">
          ✕
        </IconButton>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
      <div
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        aria-hidden
        className="absolute bottom-0 right-0 flex h-5 w-5 touch-none items-end justify-end p-1 text-slate-600 hover:text-slate-400"
        style={{ cursor: "nwse-resize" }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M8 1L1 8M8 4.5L4.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
