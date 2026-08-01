import { describe, expect, test } from "vitest";
import { characterAssistantContext, creatureAssistantContext } from "./assistantContext";
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

describe("characterAssistantContext", () => {
  test("reports HP, conditions, and remaining spell slots", () => {
    const character = makeCharacter({
      name: "Elowen",
      combat: {
        hp: 8,
        maxHp: 20,
        tempHp: 3,
        ac: 14,
        speed: 30,
        passivePerception: 10,
        passiveInvestigation: 10,
        passiveInsight: 10,
        conditions: ["Poisoned"],
        exhaustion: 1,
      },
      spellSlots: [
        { level: 1, current: 0, max: 4 },
        { level: 2, current: 2, max: 2 },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("HP: 8/20 (+3 temp)");
    expect(context).toContain("- Poisoned: Disadvantage on attack rolls and ability checks.");
    expect(context).toContain("Exhaustion: level 1 (−2 to every d20 roll");
    expect(context).toContain("Level 1: 0/4");
    expect(context).toContain("Level 2: 2/2");
  });

  test("marks a used-up resource as 0 of its max, not omitted", () => {
    const character = makeCharacter({
      name: "Bram",
      resources: [{ id: "second-wind", name: "Second Wind", current: 0, max: 1, recovery: "short-rest" }],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Second Wind: 0/1 (recovers: Short Rest)");
  });

  test("shows a spell's own charge pool when it has one, otherwise no charge suffix", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [
        { id: "s1", name: "Fireball", level: 3, source: "Class" },
        { id: "s2", name: "Detect Magic", level: 1, source: "Race", current: 0, max: 1, recovery: "long-rest" },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Fireball (level 3)");
    expect(context).toContain("Detect Magic (level 1, own charges 0/1 (recovers: Long Rest))");
  });

  test("flags an active concentration so the assistant knows a new concentration spell would end it", () => {
    const concentrating = characterAssistantContext(makeCharacter({ name: "Nyra", concentrating: true }));
    const notConcentrating = characterAssistantContext(makeCharacter({ name: "Nyra", concentrating: false }));

    expect(concentrating).toContain("Concentrating on a spell right now");
    expect(notConcentrating).not.toContain("Concentrating");
  });

  test("computes the exact 2024 d20/speed penalty for the current exhaustion level instead of leaving it to the model", () => {
    const level2 = characterAssistantContext(makeCharacter({ name: "Bram", combat: { ...makeCharacter({ name: "x" }).combat, exhaustion: 2 } }));
    expect(level2).toContain("Exhaustion: level 2 (−4 to every d20 roll — ability checks, attacks, saves; speed −10 ft)");
  });

  test("includes a passive ('other'-group) feature like Extra Attack, not just action-economy ones", () => {
    const character = makeCharacter({
      name: "Alor",
      features: [
        { id: "f1", name: "Extra Attack", source: "Fighter", group: "other", originType: "class", description: "You can attack twice, instead of once, whenever you take the Attack action." },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Extra Attack: You can attack twice, instead of once, whenever you take the Attack action.");
  });

  test("includes a spell's casting time/range/damage/DC detail alongside its level", () => {
    const character = makeCharacter({
      name: "Nyra",
      knownSpells: [
        {
          id: "s1",
          name: "Fireball",
          level: 3,
          source: "Class",
          castingTime: "1 action",
          range: "150 ft.",
          effect: "8d6",
          effectType: "Fire",
          hitOrDc: "DC 15 DEX",
        },
      ],
    });

    const context = characterAssistantContext(character);

    expect(context).toContain("Fireball (level 3) — 1 action, 150 ft., 8d6 Fire, DC 15 DEX");
  });
});

describe("creatureAssistantContext", () => {
  test("reports HP/AC and passes trait recharge text through unstructured", () => {
    const creature = makeCreature({
      name: "Young Red Dragon",
      hp: 50,
      maxHp: 178,
      ac: 18,
      conditions: ["Frightened"],
      traits: [
        { name: "Fire Breath", group: "action", recharge: "Recharge 5-6" },
        { name: "Multiattack", group: "action" },
      ],
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("HP: 50/178");
    expect(context).toContain("AC: 18");
    expect(context).toContain("- Frightened: Disadvantage on ability checks and attack rolls");
    expect(context).toContain("(action) Fire Breath [Recharge 5-6]");
    expect(context).toContain("(action) Multiattack");
  });

  test("passes a trait's free-text description through, since structured fields alone don't cover Multiattack's own effect", () => {
    const creature = makeCreature({
      name: "Young Red Dragon",
      traits: [
        {
          name: "Multiattack",
          group: "action",
          description: "The dragon makes three attacks: one bite and two claws.",
        },
      ],
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("The dragon makes three attacks: one bite and two claws.");
  });

  test("includes attack bonus/damage and save DC when a trait has them", () => {
    const creature = makeCreature({
      name: "Ogre",
      traits: [
        {
          name: "Greatclub",
          group: "action",
          attack: { attackType: "melee", attackBonus: 6, damage: [{ dice: "2d8 +4", damageType: "bludgeoning" }] },
        },
        {
          name: "Frightful Presence",
          group: "action",
          save: { ability: "wis", dc: 13 },
        },
      ],
    });

    const context = creatureAssistantContext(creature);

    expect(context).toContain("+6 to hit, 2d8 +4 bludgeoning");
    expect(context).toContain("DC 13 WIS save");
  });

  test("flags an active concentration the same way a character's does", () => {
    const context = creatureAssistantContext(makeCreature({ name: "Cultist Priest", concentrating: true }));
    expect(context).toContain("Concentrating on a spell right now");
  });
});
