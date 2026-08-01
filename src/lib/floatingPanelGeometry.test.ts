import { describe, expect, test } from "vitest";
import { clampPosition, clampSize, parseSavedRect, resolveInitialRect } from "./floatingPanelGeometry";

describe("parseSavedRect", () => {
  test("returns null for a null input (nothing saved yet)", () => {
    expect(parseSavedRect(null)).toBeNull();
  });

  test("returns null for malformed JSON", () => {
    expect(parseSavedRect("{not valid json")).toBeNull();
  });

  test("returns null when a required field is missing", () => {
    expect(parseSavedRect(JSON.stringify({ width: 480, height: 560, top: 88 }))).toBeNull();
  });

  test("returns null when a field has the wrong type", () => {
    expect(parseSavedRect(JSON.stringify({ width: 480, height: 560, top: 88, left: "888" }))).toBeNull();
  });

  test("returns the rect when every field is a real number", () => {
    const raw = JSON.stringify({ width: 660, height: 540, top: 97, left: 63 });
    expect(parseSavedRect(raw)).toEqual({ width: 660, height: 540, top: 97, left: 63 });
  });
});

describe("resolveInitialRect", () => {
  const baseParams = {
    viewportWidth: 1400,
    viewportHeight: 1000,
    minWidth: 440,
    minHeight: 360,
    edgeMargin: 8,
    defaultWidth: 480,
    defaultHeight: 560,
    defaultTop: 88,
    defaultRightGap: 32,
  };

  test("anchors near the top-right corner when nothing was saved", () => {
    expect(resolveInitialRect({ saved: null, ...baseParams })).toEqual({
      width: 480,
      height: 560,
      top: 88,
      left: 1400 - 480 - 32,
    });
  });

  test("uses the saved rect as-is when it fits the current viewport", () => {
    const saved = { width: 660, height: 540, top: 97, left: 63 };
    expect(resolveInitialRect({ saved, ...baseParams })).toEqual(saved);
  });

  test("falls back to the default anchor when the saved size no longer fits the viewport", () => {
    const saved = { width: 2000, height: 540, top: 97, left: 63 };
    expect(resolveInitialRect({ saved, ...baseParams })).toEqual({
      width: 480,
      height: 560,
      top: 88,
      left: 1400 - 480 - 32,
    });
  });

  test("clamps a saved rect's own width/height up to the current minimums", () => {
    const saved = { width: 300, height: 200, top: 97, left: 63 };
    const result = resolveInitialRect({ saved, ...baseParams });
    expect(result.width).toBe(440);
    expect(result.height).toBe(360);
  });

  test("clamps a saved position back on-screen if the viewport shrank since the save", () => {
    const saved = { width: 500, height: 400, top: 950, left: 1350 };
    const result = resolveInitialRect({ saved, ...baseParams });
    expect(result.top).toBe(1000 - 360);
    expect(result.left).toBe(1400 - 440);
  });
});

describe("clampPosition", () => {
  test("leaves an on-screen position untouched", () => {
    expect(clampPosition(200, 150, 8)).toEqual({ left: 200, top: 150 });
  });

  test("clamps a negative position back to the edge margin", () => {
    expect(clampPosition(-50, -20, 8)).toEqual({ left: 8, top: 8 });
  });

  test("has no maximum — dragging far off the right/bottom edge is allowed", () => {
    expect(clampPosition(5000, 4000, 8)).toEqual({ left: 5000, top: 4000 });
  });
});

describe("clampSize", () => {
  const bounds = { minWidth: 440, minHeight: 360, maxWidth: 900, maxHeight: 700 };

  test("leaves an in-range size untouched", () => {
    expect(clampSize(600, 500, bounds)).toEqual({ width: 600, height: 500 });
  });

  test("clamps below the minimum up to it", () => {
    expect(clampSize(100, 50, bounds)).toEqual({ width: 440, height: 360 });
  });

  test("clamps above the maximum down to it", () => {
    expect(clampSize(2000, 1500, bounds)).toEqual({ width: 900, height: 700 });
  });
});
