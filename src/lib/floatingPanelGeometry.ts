/**
 * Pure size/position math for `components/ui/FloatingPanel.tsx`, split out
 * of that `.tsx` file specifically so it can be unit-tested — `vitest.config.ts`
 * only runs `src/**\/*.test.ts`, never `.tsx`, so logic that stays inside the
 * component (parsing a saved rect back out of `localStorage`, clamping a
 * drag/resize to sane bounds) would otherwise have no automated coverage at
 * all. None of this touches `window`/`localStorage` directly — the component
 * owns that I/O and passes plain values in.
 */

export type FloatingPanelRect = { width: number; height: number; top: number; left: number };

/**
 * Validates a value already parsed from a `localStorage` string — absent,
 * corrupted, or partial data (including anything saved before this field
 * existed) all return `null` rather than a rect with `NaN`/`undefined`
 * fields silently baked in.
 */
export function parseSavedRect(raw: string | null): FloatingPanelRect | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.width === "number" &&
      typeof parsed.height === "number" &&
      typeof parsed.top === "number" &&
      typeof parsed.left === "number"
    ) {
      return parsed;
    }
  } catch {
    // Falls through to null below.
  }
  return null;
}

/**
 * Combines a previously saved rect (if any) with the current viewport into
 * the rect a panel should mount with. A saved rect that no longer fits the
 * viewport (it shrank since the save) is discarded entirely in favor of the
 * default anchor, rather than force-fitting a wrong-feeling squeezed size;
 * one that does fit is still clamped to `minWidth`/`minHeight`/`edgeMargin`
 * in case those minimums changed since the save.
 *
 * `align` picks how the *no-saved-rect* default horizontal position is
 * computed — `"right"` (the original, still the default) anchors
 * `defaultRightGap` in from the right edge, matching where `DiceRollerFab`/
 * the "Ask AI" pill sit so the panel opens right next to its own trigger.
 * `"center"` instead centers the panel horizontally, for
 * `CharacterDetailsModal`/`CreatureDetailsModal` — these replaced a `Modal`
 * that always opened centered/top-aligned, and their trigger (clicking a
 * card anywhere in the roster) has no fixed on-screen spot to open next to
 * the way the two FAB-launched panels do.
 */
export function resolveInitialRect(params: {
  saved: FloatingPanelRect | null;
  viewportWidth: number;
  viewportHeight: number;
  minWidth: number;
  minHeight: number;
  edgeMargin: number;
  defaultWidth: number;
  defaultHeight: number;
  defaultTop: number;
  defaultRightGap: number;
  align?: "right" | "center";
}): FloatingPanelRect {
  const {
    saved,
    viewportWidth,
    viewportHeight,
    minWidth,
    minHeight,
    edgeMargin,
    defaultWidth,
    defaultHeight,
    defaultTop,
    defaultRightGap,
    align = "right",
  } = params;
  const maxWidth = viewportWidth - edgeMargin * 2;
  const maxHeight = viewportHeight - edgeMargin * 2;
  if (saved && saved.width <= maxWidth && saved.height <= maxHeight) {
    return {
      width: Math.max(minWidth, saved.width),
      height: Math.max(minHeight, saved.height),
      top: Math.min(Math.max(edgeMargin, saved.top), viewportHeight - minHeight),
      left: Math.min(Math.max(edgeMargin, saved.left), viewportWidth - minWidth),
    };
  }
  const defaultLeft =
    align === "center" ? (viewportWidth - defaultWidth) / 2 : viewportWidth - defaultWidth - defaultRightGap;
  return {
    width: defaultWidth,
    height: defaultHeight,
    top: defaultTop,
    left: Math.max(edgeMargin, defaultLeft),
  };
}

/** Clamps a drag target to stay at least `edgeMargin` from the top/left viewport edges — no maximum, so the panel can be dragged mostly off the right/bottom edge on purpose. */
export function clampPosition(left: number, top: number, edgeMargin: number): { left: number; top: number } {
  return { left: Math.max(edgeMargin, left), top: Math.max(edgeMargin, top) };
}

/** Clamps a resize target between the panel's own minimum and however much room is left before the viewport edge. */
export function clampSize(
  width: number,
  height: number,
  bounds: { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number }
): { width: number; height: number } {
  return {
    width: Math.min(Math.max(bounds.minWidth, width), bounds.maxWidth),
    height: Math.min(Math.max(bounds.minHeight, height), bounds.maxHeight),
  };
}
