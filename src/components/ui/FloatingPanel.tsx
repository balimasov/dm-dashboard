"use client";

import { PointerEvent as ReactPointerEvent, ReactNode, useId, useRef, useState } from "react";
import { useDesktopViewport } from "@/hooks/useDesktopViewport";
import { useFrontZIndex } from "@/hooks/useFrontZIndex";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { clampPosition, clampSize, FloatingPanelRect, parseSavedRect, resolveInitialRect } from "@/lib/floatingPanelGeometry";
import { IconButton } from "./IconButton";
import { ResizeGripIcon } from "./icons";
import { MODAL_TITLE_CLS } from "./typography";

const MIN_WIDTH = 440;
const MIN_HEIGHT = 360;
const EDGE_MARGIN = 8;
/**
 * Mobile sheet's own top inset — bigger than `EDGE_MARGIN` on purpose.
 * `CharacterDetailsModal`/`CreatureDetailsModal`'s status-rail badges
 * straddle the *top border of their nearest positioned ancestor* (see
 * `StatusRail.tsx`'s own comment) — normally the panel itself, since
 * neither modal's `header` content is `position`ed on its own — so half of
 * each badge (16px, for the 32px badge circle) renders *above* this panel's
 * own top edge. At `EDGE_MARGIN`'s plain 8px that overflow clipped against
 * the real top of the screen (confirmed via screenshot); this reserves
 * enough room above the panel itself for that peek to stay fully visible,
 * the same way it already is on desktop (where `defaultTop: 88` gives it
 * plenty of room) — this is a property of the *panel's position*, not
 * something to fix by changing where the badges themselves anchor.
 */
const MOBILE_TOP_MARGIN = 24;
const STORAGE_PREFIX = "floating-panel:";
/** Default base tier — see `zIndexClassName`'s own doc comment for what it sits between. Used as the fallback when a caller's class doesn't parse (should never happen with the only two literal values this prop is ever given). */
const DEFAULT_BASE_Z = 45;

/** Pulls the numeric base out of a `"z-[45]"`-shaped Tailwind class — the only two literal values `zIndexClassName` is ever given (see the component doc comment) — so `useFrontZIndex` can key its per-tier stacking order on the actual number rather than the class string. */
function parseBaseZ(zIndexClassName: string): number {
  const match = zIndexClassName.match(/\[(\d+)\]/);
  return match ? Number(match[1]) : DEFAULT_BASE_Z;
}

/**
 * The header's own action cluster (an optional caller action, e.g. "clear
 * conversation", plus the always-present close button) — split into its own
 * component only because the exact same row is otherwise hand-copied between
 * this file's mobile and desktop branches below.
 *
 * A thin vertical divider sits between `headerActions` and the close button
 * whenever the former is present, with a wider gap on each side of it —
 * without it, a destructive action (e.g. "clear conversation," `TrashOutlineIcon`
 * in `AiAssistantModal`) and "close" sat only 4px apart, which on a touch
 * screen is well within a fingertip's margin of error for hitting the wrong
 * one. The divider reads as two distinct button *groups* rather than one
 * continuous row, which cuts mis-taps far more than spacing alone would —
 * increasing gap without it just makes one row look sparser, not separated.
 */
function HeaderActionsRow({ headerActions, onClose }: { headerActions?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {headerActions}
      {headerActions && <span aria-hidden="true" className="h-4 w-px shrink-0 bg-slate-700" />}
      <IconButton onClick={onClose} aria-label="Close">
        ✕
      </IconButton>
    </div>
  );
}

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
 * `CharacterDetailsModal`/`CreatureDetailsModal` moved here for the same
 * "keep it open, keep working elsewhere" reason, plus dragging/resizing and
 * several open side by side — the whole point of turning them into panels
 * rather than staying `Modal`s.
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
 * `CharacterDetailsModal`/`CreatureDetailsModal` deliberately break that
 * rule the other way — both pass the literal `"entity-details"`, on
 * purpose, so *every* character/creature panel remembers one shared
 * position rather than a different one per entity (which one instance last
 * moved it to is what every other instance opens at, same as
 * `DiceRollerFab`'s single `"dice-roller"` key and `AiAssistantModal`'s
 * single `"ai-assistant"` key already do).
 *
 * `zIndexClassName` defaults to `z-[45]` — above `SectionNavRail`'s `z-30`
 * (ambient chrome the panel's default top-right spawn spot and drag range
 * can genuinely overlap; a resize/drag handle silently eaten by it was a
 * real bug here, not a hypothetical), but still below `Modal`'s default
 * `z-50`: a real modal
 * opened *afterward*, while this panel is already up (e.g. editing a
 * different character), should still land on top of it, backdrop and all —
 * this panel losing focus underneath that backdrop is the same behavior a
 * docked/pinned tool window would have against an app's own dialogs.
 *
 * A caller that wants this panel to always float above an open `Modal` —
 * regardless of which one opened first — passes `zIndexClassName="z-[60]"`,
 * the same nested-above-a-modal value `Modal`'s own `zIndexClassName` escape
 * hatch and `Toast.tsx` already use for exactly this "stacked on top of an
 * open modal" case. `DiceRollerFab` opts into this unconditionally (rolling
 * dice mid-lookup at a character/creature's Details modal is a common table
 * moment, not an edge case), and any caller that opens this panel from
 * *inside* an already-open `Modal` (e.g. `CharacterDetailsModal`'s own
 * "Ask AI" pill) needs it for the same reason — the panel is the newer,
 * just-opened thing there, so it must render above that enclosing modal's
 * `z-50` backdrop, not disappear behind it.
 *
 * `zIndexClassName`'s number is only the *floor* for this instance's actual
 * z-index — `useFrontZIndex` adds a small per-instance offset on top so
 * multiple simultaneously open panels of the same tier (e.g. "Ask AI" on
 * several different party members at once) stack by which one most recently
 * claimed the front, not by where their owning `CharacterCard`/`CreatureCard`
 * happens to sit in the party row (confirmed bug: opening a panel on an
 * earlier card than an already-open one rendered it underneath, purely from
 * DOM order, since every instance shared the exact same literal z-index).
 *

 * No `aria-modal` (defaults to non-modal) since, unlike `Modal`, this
 * doesn't make the rest of the page inert — a screen reader user can still
 * reach content behind it.
 *
 * Below `useDesktopViewport`'s breakpoint, drag/resize are dropped entirely
 * in favor of a fixed sheet inset from every edge by `EDGE_MARGIN`: on a
 * phone-width screen there's no room to usefully reposition a `MIN_WIDTH`-
 * wide window anyway, and the draggable version could previously spawn (or
 * be dragged) with its own header — the only way to close it — pushed
 * off-screen entirely, with no way back short of reloading the page.
 */
export function FloatingPanel({
  title,
  header,
  headerActions,
  onClose,
  children,
  storageKey,
  initialWidth = 480,
  initialHeight = 560,
  zIndexClassName = "z-[45]",
  panelClassName = "border-slate-800 bg-slate-950",
  align = "right",
  mobileVariant = "sheet",
}: {
  /** Ignored when `header` is given. */
  title?: ReactNode;
  /** Full custom header content, replacing the default title row entirely — same escape hatch `Modal`'s own `header` prop is, for the same reason: a call site whose header is richer than a plain heading (`CharacterDetailsModal`'s status rail + name row) owns the whole thing, including its own close button. Still sits inside the same draggable/bordered header region (dragging still works from anywhere in it that isn't a `<button>`), it just isn't forced into the default row's `items-center justify-between` layout. */
  header?: ReactNode;
  /** Optional extra icon buttons (e.g. a "clear conversation" trash icon) rendered between the title and the close button — ignored when `header` is given. */
  headerActions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  storageKey: string;
  initialWidth?: number;
  initialHeight?: number;
  /** Overrides the panel's stacking order — see the component doc comment above for when a caller needs `z-[60]` instead of the default. */
  zIndexClassName?: string;
  /** Replaces the panel's border color and background — same "shape stays fixed, color is a full replacement" split `Modal`'s own `panelClassName` uses (see that file's doc comment for why two conflicting color utilities can't safely coexist in one class string). `CharacterDetailsModal`/`CreatureDetailsModal` swap this for their violet concentrating-ring treatment. */
  panelClassName?: string;
  /** Where the panel spawns horizontally when there's no saved position yet — see `resolveInitialRect`'s own doc comment. Only affects the very first open (or after a viewport shrink discards the saved rect); a dragged position always wins once one exists. */
  align?: "right" | "center";
  /**
   * Below `useDesktopViewport`'s breakpoint only — desktop always drags/
   * resizes regardless of this prop. `"sheet"` (default) is this component's
   * own original mobile shape: a fixed, full-height inset sheet, its own
   * internal scroll, no backdrop — built for `AiAssistantModal`/
   * `DiceRollerFab`'s "stays reachable, keep working elsewhere" panels, which
   * want a fixed reachable spot even on a phone. `"modal"` is the exact
   * shape `CharacterDetailsModal`/`CreatureDetailsModal` had *before* either
   * became a `FloatingPanel` — a dimmed backdrop, content-sized (not pinned
   * to fixed geometry) panel, one shared scroll (header included, same as
   * `Modal`'s own `scrollable` variant) — brought back for those two
   * specifically after the `"sheet"` shape needed increasingly specific
   * margin tuning to avoid clipping their status-rail badges (which straddle
   * the panel's own top border, see `StatusRail.tsx`) and still read as
   * "not enough space" at the bottom even after that tuning: a natural-
   * height backdrop overlay doesn't have either problem in the first place,
   * since it's the same real page-level padding the old `Modal` always had,
   * not a fixed sheet's geometry standing in for it.
   */
  mobileVariant?: "sheet" | "modal";
}) {
  const isDesktop = useDesktopViewport();
  const visualViewport = useVisualViewport();
  const titleId = useId();
  const { zIndex, bringToFront } = useFrontZIndex(parseBaseZ(zIndexClassName));
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
      align,
    })
  );
  // Mirrors `rect` synchronously (set inside the same `setRect` updater, so
  // it's never a render behind) purely so the pointerup handlers below have
  // a guaranteed-fresh value to persist — reading `rect` itself there would
  // close over whatever it was when that render's handler was created.
  const rectRef = useRef(rect);

  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  if (!isDesktop && mobileVariant === "modal") {
    // The exact shape `Modal`'s own `scrollable` variant already uses —
    // dimmed backdrop, panel sized to its own content (no fixed height,
    // no internal scroll of its own), the *backdrop* is what scrolls when
    // content runs taller than the screen, header included, same as before
    // `CharacterDetailsModal`/`CreatureDetailsModal` ever became
    // `FloatingPanel`s. No drag handlers wired here at all (not just
    // visually hidden) — there's nothing to drag on a phone-width screen.
    return (
      <div
        className="scrollbar-themed fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/60 p-4 [scrollbar-gutter:stable]"
        // Plain `inset-0`'s `top: 0` is the *layout* viewport's top, which a
        // mobile browser's own address bar can sit right on top of — its own
        // chrome doesn't shrink the layout viewport, only the true *visual*
        // one, so a badge (or anything else) placed right at this backdrop's
        // literal top edge rendered underneath that chrome instead of below
        // it (confirmed via screenshot: the status-rail badges "flew off"
        // above the panel). `visualViewport.offsetTop` — see
        // `useVisualViewport`'s own doc comment — is how far down the real
        // visible area actually starts; falls back to the plain `inset-0`
        // top (0) before that hook's first read and on a browser with no
        // `visualViewport` support at all.
        style={{ top: visualViewport ? visualViewport.offsetTop : undefined, zIndex }}
        onPointerDownCapture={bringToFront}
      >
        <div
          role="dialog"
          aria-labelledby={header ? undefined : titleId}
          className={`flex w-full flex-col gap-4 rounded-xl border p-4 shadow-2xl shadow-black/40 ${panelClassName}`}
        >
          {header ?? (
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className={MODAL_TITLE_CLS}>
                {title}
              </h2>
              <HeaderActionsRow headerActions={headerActions} onClose={onClose} />
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  if (!isDesktop) {
    // Sized against `visualViewport` (the real visible area) rather than
    // plain `top`/`bottom` insets (the full, keyboard-obscured layout
    // viewport) whenever it's available — see `useVisualViewport`'s own
    // doc comment for why a plain-CSS sheet visibly jumps/resizes as the
    // on-screen keyboard opens and closes. Falls back to the old static
    // inset before the effect's first run and on a browser with no
    // `visualViewport` support at all.
    const mobileStyle = visualViewport
      ? {
          top: visualViewport.offsetTop + MOBILE_TOP_MARGIN,
          left: EDGE_MARGIN,
          right: EDGE_MARGIN,
          height: visualViewport.height - MOBILE_TOP_MARGIN - EDGE_MARGIN,
        }
      : { top: MOBILE_TOP_MARGIN, left: EDGE_MARGIN, right: EDGE_MARGIN, bottom: EDGE_MARGIN };
    return (
      <div
        role="dialog"
        aria-labelledby={header ? undefined : titleId}
        onPointerDownCapture={bringToFront}
        style={{ ...mobileStyle, zIndex }}
        className={`fixed flex flex-col rounded-xl border shadow-2xl shadow-black/40 ${panelClassName}`}
      >
        <div
          className={`shrink-0 border-b border-slate-800 px-4 py-3 ${header ? "" : "flex items-center justify-between gap-3"}`}
        >
          {header ?? (
            <>
              <h2 id={titleId} className={MODAL_TITLE_CLS}>
                {title}
              </h2>
              <HeaderActionsRow headerActions={headerActions} onClose={onClose} />
            </>
          )}
        </div>
        {/* `overscroll-contain` — without it, scrolling this content past its
          own top/bottom edge fell through to the dashboard page underneath
          and started scrolling *that* instead (a nested scroller's "no more
          room" bounce chains to the next scrollable ancestor by default —
          the same fix `RemindersFab.tsx`'s dropdown list already needed).
          The whole point of this panel not locking body scroll (see the
          component doc comment) is that the *page* stays scrollable on its
          own — not that scrolling *inside* the panel should leak into it.
          `pb-8` (not the plain `p-4` the desktop branch below keeps) — the
          sheet's own bottom edge stays at the standard `EDGE_MARGIN`, but
          scrolled all the way down, the last row still read as flush
          against the sheet's own border with only `p-4`'s implicit 16px
          under it (confirmed via screenshot); this doubles that specifically
          for the last row's own breathing room, independent of the sheet's
          outer position. */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 pb-8">{children}</div>
      </div>
    );
  }

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
      aria-labelledby={header ? undefined : titleId}
      onPointerDownCapture={bringToFront}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex }}
      className={`fixed flex flex-col rounded-xl border shadow-2xl shadow-black/40 ${panelClassName}`}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        className={`shrink-0 cursor-grab select-none border-b border-slate-800 px-4 py-3 active:cursor-grabbing ${header ? "" : "flex items-center justify-between gap-3"}`}
      >
        {header ?? (
          <>
            <h2 id={titleId} className={MODAL_TITLE_CLS}>
              {title}
            </h2>
            <HeaderActionsRow headerActions={headerActions} onClose={onClose} />
          </>
        )}
      </div>
      {/* `overscroll-contain` — without it, scrolling this content past its
          own top/bottom edge fell through to the dashboard page underneath
          and started scrolling *that* instead (a nested scroller's "no more
          room" bounce chains to the next scrollable ancestor by default —
          the same fix `RemindersFab.tsx`'s dropdown list already needed).
          The whole point of this panel not locking body scroll (see the
          component doc comment) is that the *page* stays scrollable on its
          own — not that scrolling *inside* the panel should leak into it. */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">{children}</div>
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
