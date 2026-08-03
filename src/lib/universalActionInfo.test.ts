import { describe, expect, test } from "vitest";
import { getUniversalActionInfo } from "./universalActionInfo";

describe("getUniversalActionInfo", () => {
  test("matches an exact action name case-insensitively", () => {
    expect(getUniversalActionInfo("Dash")).toEqual({
      title: "Dash",
      description: expect.stringContaining("extra movement"),
    });
    expect(getUniversalActionInfo("HIDE")).toEqual({
      title: "Hide",
      description: expect.any(String),
    });
  });

  test("matches an action name embedded with trailing text", () => {
    const result = getUniversalActionInfo("Dash (Bonus Action)");
    expect(result?.title).toBe("Dash");
  });

  test("returns undefined for a name that isn't a universal action", () => {
    expect(getUniversalActionInfo("Fireball")).toBeUndefined();
  });

  test("doesn't false-positive on an unrelated word containing an action name as a substring", () => {
    expect(getUniversalActionInfo("Dashing Boots")).toBeUndefined();
  });

  test("matches Escape, used to break free of a Grapple/Restrained condition", () => {
    expect(getUniversalActionInfo("Escape")).toEqual({
      title: "Escape",
      description: expect.stringContaining("grapple"),
    });
  });
});
