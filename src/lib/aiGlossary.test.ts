import { describe, expect, test } from "vitest";
import { buildAiGlossary, buildAiGlossaryByName, resolveAiHint } from "./aiGlossary";
import { Character, Creature } from "./types";

function makeCharacter(overrides: Partial<Character> & { name: string }): Character {
  return {
    id: overrides.name,
    campaignId: "camp",
    race: "Human",
    className: "Wizard",
    level: 5,
    role: "",
    heroicInspiration: false,
    initiative: 0,
    combat: {
      hp: 10,
      maxHp: 20,
      tempHp: 0,
      ac: 12,
      speed: 30,
      passivePerception: 10,
      passiveInvestigation: 10,
      passiveInsight: 10,
      conditions: [],
      exhaustion: 0,
    },
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    resources: [],
    spellSlots: [],
    knownSpells: [],
    features: [],
    attacks: [],
    savingThrowProficiencies: [],
    skillProficiencies: [],
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    advantages: [],
    senses: [],
    languages: [],
    toolProficiencies: [],
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    notes: "",
    quickNotes: [],
    ...overrides,
  } as Character;
}

function makeCreature(overrides: Partial<Creature> & { name: string }): Creature {
  return {
    id: overrides.name,
    campaignId: "camp",
    category: "enemy",
    templateName: overrides.name,
    ac: 15,
    hp: 20,
    maxHp: 40,
    tempHp: 0,
    speed: 30,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    traits: [],
    conditions: [],
    exhaustion: 0,
    ...overrides,
  } as Creature;
}

describe("buildAiGlossary / buildAiGlossaryByName", () => {
  test("keys an inventory item's hint by id and by lowercased name, even when it's not a configured attack", () => {
    const character = makeCharacter({
      name: "Ragnar",
      inventory: [{ id: "item-0", name: "Pike, +1", rarity: "Uncommon", category: "Weapon", quantity: 1, description: "A magic pike." }],
    });

    expect(buildAiGlossary(character)["item-0"]).toBeDefined();
    expect(buildAiGlossaryByName(character)["pike, +1"]).toBeDefined();
  });

  test("also keys an enhancement-bonus item by its bare name, since that's how a DM/model actually refers to it in prose", () => {
    const character = makeCharacter({
      name: "Ragnar",
      inventory: [{ id: "item-0", name: "Pike, +1", rarity: "Uncommon", category: "Weapon", quantity: 1, description: "A magic pike." }],
    });

    const byName = buildAiGlossaryByName(character);
    expect(byName["pike"]).toBe(byName["pike, +1"]);
  });

  test("a real distinct entry always wins over another entry's bare-name alias", () => {
    const character = makeCharacter({
      name: "Ragnar",
      inventory: [
        { id: "item-0", name: "Longsword", rarity: "Common", category: "Weapon", quantity: 1, description: "A mundane longsword." },
        { id: "item-1", name: "Longsword, +1", rarity: "Uncommon", category: "Weapon", quantity: 1, description: "A magic longsword." },
      ],
    });

    const byName = buildAiGlossaryByName(character);
    const byId = buildAiGlossary(character);
    // "longsword" must resolve to item-0's own exact hint, not get stomped by
    // item-1's derived "longsword" alias — order of `inventory` shouldn't matter.
    // (`toEqual`, not `toBe`: each `build*` call re-renders fresh JSX element
    // objects, so reference equality never holds even for the "same" hint.)
    expect(byName["longsword"]).toEqual(byId["item-0"]);
    expect(byName["longsword"]).not.toEqual(byId["item-1"]);
  });

  test("features (including passive 'other'-group ones like Reckless Attack) are keyed by name, not just limited-use ones", () => {
    const character = makeCharacter({
      name: "Ragnar",
      features: [
        { id: "feature-17", name: "Reckless Attack", source: "Barbarian", group: "other", originType: "class", description: "Advantage on attacks." },
      ],
    });

    expect(buildAiGlossaryByName(character)["reckless attack"]).toBeDefined();
  });

  test("keys a character's custom condition by id and by name, so it gets the same hover hint treatment a standard condition does", () => {
    const character = makeCharacter({
      name: "Ragnar",
      combat: {
        ...makeCharacter({ name: "x" }).combat,
        customConditions: [{ id: "cb", name: "Chardal's Madness", description: "Attacks the nearest creature." }],
      },
    });

    expect(buildAiGlossary(character)["cb"]).toBeDefined();
    expect(buildAiGlossaryByName(character)["chardal's madness"]).toBeDefined();
  });

  test("keys a creature's custom condition the same way", () => {
    const creature = makeCreature({
      name: "Jerun",
      customConditions: [{ id: "cb", name: "Chardal's Madness", description: "Attacks the nearest creature." }],
    });

    expect(buildAiGlossary(creature)["cb"]).toBeDefined();
    expect(buildAiGlossaryByName(creature)["chardal's madness"]).toBeDefined();
  });

  test("returns an empty glossary for a creature with no traits/spellcasting", () => {
    const creature = makeCreature({ name: "Wolf" });

    expect(buildAiGlossary(creature)).toEqual({});
    expect(buildAiGlossaryByName(creature)).toEqual({});
  });
});

describe("resolveAiHint", () => {
  test("prefers id over name for an ordinary sheet id", () => {
    const byId = { "feature-0": "by-id" };
    const byName = { "second wind": "by-name" };
    expect(resolveAiHint("feature-0", "second wind", byId, byName)).toBe("by-id");
  });

  test("falls back to name when an ordinary id doesn't match anything", () => {
    const byId = {};
    const byName = { fireball: "by-name" };
    expect(resolveAiHint("spell-7", "fireball", byId, byName)).toBe("by-name");
  });

  test("prefers name over id for a positional creature trait/spell id, since that id can point at a different trait once persisted history is re-rendered against edited traits", () => {
    // Simulates the exact stale-history scenario: "trait-0" used to be Fire
    // Breath when a plan was generated, but the creature's traits have since
    // been reordered so "trait-0" now resolves to a *different* trait (Bite)
    // — the name the old message carries ("Fire Breath") must still win.
    const byId = { "trait-0": "Bite (wrong, reordered)" };
    const byName = { "fire breath": "Fire Breath (correct)" };
    expect(resolveAiHint("trait-0", "fire breath", byId, byName)).toBe("Fire Breath (correct)");
  });

  test("still falls back to the (possibly stale) id for a positional creature id when no name match exists", () => {
    const byId = { "trait-0": "by-id" };
    const byName = {};
    expect(resolveAiHint("trait-0", "unrecognized", byId, byName)).toBe("by-id");
  });

  test("returns undefined when neither an id nor a name match exists", () => {
    expect(resolveAiHint("feature-0", "unrecognized", {}, {})).toBeUndefined();
    expect(resolveAiHint(null, "unrecognized", {}, {})).toBeUndefined();
  });
});
