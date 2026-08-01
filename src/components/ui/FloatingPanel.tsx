"use client";

import { PointerEvent as ReactPointerEvent, ReactNode, useId, useRef, useState } from "react";
import { clampPosition, clampSize, FloatingPanelRect, parseSavedRect, resolveInitialRect } from "@/lib/floatingPanelGeometry";
import { IconButton } from "./IconButton";
import { ResizeGripIcon } from "./icons";
import { MODAL_TITLE_CLS } from "./typography";

const MIN_WIDTH = 440;
const MIN_HEIGHT = 360;
const EDGE_MARGIN = 8;
const STORAGE_PREFIX = "floating-panel:";

/** Best-effort read of a previously saved size/position — blocked `localStorage` access (private browsing, storage disabled) falls back to `null` the same as no saved value at all; malformed JSON is `parseSavedRect`'s own concern. */
function loadSavedRect(storageKey: string): FloatingPanelRect | null {
  try {
    return parseSavedRect(window.localStorage.getItem(STORAGE_PREFIX + storageKey));
  } catch {
    return null;
  }
}

function saveRect(storageKey: string, rect: FloatingPanelRect) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(rect));
  } catch {
    // Storage quota/private-mode — losing the remembered geometry next time isn't worth surfacing an error for.
  }
}

/**
 * A non-modal, draggable, resizable window — `Modal`'s opposite in one
 * specific way: no backdrop, no scroll lock, nothing behind it is inert.
 * Built for `AiAssistantModal`, whose whole point is comparing the model's
 * suggestion against other characters/creatures still on screen — a
 * centered `Modal` with its full-viewport backdrop made that impossible.
 *
 * Size/position math (parsing a saved rect, clamping a drag/resize) lives in
 * `lib/floatingPanelGeometry.ts`, not here — see that file's own doc comment
 * for why (short version: it's the only way that logic gets unit-tested at
 * all in this project). This component owns only the DOM/event wiring and
 * the actual `localStorage` calls.
 *
 * Clamped to `MIN_WIDTH`/`MIN_HEIGHT` on the small end (large enough that the
 * input bar and an option's text never wrap into an awkwardly narrow column)
 * and only to the window's own top/left edge (`EDGE_MARGIN`) on the other —
 * there's no maximum-position clamp, so the panel can be dragged mostly off
 * the right/bottom edge if the user wants it out of the way rather than
 * closed.
 *
 * `storageKey` persists the last size/position to `localStorage` (read once
 * on mount, written on drag/resize release) so the panel reopens where it
 * was left instead of resetting to the default top-right spot every time —
 * required, not optional, so a second caller down the line can't
 * accidentally collide with this one's saved geometry via a shared default.
 *
 * `z-[45]` — above `SectionNavRail`'s `z-30` and the bottom-corner FABs'
 * `z-40` (both ambient chrome the panel's default top-right spawn spot and
 * drag range can genuinely overlap; a resize/drag handle silently eaten by
 * one of those was a real bug here, not a hypothetical), but still below
 * `Modal`'s default `z-50`: a real modal opened while this panel is up (e.g.
 * editing a different character) should still land on top of it, backdrop
 * and all — this panel losing focus underneath that backdrop is the same
 * behavior a docked/pinned tool window would have against an app's own
 * dialogs.
 *
 * No `aria-modal` (defaults to non-modal) since, unlike `Modal`, this
 * doesn't make the rest of the page inert — a screen reader user can still
 * reach content behind it.
 */
export function FloatingPanel({
  title,
  onClose,
  children,
  storageKey,
  initialWidth = 480,
  initialHeight = 560,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  storageKey: string;
  initialWidth?: number;
  initialHeight?: number;
}) {
  const titleId = useId();
  // Lazy initializer runs once, after mount in practice (this component is
  // only ever rendered once its caller's "open" state flips true, never
  // during the initial SSR pass).
  const [rect, setRect] = useState<FloatingPanelRect>(() =>
    resolveInitialRect({
      saved: loadSavedRect(storageKey),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      edgeMargin: EDGE_MARGIN,
      defaultWidth: initialWidth,
      defaultHeight: initialHeight,
      defaultTop: 88,
      defaultRightGap: 32,
    })
  );
  // Mirrors `rect` synchronously (set inside the same `setRect` updater, so
  // it's never a render behind) purely so the pointerup handlers below have
  // a guaranteed-fresh value to persist — reading `rect` itself there would
  // close over whatever it was when that render's handler was created.
  const rectRef = useRef(rect);

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
    setRect((r) => {
      const next = { ...r, ...clampPosition(drag.left + (e.clientX - drag.x), drag.top + (e.clientY - drag.y), EDGE_MARGIN) };
      rectRef.current = next;
      return next;
    });
  }
  function onHeaderPointerUp() {
    if (dragStart.current) saveRect(storageKey, rectRef.current);
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
    setRect((r) => {
      const next = {
        ...r,
        ...clampSize(resize.width + (e.clientX - resize.x), resize.height + (e.clientY - resize.y), {
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
          maxWidth,
          maxHeight,
        }),
      };
      rectRef.current = next;
      return next;
    });
  }
  function onResizePointerUp() {
    if (resizeStart.current) saveRect(storageKey, rectRef.current);
    resizeStart.current = null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      className="fixed z-[45] flex flex-col rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
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
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</div>
      <div
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        aria-hidden
        className="absolute bottom-0 right-0 flex h-5 w-5 touch-none items-end justify-end p-1 text-slate-600 hover:text-slate-400"
        style={{ cursor: "nwse-resize" }}
      >
        <ResizeGripIcon className="h-2.5 w-2.5" />
      </div>
    </div>
  );
}
