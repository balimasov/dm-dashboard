"use client";

import { useLayoutEffect, useState } from "react";

export interface VisualViewportRect {
  height: number;
  offsetTop: number;
}

function readViewport(): VisualViewportRect | null {
  if (typeof window === "undefined" || !window.visualViewport) return null;
  return { height: window.visualViewport.height, offsetTop: window.visualViewport.offsetTop };
}

/**
 * Tracks `window.visualViewport`'s current `height`/`offsetTop` — the
 * actual visible area on screen, distinct from the layout viewport that a
 * `position: fixed` element sized via plain CSS insets (`top`/`bottom`) is
 * normally positioned against. On iOS Safari in particular, opening the
 * on-screen keyboard shrinks the visual viewport without shrinking the
 * layout viewport, and the browser also scrolls the layout viewport to keep
 * the focused input visible above the keyboard — a plain-CSS `fixed`
 * element tracks neither change, so it visibly jumps/resizes as the
 * keyboard opens and closes. `FloatingPanel`'s mobile sheet reads this hook
 * to size and position itself against the real visible area instead of the
 * full (keyboard-obscured) layout viewport.
 *
 * Lazy `useState` initializer (not a value only ever set from an effect) so
 * the very first render already has the real reading — same reasoning as
 * `useDesktopViewport`. An earlier version of this hook started at `null`
 * and only read the real value inside `useLayoutEffect`, which sounds
 * equivalent (layout effects run before paint) but wasn't in practice: every
 * open of `FloatingPanel`'s mobile sheet is a fresh mount, so that version
 * rendered once against the old static-inset fallback and then again
 * against the real (almost always numerically different, since visual and
 * layout viewport heights rarely match exactly) `visualViewport` numbers —
 * two real layout passes with different heights, which is exactly what
 * showed up as the panel's contents visibly jumping on every open. Starting
 * from the real reading removes that first, wrong pass entirely; the effect
 * below only has to react to a *genuine* later change (the keyboard opening
 * or closing), not fix up an initial guess.
 *
 * `null` only for a server render and in the rare browser with no
 * `visualViewport` support at all — callers fall back to their own static
 * layout in that case.
 */
export function useVisualViewport(): VisualViewportRect | null {
  const [rect, setRect] = useState<VisualViewportRect | null>(readViewport);

  useLayoutEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setRect({ height: vv.height, offsetTop: vv.offsetTop });
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return rect;
}
