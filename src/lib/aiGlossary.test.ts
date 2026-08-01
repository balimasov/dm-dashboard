import { describe, expect, test } from "vitest";
import { buildAiGlossary, buildCharacterGlossary, buildCreatureGlossary } from "./aiGlossary";
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

describe("buildCharacterGlossary", () => {
  test("maps a feature's name (lowercased) to its source + description", () => {
    const character = makeCharacter({
      name: "Alor",
      features: [{ id: "f1", name: "Extra Attack", source: "Fighter", group: "other", originType: "class", description: "Attack twice." }],
    });

    const glossary = buildCharacterGlossary(character);

    expect(glossary["extra attack"]).toBe("Fighter — Attack twice.");
  });

  test("maps a known spell to its short description", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [{ id: "s1", name: "Fireball", level: 3, source: "Class", description: "A bright streak flashes to a point." }],
    });

    const glossary = buildCharacterGlossary(character);

    expect(glossary["fireball"]).toContain("A bright streak flashes to a point.");
  });

  test("skips an entry with no name or no hint text to give it", () => {
    const character = makeCharacter({
      name: "Bram",
      resources: [{ id: "r1", name: "Second Wind", current: 1, max: 1, recovery: "short-rest" }],
    });

    const glossary = buildCharacterGlossary(character);

    expect(glossary["second wind"]).toBeUndefined();
  });
});

describe("buildCreatureGlossary", () => {
  test("maps a trait's name to its description + recharge", () => {
    const creature = makeCreature({
      name: "Young Red Dragon",
      traits: [{ name: "Fire Breath", group: "action", recharge: "Recharge 5-6", description: "Exhales fire in a cone." }],
    });

    const glossary = buildCreatureGlossary(creature);

    expect(glossary["fire breath"]).toBe("Exhales fire in a cone. — Recharge: Recharge 5-6");
  });
});

describe("buildAiGlossary", () => {
  test("dispatches to the character builder for a Character", () => {
    const character = makeCharacter({ name: "Nyra", features: [{ id: "f1", name: "Rage", source: "Barbarian", group: "other", originType: "class", description: "Roar." }] });
    expect(buildAiGlossary(character)["rage"]).toContain("Roar.");
  });

  test("dispatches to the creature builder for a Creature", () => {
    const creature = makeCreature({ name: "Ogre", traits: [{ name: "Greatclub", group: "action", description: "A big hit." }] });
    expect(buildAiGlossary(creature)["greatclub"]).toContain("A big hit.");
  });
});
