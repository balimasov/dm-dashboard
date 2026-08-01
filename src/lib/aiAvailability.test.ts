import { describe, expect, test } from "vitest";
import { buildAiAvailability, buildAiAvailabilityByName } from "./aiAvailability";
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

describe("buildAiAvailability", () => {
  test("formats a resource's own current/max as charges", () => {
    const character = makeCharacter({
      name: "Bram",
      resources: [{ id: "second-wind", name: "Second Wind", current: 2, max: 3, recovery: "short-rest" }],
    });

    expect(buildAiAvailability(character)).toEqual({ "second-wind": "2/3 charges" });
  });

  test("formats a feature with its own limited uses as charges, and omits one with no max", () => {
    const character = makeCharacter({
      name: "Alor",
      features: [
        { id: "f1", name: "Channel Divinity", source: "Cleric", group: "action", originType: "class", current: 1, max: 2, recovery: "short-rest" },
        { id: "f2", name: "Extra Attack", source: "Fighter", group: "other", originType: "class" },
      ],
    });

    const availability = buildAiAvailability(character);

    expect(availability.f1).toBe("1/2 charges");
    expect(availability.f2).toBeUndefined();
  });

  test("formats a slot-costing spell using the character's own spell slot pool for that level", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [{ id: "s1", name: "Fireball", level: 3, source: "Class" }],
      spellSlots: [{ level: 3, current: 1, max: 2 }],
    });

    expect(buildAiAvailability(character)).toEqual({ s1: "3rd lvl, 1/2 slots" });
  });

  test("formats a spell with its own charge pool as charges, not slots, even though it has a level", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [{ id: "s2", name: "Detect Magic", level: 1, source: "Race", current: 0, max: 1, recovery: "long-rest" }],
    });

    expect(buildAiAvailability(character)).toEqual({ s2: "0/1 charges" });
  });

  test("omits a cantrip (level 0, unlimited use)", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [{ id: "s3", name: "Fire Bolt", level: 0, source: "Class" }],
    });

    expect(buildAiAvailability(character)).toEqual({});
  });

  test("formats a consumable item as 'x{quantity}', same convention InventoryOverview.tsx uses", () => {
    const character = makeCharacter({
      name: "Bram",
      inventory: [
        { id: "potion-1", name: "Potion of Healing", rarity: "Common", category: "Consumable", quantity: 3 },
        { id: "shield-1", name: "Shield", rarity: "Common", category: "Armor", quantity: 1 },
      ],
    });

    const availability = buildAiAvailability(character);

    expect(availability["potion-1"]).toBe("x3");
    expect(availability["shield-1"]).toBeUndefined();
  });

  test("returns an empty map for a creature, which has no current/max resource tracking", () => {
    const creature = makeCreature({ name: "Ogre" });
    expect(buildAiAvailability(creature)).toEqual({});
  });
});

describe("buildAiAvailabilityByName", () => {
  test("keys the same suffixes by trimmed lowercased name instead of id, for when an option's source_id doesn't resolve", () => {
    const character = makeCharacter({
      name: "Alor",
      features: [{ id: "f1", name: "Channel Divinity", source: "Cleric", group: "action", originType: "class", current: 1, max: 2, recovery: "short-rest" }],
    });

    expect(buildAiAvailabilityByName(character)).toEqual({ "channel divinity": "1/2 charges" });
  });

  test("returns an empty map for a creature", () => {
    expect(buildAiAvailabilityByName(makeCreature({ name: "Ogre" }))).toEqual({});
  });
});
