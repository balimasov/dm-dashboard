import { describe, expect, test } from "vitest";
import { creatureSpellSourceId, creatureTraitSourceId, isPositionalCreatureSourceId } from "./aiSourceIds";

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

describe("isPositionalCreatureSourceId", () => {
  test("recognizes trait and spell ids produced by this same module", () => {
    expect(isPositionalCreatureSourceId(creatureTraitSourceId(2))).toBe(true);
    expect(isPositionalCreatureSourceId(creatureSpellSourceId(0, 1))).toBe(true);
  });

  test("rejects a character's own real sheet id shapes", () => {
    expect(isPositionalCreatureSourceId("spell_fireball")).toBe(false);
    expect(isPositionalCreatureSourceId("feature-17")).toBe(false);
    expect(isPositionalCreatureSourceId("item-0")).toBe(false);
  });
});
