"use client";

import { useLayoutEffect, useState } from "react";

export interface VisualViewportRect {
  height: number;
  offsetTop: number;
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
 * `null` before the effect first runs (server render, and the very first
 * client paint) and in the rare browser with no `visualViewport` support at
 * all — callers fall back to their own static layout in that case.
 */
export function useVisualViewport(): VisualViewportRect | null {
  const [rect, setRect] = useState<VisualViewportRect | null>(null);

  useLayoutEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setRect({ height: vv.height, offsetTop: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return rect;
}
