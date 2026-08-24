"use client";

import { useRef } from "react";

/** Long enough that a normal tap never triggers it, short enough to feel deliberate rather than sluggish — matches the ~400-500ms window most mobile OSes use for their own long-press gestures. */
const LONG_PRESS_MS = 450;

/**
 * `DieButton`'s decrement gesture on touch — there's no room for a visible
 * second button at the die tray's already-tight touch-target size (see the
 * sizing note on `DieButton` itself), and there's no right-click equivalent
 * on a touch screen, so a press-and-hold stands in for it, mirroring
 * `onContextMenu`'s "secondary action on the same target" role on desktop.
 *
 * Returns one bundle of handler props to spread onto the target element —
 * `onContextMenu` for desktop, `onTouchStart`/`onTouchMove`/`onTouchEnd`/
 * `onTouchCancel` for touch — rather than each caller wiring the timing
 * logic itself.
 *
 * Two things this guards against, both non-obvious:
 * - A `touchend` right after a successful long-press synthesizes a `click`
 *   in every mobile browser. Left alone, holding a die button would both
 *   decrement it (the long-press) *and* increment it right back (the
 *   synthesized click) — so `onTouchEnd` calls `preventDefault()` whenever
 *   the long-press already fired, which stops that synthetic click from
 *   ever reaching the button's own `onClick`.
 * - Some touch browsers (Chrome on Android) also fire a native `contextmenu`
 *   event on a long-press, around the same delay as this hook's own timer —
 *   without a guard, one physical long-press would call `onLongPress` twice.
 *   `touchActiveRef` tracks "a touch gesture is in flight" so `onContextMenu`
 *   only acts on an actual right-click (never on a touch-originated one).
 */
export function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const touchActiveRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function endTouch() {
    clearTimer();
    touchActiveRef.current = false;
  }

  return {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (touchActiveRef.current) return;
      onLongPress();
    },
    onTouchStart: () => {
      touchActiveRef.current = true;
      firedRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onTouchMove: clearTimer,
    onTouchEnd: (e: React.TouchEvent) => {
      clearTimer();
      if (firedRef.current) {
        e.preventDefault();
        firedRef.current = false;
      }
      // Stays "active" a beat past this gesture so a same-gesture native
      // `contextmenu` (Android) still sees it and skips its own decrement.
      setTimeout(endTouch, 500);
    },
    onTouchCancel: endTouch,
  };
}
