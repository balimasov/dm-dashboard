import { describe, expect, test } from "vitest";
import { creatureSpellSourceId, creatureTraitSourceId } from "./aiSourceIds";

describe("creatureTraitSourceId", () => {
  test("formats a trait's array index", () => {
    expect(creatureTraitSourceId(0)).toBe("trait-0");
    expect(creatureTraitSourceId(3)).toBe("trait-3");
  });
});

describe("creatureSpellSourceId", () => {
  test("formats a spell's group and within-group index", () => {
    expect(creatureSpellSourceId(0, 0)).toBe("spell-0-0");
    expect(creatureSpellSourceId(1, 2)).toBe("spell-1-2");
  });
});
