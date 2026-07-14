import { describe, expect, test } from "vitest";
import { Character } from "./types";
import {
  RESOURCE_COVERAGE_CATEGORY_ORDER,
  computeAbilitySkillCoverage,
  computeConditionProtectionCoverage,
  computeHeroicInspirationSummary,
  computeLanguageCoverage,
  computePartyPassiveSummary,
  computePartyResourceSummary,
  computePartyRestRecoveryGauge,
  computePartySkillOverview,
  computePartySpellSlotSummary,
  computePartySpellsByLevel,
  computeResistanceCoverage,
  computeResourceCoverage,
  computeResourceStatus,
  computeSensesCoverage,
  computeSkillOverviewEntry,
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

  test("carries a character's advantage/disadvantage through to best/weakest/all — modifier alone doesn't show it", () => {
    const lilith = makeCharacter({
      name: "Lilith",
      stats: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
      skillProficiencies: [{ name: "stealth", proficient: true, expertise: false, advantage: "disadvantage" }],
    });
    const ragnar = makeCharacter({
      name: "Ragnar",
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      skillProficiencies: [],
    });

    const entry = computeSkillOverviewEntry([lilith, ragnar], "stealth");

    // Lilith still has the higher modifier and is still "best" — but a DM picking her to actually
    // roll would be missing that the roll itself is at disadvantage, since that's invisible in the
    // modifier number.
    expect(entry.best?.characterId).toBe("Lilith");
    expect(entry.best?.advantage).toBe("disadvantage");
    expect(entry.weakest?.advantage).toBeUndefined();
    expect(entry.all.find((s) => s.characterId === "Lilith")?.advantage).toBe("disadvantage");
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

describe("computeAbilitySkillCoverage", () => {
  test("collapses the 18 skills onto the 5 abilities that have skills — Constitution is never an axis", () => {
    const a = makeCharacter({ name: "A", skillProficiencies: [{ name: "athletics", proficient: true, expertise: false }] });
    const b = makeCharacter({ name: "B", skillProficiencies: [] });

    const coverage = computeAbilitySkillCoverage([a, b]);
    expect(coverage.map((c) => c.ability)).toEqual(["str", "dex", "int", "wis", "cha"]);
    expect(coverage.find((c) => c.ability === "str")).toEqual({ ability: "str", percent: 50, skillCount: 1 });
    expect(coverage.find((c) => c.ability === "dex")).toEqual({ ability: "dex", percent: 0, skillCount: 3 });
    expect(coverage.find((c) => c.ability === "int")).toEqual({ ability: "int", percent: 0, skillCount: 5 });
    expect(coverage.find((c) => c.ability === "wis")).toEqual({ ability: "wis", percent: 0, skillCount: 5 });
    expect(coverage.find((c) => c.ability === "cha")).toEqual({ ability: "cha", percent: 0, skillCount: 4 });
  });

  test("averages every skill under an ability, not just one of them", () => {
    const a = makeCharacter({
      name: "A",
      skillProficiencies: [
        { name: "acrobatics", proficient: true, expertise: false },
        { name: "stealth", proficient: true, expertise: false },
      ],
    });
    const b = makeCharacter({ name: "B", skillProficiencies: [{ name: "acrobatics", proficient: true, expertise: false }] });

    // dex: acrobatics 2/2 -> 100%, sleight-of-hand 0/2 -> 0%, stealth 1/2 -> 50% => average 50
    const coverage = computeAbilitySkillCoverage([a, b]);
    expect(coverage.find((c) => c.ability === "dex")).toEqual({ ability: "dex", percent: 50, skillCount: 3 });
  });

  test("empty for an empty party", () => {
    expect(computeAbilitySkillCoverage([])).toEqual([]);
  });
});

describe("computePartyPassiveSummary", () => {
  test("returns null for an empty party", () => {
    expect(computePartyPassiveSummary([])).toBeNull();
  });

  test("a tie in passive perception breaks by characterId, not characterName", () => {
    const zeta = makeCharacter({
      id: "aaa",
      name: "Zeta",
      combat: { hp: 1, maxHp: 1, tempHp: 0, ac: 10, speed: 30, passivePerception: 12, passiveInvestigation: 10, passiveInsight: 10, conditions: [], exhaustion: 0 },
    });
    const alpha = makeCharacter({
      id: "zzz",
      name: "Alpha",
      combat: { hp: 1, maxHp: 1, tempHp: 0, ac: 10, speed: 30, passivePerception: 12, passiveInvestigation: 10, passiveInsight: 10, conditions: [], exhaustion: 0 },
    });

    const summary = computePartyPassiveSummary([alpha, zeta]);

    expect(summary?.perception.all.map((s) => s.characterName)).toEqual(["Zeta", "Alpha"]);
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
        best: { characterId: "Esmeralda", characterName: "Esmeralda", value: 17 },
        weakest: { characterId: "Ragnar", characterName: "Ragnar", value: 11 },
        average: 14,
        lowest: { characterId: "Ragnar", characterName: "Ragnar", value: 11 },
        all: [
          { characterId: "Esmeralda", characterName: "Esmeralda", value: 17, proficient: false },
          { characterId: "Ragnar", characterName: "Ragnar", value: 11, proficient: false },
        ],
        proficientCount: 0,
        status: "Weak",
      },
      insight: {
        best: { characterId: "Ragnar", characterName: "Ragnar", value: 15 },
        weakest: { characterId: "Esmeralda", characterName: "Esmeralda", value: 11 },
        all: [
          { characterId: "Ragnar", characterName: "Ragnar", value: 15, proficient: false },
          { characterId: "Esmeralda", characterName: "Esmeralda", value: 11, proficient: false },
        ],
        proficientCount: 0,
        status: "Weak",
      },
      investigation: {
        best: { characterId: "Ragnar", characterName: "Ragnar", value: 14 },
        weakest: { characterId: "Esmeralda", characterName: "Esmeralda", value: 10 },
        all: [
          { characterId: "Ragnar", characterName: "Ragnar", value: 14, proficient: false },
          { characterId: "Esmeralda", characterName: "Esmeralda", value: 10, proficient: false },
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
    expect(summary?.perception.all).toEqual([{ characterId: "A", characterName: "A", value: 15, proficient: true }]);
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
        {
          level: 1,
          current: 7,
          max: 12,
          holders: [
            { characterId: "Runa", characterName: "Runa", current: 4, max: 4 },
            { characterId: "Lilith", characterName: "Lilith", current: 3, max: 8 },
          ],
        },
        {
          level: 2,
          current: 0,
          max: 3,
          holders: [{ characterId: "Runa", characterName: "Runa", current: 0, max: 3 }],
        },
        {
          level: 3,
          current: 1,
          max: 4,
          holders: [{ characterId: "Lilith", characterName: "Lilith", current: 1, max: 4 }],
        },
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

describe("computePartySpellsByLevel", () => {
  test("groups by level, ascending, cantrips (level 0) first", () => {
    const a = makeCharacter({
      name: "A",
      knownSpells: [
        { id: "s1", name: "Fireball", level: 3, source: "Class" },
        { id: "s2", name: "Fire Bolt", level: 0, source: "Class" },
        { id: "s3", name: "Shield", level: 1, source: "Class" },
      ],
    });
    const groups = computePartySpellsByLevel([a]);
    expect(groups.map((g) => g.level)).toEqual([0, 1, 3]);
    expect(groups[0].spells.map((s) => s.name)).toEqual(["Fire Bolt"]);
    expect(groups[0].spells[0].isCantrip).toBe(true);
  });

  test("two characters knowing the same spell collapse into one entry with both as holders", () => {
    const a = makeCharacter({ name: "A", knownSpells: [{ id: "s1", name: "Shield", level: 1, source: "Class" }] });
    const b = makeCharacter({ name: "B", knownSpells: [{ id: "s1", name: "shield", level: 1, source: "Class" }] });
    const groups = computePartySpellsByLevel([a, b]);
    expect(groups).toEqual([
      {
        level: 1,
        spells: [
          {
            name: "Shield",
            isCantrip: false,
            holders: [
              { characterId: "A", characterName: "A" },
              { characterId: "B", characterName: "B" },
            ],
          },
        ],
      },
    ]);
  });

  test("a character knowing the same spell twice (innate charge-pool copy + slot-cost copy) counts as one holder, not two", () => {
    const a = makeCharacter({
      name: "A",
      knownSpells: [
        { id: "s1", name: "Faerie Fire", level: 1, source: "Race" },
        { id: "s2", name: "Faerie Fire", level: 1, source: "Race", current: 1, max: 1, recovery: "long-rest" },
      ],
    });
    const groups = computePartySpellsByLevel([a]);
    expect(groups).toEqual([{ level: 1, spells: [{ name: "Faerie Fire", isCantrip: false, holders: [{ characterId: "A", characterName: "A" }] }] }]);
  });

  test("spells within a level sort alphabetically", () => {
    const a = makeCharacter({
      name: "A",
      knownSpells: [
        { id: "s1", name: "Web", level: 2, source: "Class" },
        { id: "s2", name: "Acid Arrow", level: 2, source: "Class" },
      ],
    });
    expect(computePartySpellsByLevel([a])[0].spells.map((s) => s.name)).toEqual(["Acid Arrow", "Web"]);
  });

  test("empty for a party with no known spells", () => {
    expect(computePartySpellsByLevel([makeCharacter({ name: "A" })])).toEqual([]);
  });

  test("carries the first non-empty description across holders", () => {
    const a = makeCharacter({ name: "A", knownSpells: [{ id: "s1", name: "Shield", level: 1, source: "Class" }] });
    const b = makeCharacter({
      name: "B",
      knownSpells: [{ id: "s1", name: "shield", level: 1, source: "Class", description: "An invisible barrier of force." }],
    });
    const groups = computePartySpellsByLevel([a, b]);
    expect(groups[0].spells[0].description).toBe("An invisible barrier of force.");
  });
});

describe("computeHeroicInspirationSummary", () => {
  test("counts characters with inspiration against party size", () => {
    const chars = [
      makeCharacter({ name: "A", heroicInspiration: true }),
      makeCharacter({ name: "B", heroicInspiration: false }),
      makeCharacter({ name: "C", heroicInspiration: true }),
    ];
    expect(computeHeroicInspirationSummary(chars)).toEqual({
      withInspiration: 2,
      partySize: 3,
      holders: [
        { characterId: "A", characterName: "A" },
        { characterId: "C", characterName: "C" },
      ],
    });
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

describe("computePartyRestRecoveryGauge", () => {
  test("splits resources into short-rest (+ encounter) and long-rest (+ everything else) buckets, keeping each bucket's contributing entries for the hint", () => {
    const a = makeCharacter({
      name: "A",
      resources: [
        { id: "surge", name: "Action Surge", current: 0, max: 1, recovery: "short-rest" }, // 0%
        { id: "second-wind", name: "Second Wind", current: 1, max: 1, recovery: "encounter" }, // 100%
        { id: "rage", name: "Rage", current: 1, max: 2, recovery: "long-rest" }, // 50%
        { id: "misty", name: "Misty Step (item)", current: 1, max: 1, recovery: "dawn" }, // 100%
      ],
    });

    const recovery = computePartyRestRecoveryGauge([a]);
    expect(recovery.shortRest).toEqual({
      percent: 50,
      resourceCount: 2,
      entries: [
        { id: "A-surge", characterName: "A", resourceName: "Action Surge", current: 0, max: 1 },
        { id: "A-second-wind", characterName: "A", resourceName: "Second Wind", current: 1, max: 1 },
      ],
    });
    expect(recovery.longRest).toEqual({
      percent: 75,
      resourceCount: 2,
      entries: [
        { id: "A-misty", characterName: "A", resourceName: "Misty Step (item)", current: 1, max: 1 },
        { id: "A-rage", characterName: "A", resourceName: "Rage", current: 1, max: 2 },
      ],
    });
    expect(recovery.total).toEqual({
      percent: 63,
      resourceCount: 4,
      entries: [
        { id: "A-surge", characterName: "A", resourceName: "Action Surge", current: 0, max: 1 },
        { id: "A-second-wind", characterName: "A", resourceName: "Second Wind", current: 1, max: 1 },
        { id: "A-misty", characterName: "A", resourceName: "Misty Step (item)", current: 1, max: 1 },
        { id: "A-rage", characterName: "A", resourceName: "Rage", current: 1, max: 2 },
      ],
    });
  });

  test("a bucket is null (not a 0% dial) when the party has no resources of that kind", () => {
    const a = makeCharacter({
      name: "A",
      resources: [{ id: "rage", name: "Rage", current: 1, max: 2, recovery: "long-rest" }],
    });
    const recovery = computePartyRestRecoveryGauge([a]);
    expect(recovery.shortRest).toBeNull();
    expect(recovery.longRest).toEqual({
      percent: 50,
      resourceCount: 1,
      entries: [{ id: "A-rage", characterName: "A", resourceName: "Rage", current: 1, max: 2 }],
    });
  });

  test("both null for an empty party", () => {
    expect(computePartyRestRecoveryGauge([])).toEqual({ shortRest: null, longRest: null, total: null });
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
      best: { characterId: "B", characterName: "B", range: 120 },
      holders: [
        { characterId: "A", characterName: "A", range: 60 },
        { characterId: "B", characterName: "B", range: 120 },
      ],
    });
    expect(coverage[1]).toEqual({ name: "Blindsight", count: 0, partySize: 3, best: null, holders: [] });
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

describe("computeResourceCoverage", () => {
  test("a spell with its own charge pool carries pool availability", () => {
    const c = makeCharacter({
      name: "Runa",
      knownSpells: [{ id: "s1", name: "Fireball", level: 3, source: "Class", current: 1, max: 2, recovery: "long-rest" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage["Damage AOE"]).toEqual([
      {
        name: "Fireball",
        characterId: "Runa",
        characterName: "Runa",
        description: undefined,
        availability: { kind: "pool", current: 1, max: 2, recovery: "long-rest" },
        kind: "spell",
        source: "Class",
        isCantrip: false,
      },
    ]);
  });

  test("a spell with no charge pool computes slot availability from this character's own spell slots", () => {
    const c = makeCharacter({
      name: "Lilith",
      knownSpells: [{ id: "s1", name: "Guiding Bolt", level: 1, source: "Class" }],
      spellSlots: [
        { level: 1, current: 0, max: 4 },
        { level: 2, current: 2, max: 2 },
      ],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage["Damage Single Target"]).toEqual([
      {
        name: "Guiding Bolt",
        characterId: "Lilith",
        characterName: "Lilith",
        description: undefined,
        availability: { kind: "slot", level: 1, available: true, remaining: 2 },
        kind: "spell",
        source: "Class",
        isCantrip: false,
      },
    ]);
  });

  test("a spent-out spell reports slot unavailable, not just a low number", () => {
    const c = makeCharacter({
      name: "Lilith",
      knownSpells: [{ id: "s1", name: "Guiding Bolt", level: 1, source: "Class" }],
      spellSlots: [{ level: 1, current: 0, max: 4 }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage["Damage Single Target"][0].availability).toEqual({ kind: "slot", level: 1, available: false, remaining: 0 });
  });

  test("a cantrip has no availability at all — nothing to run out of", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Vicious Mockery", level: 0, source: "Class" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Social[0].availability).toBeUndefined();
    expect(coverage.Social[0].isCantrip).toBe(true);
  });

  test("a feature with no linked charge pool has no availability", () => {
    const c = makeCharacter({
      name: "A",
      features: [{ id: "f1", name: "Lucky", source: "Feat", group: "other", originType: "feat" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Rerolls.find((e) => e.name === "Lucky")?.availability).toBeUndefined();
  });

  test("a resource not matching any coverage keyword lands in Resources with pool availability", () => {
    const c = makeCharacter({
      name: "Ragnar",
      resources: [{ id: "r1", name: "Rage", current: 1, max: 3, recovery: "long-rest", source: "Class" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Resources).toEqual([
      {
        name: "Rage",
        characterId: "Ragnar",
        characterName: "Ragnar",
        description: undefined,
        kind: "resource",
        source: "Class",
        availability: { kind: "pool", current: 1, max: 3, recovery: "long-rest" },
      },
    ]);
  });

  test("Heroic Inspiration still lands in Rerolls untouched, with no availability", () => {
    const c = makeCharacter({ name: "A", heroicInspiration: true });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Rerolls).toContainEqual({
      name: "Heroic Inspiration",
      characterName: "1/1",
      holders: [{ characterId: "A", characterName: "A" }],
    });
  });

  test("a same-named feature that ISN'T coverage-categorized doesn't suppress the resource from Resources", () => {
    // Regression: a Feature with no coverage-keyword match used to still mark
    // the name as "seen" and silently swallow the identically-named Resource
    // entirely — invisible in both Resources (wrongly suppressed) and every
    // category (never matched one to begin with).
    const c = makeCharacter({
      name: "Ragnar",
      features: [{ id: "f1", name: "Rage (Enter)", source: "Class", group: "bonusAction", originType: "class" }],
      resources: [{ id: "r1", name: "Rage (Enter)", current: 3, max: 3, recovery: "long-rest", source: "Class" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Resources).toEqual([
      {
        name: "Rage (Enter)",
        characterId: "Ragnar",
        characterName: "Ragnar",
        description: undefined,
        kind: "resource",
        source: "Class",
        availability: { kind: "pool", current: 3, max: 3, recovery: "long-rest" },
      },
    ]);
  });

  test("a resource whose name already matched a spell/feature isn't also listed in Resources", () => {
    const c = makeCharacter({
      name: "Lilith",
      features: [
        { id: "f1", name: "Lay On Hands: Heal", source: "Class", group: "other", originType: "class", current: 5, max: 25, recovery: "long-rest" },
      ],
      resources: [{ id: "r1", name: "Lay On Hands: Heal", current: 5, max: 25, recovery: "long-rest", source: "Class" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Healing).toHaveLength(1);
    expect(coverage.Resources).toHaveLength(0);
  });

  test("entries within a category sort alphabetically by name, not by availability", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [
        { id: "s1", name: "Faerie Fire", level: 1, source: "Race", current: 0, max: 1, recovery: "long-rest" },
        { id: "s2", name: "Web", level: 2, source: "Class" },
      ],
      spellSlots: [{ level: 2, current: 3, max: 3 }],
    });
    const coverage = computeResourceCoverage([c]);
    // Faerie Fire is a depleted pool and Web is an available slot — an
    // availability-first sort would put Web ahead of Faerie Fire; plain name
    // order doesn't.
    expect(coverage.Control.map((e) => e.name)).toEqual(["Faerie Fire", "Web"]);
  });

  test("every category is present (possibly empty), including the new Resources bucket", () => {
    const coverage = computeResourceCoverage([]);
    expect(Object.keys(coverage)).toHaveLength(16);
    expect(coverage.Resources).toEqual([]);
  });

  test("RESOURCE_COVERAGE_CATEGORY_ORDER puts Resources first, then the rest alphabetical", () => {
    expect(RESOURCE_COVERAGE_CATEGORY_ORDER[0]).toBe("Resources");
    const rest = RESOURCE_COVERAGE_CATEGORY_ORDER.slice(1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  test("a spell known twice under the same name (charge pool + costs-a-slot) collapses to one entry, preferring the charge pool", () => {
    // D&D Beyond's own quirk (see computeSpells's doc comment): an innate
    // spell with a free-cast charge pool is listed twice — once with its own
    // current/max, once as an ordinary slot-cost cast of the same spell.
    const c = makeCharacter({
      name: "Runa",
      knownSpells: [
        { id: "s1", name: "Faerie Fire", level: 1, source: "Race" },
        { id: "s2", name: "Faerie Fire", level: 1, source: "Race", current: 1, max: 1, recovery: "long-rest" },
      ],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Control).toEqual([
      {
        name: "Faerie Fire",
        characterId: "Runa",
        characterName: "Runa",
        description: undefined,
        kind: "spell",
        source: "Race",
        isCantrip: false,
        availability: { kind: "pool", current: 1, max: 1, recovery: "long-rest" },
      },
    ]);
  });

  test("a known spell not in the coverage keyword map lands in Resources instead of vanishing", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Prestidigitation", level: 0, source: "Class" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Resources).toEqual([
      {
        name: "Prestidigitation",
        characterId: "A",
        characterName: "A",
        description: undefined,
        kind: "spell",
        source: "Class",
        isCantrip: true,
        availability: undefined,
      },
    ]);
  });

  test("an uncategorized feature does NOT land in Resources — too much lore/reference noise, unlike spells", () => {
    const c = makeCharacter({
      name: "A",
      features: [{ id: "f1", name: "Ability Score Increases", source: "Race", group: "other", originType: "species" }],
    });
    const coverage = computeResourceCoverage([c]);
    const allEntries = Object.values(coverage).flat();
    expect(allEntries.some((e) => e.name === "Ability Score Increases")).toBe(false);
  });

  test("a charge-pool resource named with D&D Beyond's level suffix isn't listed again in Other once its plain-named spell is already categorized", () => {
    const c = makeCharacter({
      name: "Runa",
      knownSpells: [{ id: "s1", name: "Faerie Fire", level: 1, source: "Race" }],
      resources: [{ id: "r1", name: "Faerie Fire (1st)", current: 1, max: 1, recovery: "long-rest", source: "Race" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Control).toHaveLength(1);
    expect(coverage.Resources).toHaveLength(0);
  });

  test("a spell categorizes via D&D Beyond's own tags alone, even with a name not in the keyword map", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Totally Homebrew Heal", level: 2, source: "Class", tags: ["Healing"] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Healing.map((e) => e.name)).toContain("Totally Homebrew Heal");
  });

  test("a Damage-tagged spell with isAreaEffect lands in Damage AOE, not Damage Single Target", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Homebrew Blast", level: 3, source: "Class", tags: ["Damage"], isAreaEffect: true }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage["Damage AOE"].map((e) => e.name)).toContain("Homebrew Blast");
    expect(coverage["Damage Single Target"].map((e) => e.name)).not.toContain("Homebrew Blast");
  });

  test("a Damage-tagged spell without isAreaEffect lands in Damage Single Target, not Damage AOE", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Homebrew Zap", level: 1, source: "Class", tags: ["Damage"] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage["Damage Single Target"].map((e) => e.name)).toContain("Homebrew Zap");
    expect(coverage["Damage AOE"].map((e) => e.name)).not.toContain("Homebrew Zap");
  });

  test("isReaction beats whatever the tag already contributed — Reactions ranks first in the fixed priority order, so a reaction never shows twice", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Homebrew Riposte", level: 1, source: "Class", tags: ["Warding"], isReaction: true }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Reactions.map((e) => e.name)).toContain("Homebrew Riposte");
    expect(coverage.Protection.map((e) => e.name)).not.toContain("Homebrew Riposte");
  });

  test("a spell that has D&D Beyond tags never falls back to the name-keyword match, even for a category the tag doesn't reach", () => {
    const c = makeCharacter({
      name: "A",
      // Faerie Fire's real tags include Detection; the keyword map separately
      // knows its exact name as Control. Once a spell has tags, D&D Beyond's
      // classification is authoritative — no name-keyword topping-up.
      knownSpells: [{ id: "s1", name: "Faerie Fire", level: 1, source: "Race", tags: ["Detection"] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Detection.map((e) => e.name)).toContain("Faerie Fire");
    expect(coverage.Control.map((e) => e.name)).not.toContain("Faerie Fire");
  });

  test("a spell with no tags at all (not yet re-synced) still categorizes via keyword fallback, unchanged", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Fireball", level: 3, source: "Class" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage["Damage AOE"].map((e) => e.name)).toContain("Fireball");
  });

  test("a spell with an empty tags array (same as absent) still categorizes via keyword fallback", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Fireball", level: 3, source: "Class", tags: [] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage["Damage AOE"].map((e) => e.name)).toContain("Fireball");
  });

  test("a spell entry carries its raw D&D Beyond tags through for the hint's diagnostic line", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Cure Wounds", level: 1, source: "Class", tags: ["Healing"] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Healing.find((e) => e.name === "Cure Wounds")?.tags).toEqual(["Healing"]);
  });

  test("a feature entry never carries a tags field, even when it lands in a category", () => {
    const c = makeCharacter({
      name: "A",
      features: [{ id: "f1", name: "Lucky", source: "Feat", group: "other", originType: "feat" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Rerolls.find((e) => e.name === "Lucky")?.tags).toBeUndefined();
  });

  test("a Summoning-tagged spell lands in the dedicated Summoning category", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Homebrew Conjuring", level: 3, source: "Class", tags: ["Summoning"] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Summoning.map((e) => e.name)).toContain("Homebrew Conjuring");
  });

  test("a Foreknoweledge-tagged spell lands in Detection", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Homebrew Augury", level: 2, source: "Class", tags: ["Foreknoweledge"] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Detection.map((e) => e.name)).toContain("Homebrew Augury");
  });

  test("a Contaminated-tagged spell lands in Survival", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Homebrew Purge", level: 1, source: "Class", tags: ["Contaminated"] }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Survival.map((e) => e.name)).toContain("Homebrew Purge");
  });

  test("a Utility-tagged spell with no other mapped tag stays out of every category (deliberately unmapped)", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [{ id: "s1", name: "Homebrew Gadgetry", level: 0, source: "Class", tags: ["Utility"] }],
    });
    const coverage = computeResourceCoverage([c]);
    const categorized = Object.entries(coverage)
      .filter(([key]) => key !== "Resources")
      .flatMap(([, entries]) => entries);
    expect(categorized.some((e) => e.name === "Homebrew Gadgetry")).toBe(false);
    expect(coverage.Resources.map((e) => e.name)).toContain("Homebrew Gadgetry");
  });
});

describe("computeFeatureCategories (via computeResourceCoverage) — features have no tags, only name-keyword, group, and description-trigger signals", () => {
  test("the existing name-keyword match still wins outright, unchanged — Lucky lands in Rerolls", () => {
    const c = makeCharacter({
      name: "A",
      features: [{ id: "f1", name: "Lucky", source: "Feat", group: "other", originType: "feat" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Rerolls.map((e) => e.name)).toContain("Lucky");
  });

  test("a reaction-group feature with no name match and no description lands in Reactions via the structured group signal", () => {
    const c = makeCharacter({
      name: "A",
      features: [{ id: "f1", name: "Deflect Missiles", source: "Class", group: "reaction", originType: "class" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Reactions.map((e) => e.name)).toContain("Deflect Missiles");
  });

  test("a description trigger phrase categorizes a feature with no name match and no reaction group", () => {
    const c = makeCharacter({
      name: "A",
      features: [
        {
          id: "f1",
          name: "Totally Homebrew Trance",
          source: "Race",
          group: "other",
          originType: "species",
          description: "Once per day, you regain hit points equal to your level.",
        },
      ],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Healing.map((e) => e.name)).toContain("Totally Homebrew Trance");
  });

  test("the first matching category in trigger-priority order wins, not every category whose phrase happens to appear", () => {
    const c = makeCharacter({
      name: "A",
      features: [
        {
          id: "f1",
          name: "Totally Homebrew Ward",
          source: "Class",
          group: "other",
          originType: "class",
          // Matches both Protection ("resistance to") and Survival ("immune to poison") triggers —
          // Protection is earlier in FEATURE_CATEGORY_TRIGGER_PRIORITY, so it alone wins.
          description: "You gain resistance to fire damage and become immune to poison.",
        },
      ],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Protection.map((e) => e.name)).toContain("Totally Homebrew Ward");
    expect(coverage.Survival.map((e) => e.name)).not.toContain("Totally Homebrew Ward");
  });

  test("name-keyword match takes priority over the reaction group signal", () => {
    const c = makeCharacter({
      name: "A",
      // Contrived: "Lucky" is keyword-mapped to Rerolls; group: "reaction" must not override that.
      features: [{ id: "f1", name: "Lucky", source: "Feat", group: "reaction", originType: "feat" }],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Rerolls.map((e) => e.name)).toContain("Lucky");
    expect(coverage.Reactions.map((e) => e.name)).not.toContain("Lucky");
  });

  test("the reaction group signal takes priority over a description trigger phrase", () => {
    const c = makeCharacter({
      name: "A",
      features: [
        {
          id: "f1",
          name: "Totally Homebrew Parry",
          source: "Class",
          group: "reaction",
          originType: "class",
          description: "When you take damage, you regain hit points equal to your proficiency bonus.",
        },
      ],
    });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Reactions.map((e) => e.name)).toContain("Totally Homebrew Parry");
    expect(coverage.Healing.map((e) => e.name)).not.toContain("Totally Homebrew Parry");
  });

  test("a feature matching no signal at all still doesn't land in Resources — same rule as any other uncategorized feature", () => {
    const c = makeCharacter({
      name: "A",
      features: [{ id: "f1", name: "Totally Homebrew Lore", source: "Background", group: "other", originType: "background", description: "You know a lot of trivia." }],
    });
    const coverage = computeResourceCoverage([c]);
    const allEntries = Object.values(coverage).flat();
    expect(allEntries.some((e) => e.name === "Totally Homebrew Lore")).toBe(false);
  });
});

describe("COVERAGE_CATEGORY_PRIORITY — every real keyword overlap in COVERAGE_CATEGORY_KEYWORDS resolves to exactly one category, never both", () => {
  test("Hellish Rebuke (Damage Single Target + Reactions) lands only in Reactions", () => {
    const c = makeCharacter({ name: "A", knownSpells: [{ id: "s1", name: "Hellish Rebuke", level: 1, source: "Class" }] });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Reactions.map((e) => e.name)).toContain("Hellish Rebuke");
    expect(coverage["Damage Single Target"].map((e) => e.name)).not.toContain("Hellish Rebuke");
  });

  test("Shield (Protection + Reactions) lands only in Reactions", () => {
    const c = makeCharacter({ name: "A", knownSpells: [{ id: "s1", name: "Shield", level: 1, source: "Class" }] });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Reactions.map((e) => e.name)).toContain("Shield");
    expect(coverage.Protection.map((e) => e.name)).not.toContain("Shield");
  });

  test("Counterspell (Reactions + Anti-Magic) lands only in Reactions", () => {
    const c = makeCharacter({ name: "A", knownSpells: [{ id: "s1", name: "Counterspell", level: 3, source: "Class" }] });
    const coverage = computeResourceCoverage([c]);
    expect(coverage.Reactions.map((e) => e.name)).toContain("Counterspell");
    expect(coverage["Anti-Magic"].map((e) => e.name)).not.toContain("Counterspell");
  });

  test("no spell or feature entry ever appears in more than one coverage category", () => {
    const c = makeCharacter({
      name: "A",
      knownSpells: [
        { id: "s1", name: "Hellish Rebuke", level: 1, source: "Class" },
        { id: "s2", name: "Shield", level: 1, source: "Class" },
        { id: "s3", name: "Counterspell", level: 3, source: "Class" },
      ],
    });
    const coverage = computeResourceCoverage([c]);
    const nameCounts = new Map<string, number>();
    for (const [category, entries] of Object.entries(coverage)) {
      if (category === "Resources") continue;
      for (const entry of entries) nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);
    }
    for (const [name, count] of nameCounts) expect(count, `${name} appeared in ${count} categories`).toBe(1);
  });
});
