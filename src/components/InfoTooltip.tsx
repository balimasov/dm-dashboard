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
/** Tailwind v4's `sm` breakpoint (`min-width: 40rem`) — matches "mobile" below it, the same viewport-width convention `NotesSection`/`CampaignDescription` already use for their own mobile-vs-desktop pencil-icon behavior, rather than a `pointer`/`hover` media feature this codebase doesn't otherwise reference. */
const DESKTOP_MEDIA_QUERY = "(min-width: 40rem)";

export function InfoTooltip({
  children,
  panel,
  hoverOnly = false,
  disableTap = false,
  desktopOnly = false,
  mobileOnly = false,
  inline = false,
  className,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
  /** Skips the dotted-underline styling only — for wrapping a compact chip, icon, or badge that already reads as its own visual unit and doesn't need a "this is hintable text" affordance. The `cursor-help` hover cursor still applies (see `disableTap` for the one case that also loses that), so every hintable element gives the same cursor feedback regardless of how it's styled. */
  hoverOnly?: boolean;
  /** Skips the tap-to-toggle click handler *and* the `cursor-help` cursor — for wrapping an element that already has its own onClick (e.g. a toggle button, or a row nested inside a clickable header), so a tap there isn't hijacked into opening the tooltip instead of firing that handler, and the cursor doesn't advertise "hover for info" over what's really a button. Hover/focus still shows the panel via CSS on desktop. Without `disableTap`, touch devices have no way to open the panel at all, since neither `:hover` nor `:focus` fires from a tap. */
  disableTap?: boolean;
  /**
   * Below `sm`, the trigger stops listening for hover/focus/tap entirely —
   * `children` still render exactly as passed, just with no panel ever
   * mounting. For a trigger that's *also* a real control (Concentration's
   * toggle button, the Heroic Inspiration star sitting inside the card's
   * open-details button): on a touch screen the first tap on such an
   * element often only satisfies a synthetic `:hover`/`mouseenter` (iOS'
   * long-standing "first tap hovers, second tap clicks" behavior), which
   * pops this panel open and requires a *second* tap just to dismiss it —
   * a tap that can just as easily land on a neighboring control instead.
   * Desktop mouse users never trigger that synthetic hover, so behavior
   * there is untouched. Doesn't drop `disableTap`'s own click handler by
   * itself — pass both when the wrapped element needs neither.
   */
  desktopOnly?: boolean;
  /**
   * The mirror of `desktopOnly` — at/above `sm` the trigger stops listening
   * for hover/focus/tap entirely, for a trigger whose panel would only
   * repeat what's already shown as plain text right next to it once there's
   * room for that text (e.g. the header sync pill's clock icon, once its
   * date shows inline beside it above `sm` — the hint would just say the
   * same thing again). Below `sm`, where that text is hidden, the trigger
   * stays fully interactive.
   */
  mobileOnly?: boolean;
  /**
   * The trigger is always `inline-block` (sits on the same line as
   * surrounding text either way) — `inline` only skips the inner span's
   * `block`/`truncate`, for a short label (e.g. "Resist:") that's never
   * going to overflow its container and so doesn't need the ellipsis
   * machinery at all.
   */
  inline?: boolean;
  /**
   * Extra classes merged onto the trigger's own outer span, *in addition to*
   * its default `inline-block` sizing — for the one case where the hoverable/
   * tappable zone needs to be bigger than the text itself (e.g. `w-full` so
   * an icon-plus-name row hovers as one strip instead of just the name
   * word). Omit it and the trigger hugs its content exactly as before.
   */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Lazy initializer (not a value set from an effect) so the very first
  // client render already has the right answer, before paint — the whole
  // point of `desktopOnly` is dodging a *very* early synthetic hover on
  // first touch, so a mobile viewport must never get even one frame where
  // the trigger is briefly listening. Server-rendered as `true` (`window`
  // doesn't exist yet); harmless, since this only gates event handlers, not
  // anything present in the server-rendered HTML itself.
  const watchesBreakpoint = desktopOnly || mobileOnly;
  const [isDesktop, setIsDesktop] = useState(
    () => !watchesBreakpoint || typeof window === "undefined" || window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  );
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!watchesBreakpoint) return;
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [watchesBreakpoint]);

  const suppressed = (desktopOnly && !isDesktop) || (mobileOnly && isDesktop);
  const visible = !suppressed && (open || hovered);

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
      // A plain hover-preview stays `pointer-events: none` (never blocks a
      // click on whatever it happens to overlap) — but once pinned open by a
      // click, the panel becomes a real interactive surface, the same way
      // the always-scrolling case below already was. Without this, a nested
      // `InfoTooltip` inside this one's `panel` content (e.g. a resource's
      // own hint, hoverable from inside the pinned Resources hint) could
      // never receive the mouse events it needs — pointer-events:none
      // applies to the whole subtree, not just this element.
      panelEl.style.pointerEvents = open ? "auto" : "none";

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
        // mouse wheel or touch drag actually reaches it even during a plain
        // hover preview (not just once pinned, unlike the `open` case above).
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
    // `open` is a dependency (not just `visible`) purely so pointer-events
    // gets recomputed the moment a hover-only preview turns into a pin —
    // `visible` itself (`open || hovered`) doesn't necessarily change value
    // at that instant if `hovered` was already true, so the effect wouldn't
    // otherwise re-run to pick up the new pointer-events state.
  }, [visible, open]);

  useLayoutEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      const target = e.target as Node;
      // A click inside the portaled panel itself (rows, a nested
      // `InfoTooltip`'s own trigger, whatever `panel` content chose to
      // render) isn't "outside" just because the panel lives outside
      // `wrapperRef`'s DOM subtree via the portal — only a click that lands
      // in neither the trigger nor the panel should close this.
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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
      className={`inline-block max-w-full align-top ${disableTap || suppressed ? "" : "cursor-help"} ${className ?? ""}`}
      onClick={
        disableTap || suppressed
          ? undefined
          : (e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }
      }
      onMouseEnter={suppressed ? undefined : () => setHovered(true)}
      onMouseLeave={suppressed ? undefined : () => setHovered(false)}
      onFocusCapture={suppressed ? undefined : () => setHovered(true)}
      onBlurCapture={suppressed ? undefined : () => setHovered(false)}
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
            // z-[70] — a hint has to win over whatever floating panel it's
            // nested inside (e.g. `ReminderBadge`'s own `MoreMenu` popover
            // at z-[60]), since it's meant to sit visually on top of its
            // trigger no matter where that trigger lives. Both this panel
            // and the trigger it's nested inside portal independently to
            // `document.body`, so without an explicit z-index above every
            // other floating layer, mount order alone decided which one
            // painted on top — and the hint, being the deeper-nested
            // portal, didn't reliably mount after its host popover.
            // `19rem` (304px) — bumped from `16rem` in stages so
            // `ResourceMeter.tsx`'s `ResourceTrackerHint` has room to reach
            // its own width instead of being clipped by this wrapper's own
            // cap: a panel narrower than its content doesn't grow to fit it,
            // it just overflows. Two earlier passes (`17rem` matching the
            // content's own width, then `18rem` after accounting for this
            // wrapper's `p-2` padding, 16px total, sitting *outside* the
            // content in the box model) both still clipped horizontally —
            // confirmed on a live screenshot — the missing variable was this
            // `overflow-y: auto` scrollbar itself: it was rendering at the
            // *browser's* default width (~15-17px, OS/browser-dependent)
            // because this className never carried `scrollbar-themed` the
            // way every other scroll surface in the app does, and a
            // scrollbar's reserved gutter eats into the same content-box
            // width its sibling content needs. Fixed at the root by adding
            // `scrollbar-themed` below (shrinks it to a predictable 8px on
            // WebKit, `scrollbar-width: thin` on Firefox) *and* narrowing
            // `ResourceTrackerHint` itself from 272px to 256px (`w-64`) so
            // there's real margin — 288 (18rem, this wrapper's border+
            // padding budget) − 2 (border) − 16 (padding) − 256 (content) =
            // 14px spare over the expected 8px scrollbar — instead of
            // recomputing to the exact zero-margin pixel every time
            // something here shifts by a few px. This `19rem` cap itself
            // only needs to clear content(256) + padding(16) + border(2) =
            // 274px in the no-scrollbar case (plenty of room under 304px) —
            // the actual binding constraint is the margin above,
            // not this cap. No other panel in the app currently exceeds
            // 15rem (`AbilityScoreHintPanel`'s own `w-60`), so this only
            // changes behavior for the one panel that actually wants it.
            className="pointer-events-none fixed z-[70] w-max max-w-[min(19rem,80vw)] scrollbar-themed rounded-md border border-slate-700 bg-slate-950 p-2 text-left text-xs font-normal normal-case leading-snug text-slate-300 shadow-xl"
            // No-ops while the panel is `pointer-events: none` (a plain
            // hover preview, never blocking a click on whatever it happens
            // to overlap) — and only actually fire once `computePosition`
            // switches it to `auto`, either because it's pinned open or
            // because it needs its own internal scroll. Keeps `hovered`
            // true while the mouse is over the panel itself in that case,
            // so moving off the trigger to reach nested content (or just to
            // scroll a tall hint) doesn't close it.
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
