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
      perception: { best: { characterName: "Esmeralda", value: 17 }, average: 14, lowest: { characterName: "Ragnar", value: 11 } },
      insight: { characterName: "Ragnar", value: 15 },
      investigation: { characterName: "Ragnar", value: 14 },
    });
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
      { id: "Ragnar-rage", resourceName: "Rage", characterName: "Ragnar", current: 0, max: 3, status: "empty" },
      {
        id: "Alor-surge",
        resourceName: "Action Surge",
        characterName: "Alor",
        current: 1,
        max: 1,
        status: "normal",
      },
      {
        id: "Ragnar-luck",
        resourceName: "Luck Points",
        characterName: "Ragnar",
        current: 2,
        max: 3,
        status: "normal",
      },
    ]);
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
          { characterName: "Ragnar", quantity: 2 },
          { characterName: "Lilith", quantity: 2 },
        ],
      },
      {
        category: "Exploration",
        name: "Rope, 50 ft",
        totalQuantity: 1,
        holders: [{ characterName: "Ragnar", quantity: 1 }],
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
      { name: "Detect Magic", available: true, characterNames: ["Runa"] },
      { name: "See Invisibility", available: false, characterNames: [] },
    ]);
  });
});

describe("computeResistanceCoverage / computeConditionProtectionCoverage", () => {
  test("pins Cold/Poison/Fire/Necrotic even at 0 coverage", () => {
    const c = makeCharacter({ name: "A", resistances: ["Cold"] });
    const coverage = computeResistanceCoverage([c]);
    expect(coverage).toEqual([
      { name: "Cold", count: 1, partySize: 1 },
      { name: "Poison", count: 0, partySize: 1 },
      { name: "Fire", count: 0, partySize: 1 },
      { name: "Necrotic", count: 0, partySize: 1 },
    ]);
  });

  test("matches 'Advantage vs Frightened' fuzzily against the free-text advantages list", () => {
    const c = makeCharacter({
      name: "A",
      advantages: ["Advantage: Charmed — you have advantage on saving throws against being frightened."],
      immunities: ["Poisoned"],
    });
    const coverage = computeConditionProtectionCoverage([c]);
    expect(coverage).toEqual([
      { name: "Advantage vs Frightened", count: 1, partySize: 1 },
      { name: "Immunity to Charmed", count: 0, partySize: 1 },
      { name: "Immunity to Poisoned", count: 1, partySize: 1 },
    ]);
  });
});

describe("computeLanguageCoverage", () => {
  test("counts only languages actually present in the party, sorted by count then name", () => {
    const a = makeCharacter({ name: "A", languages: ["Common", "Elvish"] });
    const b = makeCharacter({ name: "B", languages: ["Common"] });

    expect(computeLanguageCoverage([a, b])).toEqual([
      { name: "Common", count: 2, partySize: 2 },
      { name: "Elvish", count: 1, partySize: 2 },
    ]);
  });
});

describe("computeToolCoverage", () => {
  test("shows pinned tools even with no owner, owned ones sorted first", () => {
    const c = makeCharacter({ name: "Lilith", toolProficiencies: ["Herbalism Kit"] });
    const coverage = computeToolCoverage([c]);
    expect(coverage[0]).toEqual({ name: "Herbalism Kit", characterNames: ["Lilith"] });
    expect(coverage.find((t) => t.name === "Navigator's Tools")).toEqual({
      name: "Navigator's Tools",
      characterNames: [],
    });
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
    expect(coverage["AOE Damage"]).toEqual([{ name: "Fireball", characterName: "Runa" }]);
    expect(coverage.Detection).toEqual([{ name: "detect magic", characterName: "Runa" }]);
    expect(coverage.Rerolls).toEqual([
      { name: "Heroic Inspiration", characterName: "0 / 2" },
      { name: "Lucky", characterName: "Lilith" },
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
    expect(coverage.Protection).toEqual([{ name: "Shield", characterName: "A" }]);
    expect(coverage.Reactions).toEqual([{ name: "Shield", characterName: "A" }]);
  });

  test("every category is present (possibly empty) for an empty party", () => {
    const coverage = computeSpellAbilityCoverage([]);
    expect(Object.keys(coverage)).toHaveLength(16);
    expect(coverage.Healing).toEqual([]);
    expect(coverage.Rerolls).toEqual([]);
  });
});
