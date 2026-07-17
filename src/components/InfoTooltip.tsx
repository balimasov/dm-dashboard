"use client";

import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";

const EDGE_MARGIN = 8;

/**
 * The panel renders through a portal into `document.body`, positioned with
 * `position: fixed` computed from the trigger's own `getBoundingClientRect()`
 * — not as an absolutely-positioned DOM child of the trigger. An earlier
 * version nested the panel directly under the trigger (a sibling under one
 * non-clipping `relative` wrapper, to dodge the trigger's own `truncate`
 * `overflow: hidden`), which works right up until some *other* ancestor
 * — not the trigger itself — sets `overflow-x: auto` for its own reasons
 * (a horizontally-scrolling row of cards, a horizontally-scrolling row of
 * histogram columns): the CSS overflow spec forces that ancestor's
 * `overflow-y` to compute as `auto` too the moment `overflow-x` isn't
 * `visible`, silently clipping any descendant that pokes out the bottom —
 * confirmed on the Spell Slots histogram at a phone-width viewport, where
 * only a sliver of a tapped column's hint survived. Portaling out to
 * `document.body` sidesteps every such ancestor at once, current and future,
 * instead of chasing down each new scrolling row as it's added — the same
 * "fix the root cause, not the symptom" call already made for the
 * histogram's own column-width overflow (`shared.tsx`'s container queries).
 *
 * Portaling to `document.body` also moves the panel out of the trigger's DOM
 * subtree, so the old pure-CSS `:hover`/`:focus` reveal (`group-hover`,
 * matched by an actual DOM ancestor relationship) can no longer reach it —
 * replaced with `hovered` state set directly from `onMouseEnter`/
 * `onMouseLeave`/focus-capture, which also means `visible` (hover OR the
 * tap-driven `open`) is now the one source of truth for whether the panel
 * should even be mounted, rather than mounting it always and toggling
 * `hidden`.
 *
 * Neither fires from a tap on a touch screen — confirmed a real tap does
 * nothing on mobile. `open` state adds a tap-to-toggle affordance on top of
 * hover/focus (a second tap, or a tap outside, closes it) without changing
 * anything for mouse/keyboard users.
 *
 * The panel defaults to appearing below and left-aligned with the trigger,
 * which overflows off-screen for a trigger near the right edge or bottom of
 * the viewport — its actual size is measured and the position clamped/
 * flipped to stay fully on-screen, recomputed on scroll/resize too (a fixed-
 * position panel doesn't move with the page the way the old in-flow
 * absolutely-positioned one naturally did, so without this it would drift
 * away from its trigger the moment either the page or a nested scrolling
 * row — like the same histogram row above — scrolls while the panel is
 * open).
 */
export function InfoTooltip({
  children,
  panel,
  hoverOnly = false,
  disableTap = false,
  inline = false,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
  /** Skips the dotted-underline styling only — for wrapping a compact chip, icon, or badge that already reads as its own visual unit and doesn't need a "this is hintable text" affordance. The `cursor-help` hover cursor still applies (see `disableTap` for the one case that also loses that), so every hintable element gives the same cursor feedback regardless of how it's styled. */
  hoverOnly?: boolean;
  /** Skips the tap-to-toggle click handler *and* the `cursor-help` cursor — for wrapping an element that already has its own onClick (e.g. a toggle button, or a row nested inside a clickable header), so a tap there isn't hijacked into opening the tooltip instead of firing that handler, and the cursor doesn't advertise "hover for info" over what's really a button. Hover/focus still shows the panel via CSS on desktop. Without `disableTap`, touch devices have no way to open the panel at all, since neither `:hover` nor `:focus` fires from a tap. */
  disableTap?: boolean;
  /**
   * The trigger is always `inline-block` (sits on the same line as
   * surrounding text either way) — `inline` only skips the inner span's
   * `block`/`truncate`, for a short label (e.g. "Resist:") that's never
   * going to overflow its container and so doesn't need the ellipsis
   * machinery at all.
   */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const visible = open || hovered;

  // Position is written straight to the portaled panel's own DOM node via
  // the ref, not through React state — the same call the original
  // absolutely-positioned version made (see its own past comment), and for
  // the same reason: a state-driven position would need an extra render to
  // reach the screen, and setting it synchronously inside this very effect
  // is exactly what triggers React's "avoid calling setState in an effect"
  // warning. Direct style mutation happens in the same layout-effect pass,
  // before the browser paints, with no extra render in between.
  useLayoutEffect(() => {
    if (!visible) return;

    function computePosition() {
      const wrapper = wrapperRef.current;
      const panelEl = panelRef.current;
      if (!wrapper || !panelEl) return;

      // Reset any cap a previous call left behind before measuring — a
      // panel that no longer needs to scroll (say, after a resize freed up
      // room) must be measured at its real, uncapped height, not whatever
      // was set last time.
      panelEl.style.maxHeight = "none";
      panelEl.style.overflowY = "visible";
      panelEl.style.pointerEvents = "none";

      const wrapperRect = wrapper.getBoundingClientRect();
      const panelRect = panelEl.getBoundingClientRect();

      const maxLeft = window.innerWidth - panelRect.width - EDGE_MARGIN;
      const left = Math.max(Math.min(wrapperRect.left, maxLeft), EDGE_MARGIN);
      panelEl.style.left = `${left}px`;

      const spaceBelow = window.innerHeight - EDGE_MARGIN - (wrapperRect.bottom + 4);
      const spaceAbove = wrapperRect.top - 4 - EDGE_MARGIN;
      // Below whenever it fully fits there (matches the old behavior for
      // every normal-sized hint exactly) — otherwise whichever side
      // actually has more room, rather than always flipping to "above"
      // regardless of whether above has even less space (the previous
      // logic's bug: a hint opened near the *top* of the page has almost no
      // room above it, so unconditionally flipping there still clipped it).
      const openBelow = panelRect.height <= spaceBelow || spaceBelow >= spaceAbove;
      const available = openBelow ? spaceBelow : spaceAbove;

      if (panelRect.height > available) {
        // Doesn't fit even on the roomier side — a long hint (e.g. a magic
        // weapon's full rules text) would otherwise run off the top or
        // bottom of the viewport with no way to reach the missing part, since
        // a `position: fixed` panel doesn't scroll with the page. Capped and
        // made internally scrollable instead, with real pointer events so a
        // mouse wheel or touch drag actually reaches it (`pointer-events:
        // none` is the default the rest of the time, so a normal-sized hint
        // never blocks clicks on whatever it happens to overlap).
        panelEl.style.maxHeight = `${Math.max(available, 0)}px`;
        panelEl.style.overflowY = "auto";
        panelEl.style.pointerEvents = "auto";
      }

      if (openBelow) {
        panelEl.style.top = `${wrapperRect.bottom + 4}px`;
        panelEl.style.bottom = "auto";
      } else {
        panelEl.style.top = "auto";
        panelEl.style.bottom = `${window.innerHeight - wrapperRect.top + 4}px`;
      }
      panelEl.style.visibility = "visible";
    }

    computePosition();
    window.addEventListener("scroll", computePosition, { capture: true, passive: true });
    window.addEventListener("resize", computePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", computePosition, { capture: true });
      window.removeEventListener("resize", computePosition);
    };
  }, [visible]);

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
      // `inline-block` (not `block`) so the hover/click target hugs the text
      // instead of stretching to fill a flex/block container. `align-top` is
      // load-bearing: an inline-block's default `vertical-align: baseline`
      // reserves extra space below it for descenders in the surrounding line
      // box, which was inflating every row that used this component (most
      // visibly the Inventory item list, where it added ~5px per row).
      className={`inline-block max-w-full align-top ${disableTap ? "" : "cursor-help"}`}
      onClick={
        disableTap
          ? undefined
          : (e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
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
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          // `left: -9999px`/`visibility: hidden` is the pre-measurement
          // default for the one frame between this mounting and the layout
          // effect's synchronous `computePosition()` overwriting it (via the
          // ref, not a re-render) — never actually visible to the user.
          <div
            ref={panelRef}
            style={{ left: "-9999px", visibility: "hidden" }}
            className="pointer-events-none fixed z-50 w-64 max-w-[80vw] rounded-md border border-slate-700 bg-slate-950 p-2 text-left text-xs font-normal normal-case leading-snug text-slate-300 shadow-xl"
            // No-ops while the panel is `pointer-events: none` (the common
            // case — the browser never dispatches mouse events to it then),
            // and only actually fire once `computePosition` switches it to
            // `auto` for a tall, internally-scrolled panel — keeping
            // `hovered` true while the mouse is over the panel itself, so
            // moving off the trigger to scroll the hint doesn't close it.
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {panel}
          </div>,
          document.body
        )}
    </span>
  );
}
