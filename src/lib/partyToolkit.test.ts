import { describe, expect, test } from "vitest";
import { Character } from "./types";
import {
  computeConditionProtectionCoverage,
  computeCriticalInventoryHighlights,
  computeHeroicInspirationSummary,
  computeLanguageCoverage,
  computePartyPassiveSummary,
  computePartyResourceSummary,
  computePartySkillOverview,
  computePartySpellSlotSummary,
  computeResistanceCoverage,
  computeResourceStatus,
  computeSensesCoverage,
  computeSkillOverviewEntry,
  computeSpellAbilityCoverage,
  computeToolCoverage,
  computeUtilitySpellAvailability,
} from "./partyToolkit";

function makeCharacter(overrides: Partial<Character> & { name: string }): Character {
  return {
    id: overrides.name,
    campaignId: "camp",
    race: "",
    className: "",
    level: 5,
    role: "",
    heroicInspiration: false,
    initiative: 0,
    combat: {
      hp: 10,
      maxHp: 10,
      tempHp: 0,
      ac: 10,
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

describe("computeSkillOverviewEntry", () => {
  test("picks the highest modifier as best, proficient ones count toward coverage", () => {
    const esmeralda = makeCharacter({
      name: "Esmeralda",
      level: 5,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
      skillProficiencies: [{ name: "perception", proficient: true, expertise: false }],
    });
    const ragnar = makeCharacter({
      name: "Ragnar",
      level: 5,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 12, cha: 10 },
      skillProficiencies: [],
    });

    const entry = computeSkillOverviewEntry([esmeralda, ragnar], "perception");

    expect(entry.best).toEqual({ characterId: "Esmeralda", characterName: "Esmeralda", modifier: 5 });
    expect(entry.weakest).toEqual({ characterId: "Ragnar", characterName: "Ragnar", modifier: 1 });
    expect(entry.proficientCount).toBe(1);
    expect(entry.status).toBe("Weak");
  });

  test("expertise counts toward proficient coverage same as proficiency", () => {
    const a = makeCharacter({ name: "A", skillProficiencies: [{ name: "stealth", proficient: false, expertise: true }] });
    const b = makeCharacter({ name: "B", skillProficiencies: [{ name: "stealth", proficient: true, expertise: false }] });
    const c = makeCharacter({ name: "C", skillProficiencies: [] });

    const entry = computeSkillOverviewEntry([a, b, c], "stealth");
    expect(entry.proficientCount).toBe(2);
    expect(entry.status).toBe("Medium");
  });

  test("a character with no skillProficiencies entry still gets a plain ability-mod check", () => {
    const a = makeCharacter({ name: "A", stats: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 } });
    const entry = computeSkillOverviewEntry([a], "acrobatics");
    expect(entry.best).toEqual({ characterId: "A", characterName: "A", modifier: 3 });
    expect(entry.weakest).toBeNull();
    expect(entry.proficientCount).toBe(0);
    expect(entry.status).toBe("Weak");
  });

  test("3+ proficient characters is Strong coverage", () => {
    const chars = ["A", "B", "C"].map((name) =>
      makeCharacter({ name, skillProficiencies: [{ name: "survival", proficient: true, expertise: false }] })
    );
    expect(computeSkillOverviewEntry(chars, "survival").status).toBe("Strong");
  });

  test("empty party has no best/weakest and Weak status", () => {
    const entry = computeSkillOverviewEntry([], "arcana");
    expect(entry.best).toBeNull();
    expect(entry.weakest).toBeNull();
    expect(entry.proficientCount).toBe(0);
    expect(entry.status).toBe("Weak");
  });

  test("tied best/only score across the whole party reports no weakest", () => {
    const chars = ["A", "B"].map((name) => makeCharacter({ name }));
    const entry = computeSkillOverviewEntry(chars, "athletics");
    expect(entry.weakest).toBeNull();
  });

  test("all ranks every character's score, highest first, with proficient/expertise flags", () => {
    const esmeralda = makeCharacter({
      name: "Esmeralda",
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
      skillProficiencies: [{ name: "perception", proficient: false, expertise: true }],
    });
    const ragnar = makeCharacter({
      name: "Ragnar",
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 12, cha: 10 },
      skillProficiencies: [],
    });

    const entry = computeSkillOverviewEntry([ragnar, esmeralda], "perception");
    expect(entry.all).toEqual([
      { characterId: "Esmeralda", characterName: "Esmeralda", modifier: 8, proficient: true, expertise: true },
      { characterId: "Ragnar", characterName: "Ragnar", modifier: 1, proficient: false, expertise: false },
    ]);
  });
});

describe("computePartySkillOverview", () => {
  test("returns all 18 skills sorted alphabetically by label", () => {
    const entries = computePartySkillOverview([makeCharacter({ name: "A" })]);
    expect(entries).toHaveLength(18);
    const labels = entries.map((e) => e.skill);
    expect(labels[0]).toBe("acrobatics");
    expect(labels).toContain("animal-handling");
    expect(labels).toContain("sleight-of-hand");
  });
});

describe("computePartyPassiveSummary", () => {
  test("returns null for an empty party", () => {
    expect(computePartyPassiveSummary([])).toBeNull();
  });

  test("computes best/average/lowest passive perception, and best insight/investigation", () => {
    const a = makeCharacter({
      name: "Esmeralda",
      combat: { hp: 1, maxHp: 1, tempHp: 0, ac: 10, speed: 30, passivePerception: 17, passiveInvestigation: 10, passiveInsight: 11, conditions: [], exhaustion: 0 },
    });
    const b = makeCharacter({
      name: "Ragnar",
      combat: { hp: 1, maxHp: 1, tempHp: 0, ac: 10, speed: 30, passivePerception: 11, passiveInvestigation: 14, passiveInsight: 15, conditions: [], exhaustion: 0 },
    });

    const summary = computePartyPassiveSummary([a, b]);
    expect(summary).toEqual({
      perception: {
        best: { characterName: "Esmeralda", value: 17 },
        weakest: { characterName: "Ragnar", value: 11 },
        average: 14,
        lowest: { characterName: "Ragnar", value: 11 },
        all: [
          { characterName: "Esmeralda", value: 17, proficient: false },
          { characterName: "Ragnar", value: 11, proficient: false },
        ],
        proficientCount: 0,
        status: "Weak",
      },
      insight: {
        best: { characterName: "Ragnar", value: 15 },
        weakest: { characterName: "Esmeralda", value: 11 },
        all: [
          { characterName: "Ragnar", value: 15, proficient: false },
          { characterName: "Esmeralda", value: 11, proficient: false },
        ],
        proficientCount: 0,
        status: "Weak",
      },
      investigation: {
        best: { characterName: "Ragnar", value: 14 },
        weakest: { characterName: "Esmeralda", value: 10 },
        all: [
          { characterName: "Ragnar", value: 14, proficient: false },
          { characterName: "Esmeralda", value: 10, proficient: false },
        ],
        proficientCount: 0,
        status: "Weak",
      },
    });
  });

  test("marks a character proficient in the passive's underlying skill", () => {
    const a = makeCharacter({
      name: "A",
      combat: { hp: 1, maxHp: 1, tempHp: 0, ac: 10, speed: 30, passivePerception: 15, passiveInvestigation: 10, passiveInsight: 10, conditions: [], exhaustion: 0 },
      skillProficiencies: [{ name: "perception", proficient: true, expertise: false }],
    });

    const summary = computePartyPassiveSummary([a]);
    expect(summary?.perception.all).toEqual([{ characterName: "A", value: 15, proficient: true }]);
    expect(summary?.perception.proficientCount).toBe(1);
    expect(summary?.perception.status).toBe("Weak");
  });

  test("3+ characters proficient in Perception is Strong coverage, same thresholds as a skill row", () => {
    const chars = ["A", "B", "C"].map((name) =>
      makeCharacter({ name, skillProficiencies: [{ name: "perception", proficient: true, expertise: false }] })
    );
    expect(computePartyPassiveSummary(chars)?.perception.status).toBe("Strong");
  });
});

describe("computePartySpellSlotSummary", () => {
  test("returns null when nobody in the party has any spell slots", () => {
    expect(computePartySpellSlotSummary([makeCharacter({ name: "A", spellSlots: [] })])).toBeNull();
  });

  test("sums slots across characters by level and finds the highest available level", () => {
    const a = makeCharacter({
      name: "Runa",
      spellSlots: [
        { level: 1, current: 4, max: 4 },
        { level: 2, current: 0, max: 3 },
      ],
    });
    const b = makeCharacter({
      name: "Lilith",
      spellSlots: [
        { level: 1, current: 3, max: 8 },
        { level: 3, current: 1, max: 4 },
      ],
    });

    const summary = computePartySpellSlotSummary([a, b]);
    expect(summary).toEqual({
      levels: [
        { level: 1, current: 7, max: 12 },
        { level: 2, current: 0, max: 3 },
        { level: 3, current: 1, max: 4 },
      ],
      totalCurrent: 8,
      totalMax: 19,
      highestAvailableLevel: 3,
    });
  });

  test("highestAvailableLevel is null when every slot is spent", () => {
    const a = makeCharacter({ name: "A", spellSlots: [{ level: 1, current: 0, max: 2 }] });
    expect(computePartySpellSlotSummary([a])?.highestAvailableLevel).toBeNull();
  });
});

describe("computeHeroicInspirationSummary", () => {
  test("counts characters with inspiration against party size", () => {
    const chars = [
      makeCharacter({ name: "A", heroicInspiration: true }),
      makeCharacter({ name: "B", heroicInspiration: false }),
      makeCharacter({ name: "C", heroicInspiration: true }),
    ];
    expect(computeHeroicInspirationSummary(chars)).toEqual({ withInspiration: 2, partySize: 3 });
  });
});

describe("computeResourceStatus", () => {
  test("0 current or 0 max is empty", () => {
    expect(computeResourceStatus(0, 3)).toBe("empty");
    expect(computeResourceStatus(0, 0)).toBe("empty");
  });

  test("a third or less remaining is low", () => {
    expect(computeResourceStatus(1, 3)).toBe("low");
  });

  test("more than a third remaining is normal", () => {
    expect(computeResourceStatus(2, 3)).toBe("normal");
    expect(computeResourceStatus(3, 3)).toBe("normal");
  });
});

describe("computePartyResourceSummary", () => {
  test("keeps one row per character per resource, sorted empty/low/normal then by name", () => {
    const ragnar = makeCharacter({
      name: "Ragnar",
      resources: [
        { id: "rage", name: "Rage", current: 0, max: 3, recovery: "long-rest" },
        { id: "luck", name: "Luck Points", current: 2, max: 3, recovery: "long-rest" },
      ],
    });
    const alor = makeCharacter({
      name: "Alor",
      resources: [{ id: "surge", name: "Action Surge", current: 1, max: 1, recovery: "short-rest" }],
    });

    const entries = computePartyResourceSummary([ragnar, alor]);
    expect(entries).toEqual([
      {
        id: "Ragnar-rage",
        resourceName: "Rage",
        characterName: "Ragnar",
        current: 0,
        max: 3,
        status: "empty",
        recovery: "long-rest",
        source: undefined,
        description: undefined,
      },
      {
        id: "Alor-surge",
        resourceName: "Action Surge",
        characterName: "Alor",
        current: 1,
        max: 1,
        status: "normal",
        recovery: "short-rest",
        source: undefined,
        description: undefined,
      },
      {
        id: "Ragnar-luck",
        resourceName: "Luck Points",
        characterName: "Ragnar",
        current: 2,
        max: 3,
        status: "normal",
        recovery: "long-rest",
        source: undefined,
        description: undefined,
      },
    ]);
  });

  test("threads recovery/source/description through for the row's hover hint", () => {
    const c = makeCharacter({
      name: "A",
      resources: [
        {
          id: "rage",
          name: "Rage",
          current: 2,
          max: 3,
          recovery: "long-rest",
          source: "Class",
          description: "Deal extra damage while raging.",
        },
      ],
    });
    expect(computePartyResourceSummary([c])[0]).toMatchObject({
      recovery: "long-rest",
      source: "Class",
      description: "Deal extra damage while raging.",
    });
  });

  test("empty party yields no resource rows", () => {
    expect(computePartyResourceSummary([])).toEqual([]);
  });
});

describe("computeCriticalInventoryHighlights", () => {
  test("categorizes matched items, ignores unmatched ones, dedupes and sums across owners", () => {
    const ragnar = makeCharacter({
      name: "Ragnar",
      inventory: [
        { id: "1", name: "Healing Potion", rarity: "Common", category: "Consumable", quantity: 2 },
        { id: "2", name: "Rope, 50 ft", rarity: "Common", category: "Gear", quantity: 1 },
        { id: "3", name: "Greataxe", rarity: "Common", category: "Weapon", quantity: 1 },
      ],
    });
    const lilith = makeCharacter({
      name: "Lilith",
      inventory: [{ id: "4", name: "Healing Potion", rarity: "Common", category: "Consumable", quantity: 2 }],
    });

    const entries = computeCriticalInventoryHighlights([ragnar, lilith]);
    expect(entries).toEqual([
      {
        category: "Healing & Emergency",
        name: "Healing Potion",
        totalQuantity: 4,
        holders: [
          { characterId: "Ragnar", characterName: "Ragnar", quantity: 2 },
          { characterId: "Lilith", characterName: "Lilith", quantity: 2 },
        ],
      },
      {
        category: "Exploration",
        name: "Rope, 50 ft",
        totalQuantity: 1,
        holders: [{ characterId: "Ragnar", characterName: "Ragnar", quantity: 1 }],
      },
    ]);
  });

  test("merges two separate inventory entries of the same item from the same character into one holder", () => {
    const c = makeCharacter({
      name: "A",
      inventory: [
        { id: "1", name: "Rope, 50 ft", rarity: "Common", category: "Gear", quantity: 1 },
        { id: "2", name: "Rope, 50 ft", rarity: "Common", category: "Gear", quantity: 1 },
      ],
    });
    const entries = computeCriticalInventoryHighlights([c]);
    expect(entries).toEqual([
      {
        category: "Exploration",
        name: "Rope, 50 ft",
        totalQuantity: 2,
        holders: [{ characterId: "A", characterName: "A", quantity: 2 }],
      },
    ]);
  });

  test("a scroll of revivify is claimed by Healing & Emergency, not the generic Magic & Utility 'scroll of' keyword", () => {
    const c = makeCharacter({
      name: "A",
      inventory: [{ id: "1", name: "Scroll of Revivify", rarity: "Rare", category: "Magic Item", quantity: 1 }],
    });
    expect(computeCriticalInventoryHighlights([c])[0].category).toBe("Healing & Emergency");
  });
});

describe("computeSensesCoverage", () => {
  test("counts characters per sense and finds the best range, in tracked order", () => {
    const a = makeCharacter({ name: "A", senses: [{ name: "Darkvision", range: 60 }] });
    const b = makeCharacter({ name: "B", senses: [{ name: "Darkvision", range: 120 }] });
    const c = makeCharacter({ name: "C", senses: [] });

    const coverage = computeSensesCoverage([a, b, c]);
    expect(coverage.map((s) => s.name)).toEqual(["Darkvision", "Blindsight", "Tremorsense", "Truesight"]);
    expect(coverage[0]).toEqual({
      name: "Darkvision",
      count: 2,
      partySize: 3,
      best: { characterName: "B", range: 120 },
    });
    expect(coverage[1]).toEqual({ name: "Blindsight", count: 0, partySize: 3, best: null });
  });
});

describe("computeUtilitySpellAvailability", () => {
  test("flags Detect Magic/See Invisibility availability from knownSpells", () => {
    const caster = makeCharacter({
      name: "Runa",
      knownSpells: [{ id: "s1", name: "Detect Magic", level: 2, source: "Class" }],
    });
    const nonCaster = makeCharacter({ name: "Ragnar" });

    const result = computeUtilitySpellAvailability([caster, nonCaster]);
    expect(result).toEqual([
      { name: "Detect Magic", available: true, characters: [{ characterId: "Runa", characterName: "Runa" }] },
      { name: "See Invisibility", available: false, characters: [] },
    ]);
  });
});

describe("computeResistanceCoverage / computeConditionProtectionCoverage", () => {
  test("only lists resistance types the party actually has, no fixed pinned list", () => {
    const c = makeCharacter({ name: "A", resistances: ["Cold"] });
    const coverage = computeResistanceCoverage([c]);
    expect(coverage).toEqual([
      { name: "Cold", count: 1, partySize: 1, holders: [{ characterId: "A", characterName: "A" }] },
    ]);
  });

  test("empty party / no resistances yields no rows", () => {
    const c = makeCharacter({ name: "A", resistances: [] });
    expect(computeResistanceCoverage([c])).toEqual([]);
  });

  test("only lists immunity types the party actually has", () => {
    const c = makeCharacter({ name: "A", immunities: ["Poisoned"] });
    const coverage = computeConditionProtectionCoverage([c]);
    expect(coverage).toEqual([
      { name: "Poisoned", count: 1, partySize: 1, holders: [{ characterId: "A", characterName: "A" }] },
    ]);
  });
});

describe("computeLanguageCoverage", () => {
  test("counts only languages actually present in the party, sorted by count then name", () => {
    const a = makeCharacter({ name: "A", languages: ["Common", "Elvish"] });
    const b = makeCharacter({ name: "B", languages: ["Common"] });

    expect(computeLanguageCoverage([a, b])).toEqual([
      {
        name: "Common",
        count: 2,
        partySize: 2,
        holders: [
          { characterId: "A", characterName: "A" },
          { characterId: "B", characterName: "B" },
        ],
      },
      { name: "Elvish", count: 1, partySize: 2, holders: [{ characterId: "A", characterName: "A" }] },
    ]);
  });
});

describe("computeToolCoverage", () => {
  test("only lists tools the party actually has, no fixed pinned list", () => {
    const c = makeCharacter({ name: "Lilith", toolProficiencies: ["Herbalism Kit"] });
    const coverage = computeToolCoverage([c]);
    expect(coverage).toEqual([
      { name: "Herbalism Kit", count: 1, partySize: 1, holders: [{ characterId: "Lilith", characterName: "Lilith" }] },
    ]);
  });
});

describe("computeSpellAbilityCoverage", () => {
  test("matches known spells and features case-insensitively into their categories", () => {
    const runa = makeCharacter({
      name: "Runa",
      knownSpells: [
        { id: "s1", name: "Fireball", level: 3, source: "Class" },
        { id: "s2", name: "detect magic", level: 2, source: "Class" },
      ],
    });
    const lilith = makeCharacter({
      name: "Lilith",
      features: [{ id: "f1", name: "Lucky", source: "Feat", group: "other", originType: "feat" }],
    });

    const coverage = computeSpellAbilityCoverage([runa, lilith]);
    expect(coverage["AOE Damage"]).toEqual([{ name: "Fireball", characterId: "Runa", characterName: "Runa" }]);
    expect(coverage.Detection).toEqual([{ name: "detect magic", characterId: "Runa", characterName: "Runa" }]);
    expect(coverage.Rerolls).toEqual([
      { name: "Heroic Inspiration", characterName: "0 / 2" },
      { name: "Lucky", characterId: "Lilith", characterName: "Lilith" },
    ]);
  });

  test("a spell/ability not in the config map doesn't show up anywhere", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Definitely Not A Real Spell", level: 1, source: "Class" }],
    });
    const coverage = computeSpellAbilityCoverage([c]);
    const allEntries = Object.values(coverage).flat();
    expect(allEntries.some((e) => e.name === "Definitely Not A Real Spell")).toBe(false);
  });

  test("Shield maps to both Protection and Reactions", () => {
    const c = makeCharacter({ name: "A", knownSpells: [{ id: "s1", name: "Shield", level: 1, source: "Class" }] });
    const coverage = computeSpellAbilityCoverage([c]);
    expect(coverage.Protection).toEqual([{ name: "Shield", characterId: "A", characterName: "A" }]);
    expect(coverage.Reactions).toEqual([{ name: "Shield", characterId: "A", characterName: "A" }]);
  });

  test("every category is present (possibly empty) for an empty party", () => {
    const coverage = computeSpellAbilityCoverage([]);
    expect(Object.keys(coverage)).toHaveLength(16);
    expect(coverage.Healing).toEqual([]);
    expect(coverage.Rerolls).toEqual([]);
  });
});
