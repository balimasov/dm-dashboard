import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseDdbCharacter } from "./ddbParser";
import { Character } from "./types";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");
const blank = { id: "x", campaignId: "x", name: "" } as unknown as Character;

function load(name: string) {
  const raw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), "utf8"));
  return parseDdbCharacter(raw, blank);
}

// Each case below is a real D&D Beyond export that surfaced a genuine parsing
// bug this project shipped a fix for — these numbers are the confirmed
// correct values (cross-checked against the character's real D&D Beyond
// sheet at the time), not just "whatever the code currently outputs".

describe("half-proficiency (Jack of All Trades) passive senses", () => {
  test("Esmeralda (Bard 5) — blanket half-proficiency grant raises all three passives by +1", () => {
    const c = load("esmeralda-bard");
    expect(c.combat.passivePerception).toBe(11);
    expect(c.combat.passiveInvestigation).toBe(12);
    expect(c.combat.passiveInsight).toBe(11);
  });
});

describe("solo-caster spell slots", () => {
  test("Lori (Artificer 8, solo) — multiClassSpellSlotDivisor must not apply to a single-class caster", () => {
    const c = load("lori-artificer");
    expect(c.spellSlots).toEqual([
      { level: 1, current: 4, max: 4 },
      { level: 2, current: 3, max: 3 },
    ]);
  });

  test("Durgin (Cleric 20) — full 9-level slot table", () => {
    const c = load("durgin-cleric");
    expect(c.spellSlots.map((s) => s.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(c.spellSlots.find((s) => s.level === 9)).toEqual({ level: 9, current: 1, max: 1 });
  });
});

describe("dual-mode spells (charge-based cast + spell-slot cast of the same spell)", () => {
  test("Durgin and Tarah both know Misty Step twice — once as a charge, once as a slot spell", () => {
    expect(load("durgin-cleric").knownSpells.filter((s) => s.name === "Misty Step")).toHaveLength(2);
    expect(load("tarah-rogue").knownSpells.filter((s) => s.name === "Misty Step")).toHaveLength(2);
  });

  test("Alor (Fighter 5, non-caster) — the spell-slot variant is dropped since he has no spell slots at all", () => {
    const c = load("alor-fighter");
    expect(c.spellSlots).toEqual([]);
    // Dancing Lights (at-will), Faerie Fire (1/day), Darkness (1/day) — exactly one entry each.
    expect(c.knownSpells.map((s) => s.name).sort()).toEqual(["Dancing Lights", "Darkness", "Faerie Fire"]);
  });
});

describe("non-caster classes", () => {
  test("Chem (Monk 8) — no spell slots, no known spells, no crash", () => {
    const c = load("chem-monk");
    expect(c.spellSlots).toEqual([]);
    expect(c.knownSpells).toEqual([]);
  });
});

describe("weapon attacks (Combat tab) — equipped, non-spell", () => {
  test("Alor (Fighter 5, computed Dex 18) — martial-weapons proficiency covers Scimitar/Shortsword/Longbow, Finesse picks the better modifier, unequipped Spear/Whisper of the Underdark are excluded, Weapon Mastery is unlocked via his Fighter feat's actions/options entries", () => {
    const c = load("alor-fighter");
    expect(c.attacks.map((a) => a.name).sort()).toEqual(["Longbow", "Scimitar", "Shortsword", "Unarmed Strike"]);
    expect(c.stats.dex).toBe(18); // confirms the +4 modifier the rest of this test relies on

    const scimitar = c.attacks.find((a) => a.name === "Scimitar")!;
    expect(scimitar).toMatchObject({
      attackType: "melee",
      attackBonus: 7, // dex +4 (Finesse beats str +2) + proficiency +3
      damage: "1d6 +4",
      damageType: "Slashing",
      properties: ["Finesse", "Light"],
      mastery: "Nick",
      category: "Martial",
      range: "5 ft.", // no Reach property
      proficient: true,
    });

    const longbow = c.attacks.find((a) => a.name === "Longbow")!;
    expect(longbow).toMatchObject({
      attackType: "ranged",
      attackBonus: 7, // dex +4 + proficiency +3
      damage: "1d8 +4",
      properties: ["Ammunition", "Heavy", "Range", "Two-Handed"],
      mastery: "Slow",
      category: "Martial",
      range: "150/600 ft.",
      proficient: true,
    });
  });

  test("Esmeralda (Bard 5, only Simple Weapons proficiency, no Weapon Mastery feature at all) — Rapier/Crossbow are martial and unproficient (ability mod only), Dagger is simple and proficient, +1 Rapier's magic bonus lands on both attack and damage, and none of the three show a mastery badge despite each weapon's own canonical mastery property existing in the raw data", () => {
    const c = load("esmeralda-bard");
    expect(c.attacks.map((a) => a.name).sort()).toEqual(["Crossbow, Hand", "Dagger", "Rapier, +1", "Unarmed Strike"]);

    const rapier = c.attacks.find((a) => a.name === "Rapier, +1")!;
    expect(rapier).toMatchObject({
      attackType: "melee",
      attackBonus: 3, // dex +2 (Finesse) + magic +1, no proficiency bonus
      damage: "1d8 +3",
      category: "Martial",
      range: "5 ft.",
      proficient: false,
    });
    expect(rapier.mastery).toBeUndefined(); // weapon's own property is Vex, but a Bard never unlocks Weapon Mastery

    const crossbow = c.attacks.find((a) => a.name === "Crossbow, Hand")!;
    expect(crossbow).toMatchObject({
      attackType: "ranged",
      attackBonus: 2, // dex +2 only, not proficient with a Martial weapon
      damage: "1d6 +2",
      category: "Martial",
      range: "30/120 ft.",
      proficient: false,
    });
    expect(crossbow.mastery).toBeUndefined();

    const dagger = c.attacks.find((a) => a.name === "Dagger")!;
    expect(dagger).toMatchObject({
      attackBonus: 5, // dex +2 (Finesse) + proficiency +3 (Simple weapon)
      damage: "1d4 +2",
      category: "Simple",
      range: "20/60 ft.", // Thrown
      proficient: true,
    });
    expect(dagger.mastery).toBeUndefined();
  });
});

describe("Unarmed Strike — always present, computed without needing weapon data", () => {
  test("Alor (Fighter 5, Str 14) — 2024 baseline: 1 + Str modifier Bludgeoning, always proficient", () => {
    const c = load("alor-fighter");
    const unarmed = c.attacks.find((a) => a.name === "Unarmed Strike")!;
    expect(unarmed).toMatchObject({
      attackType: "melee",
      attackBonus: 5, // str +2 + proficiency +3
      damage: "3", // 1 + str +2
      damageType: "Bludgeoning",
      properties: [],
      range: "5 ft.",
      proficient: true,
    });
  });

  test("Chem (Monk 8, has the Tavern Brawler feat, Str 12) — D&D Beyond's resolved 'Enhanced Unarmed Strike' action (1d4, Str-based) replaces the flat baseline", () => {
    const c = load("chem-monk");
    const unarmed = c.attacks.find((a) => a.name === "Unarmed Strike")!;
    expect(unarmed).toMatchObject({
      attackType: "melee",
      attackBonus: 4, // str +1 + proficiency +3
      damage: "1d4 +1",
      damageType: "Bludgeoning",
      proficient: true,
    });
  });
});

describe("spell tags/isAreaEffect/isReaction — Party Toolkit coverage categorization signals", () => {
  test("Fireball carries D&D Beyond's own Damage tag and is flagged area-effect (range.aoeType set)", () => {
    const c = load("yorun-all-immunities");
    const fireball = c.knownSpells.find((s) => s.name === "Fireball");
    expect(fireball?.tags).toEqual(["Damage"]);
    expect(fireball?.isAreaEffect).toBe(true);
  });

  test("Fire Bolt is Damage-tagged but not area-effect (single target — no aoeType)", () => {
    const c = load("yorun-all-immunities");
    const fireBolt = c.knownSpells.find((s) => s.name === "Fire Bolt");
    expect(fireBolt?.tags).toEqual(["Damage"]);
    expect(fireBolt?.isAreaEffect).toBeUndefined();
  });

  test("Inflict Wounds (touch, single-target) is Damage-tagged but not area-effect", () => {
    const c = load("durgin-cleric");
    const inflictWounds = c.knownSpells.find((s) => s.name === "Inflict Wounds");
    expect(inflictWounds?.tags).toEqual(["Damage"]);
    expect(inflictWounds?.isAreaEffect).toBeUndefined();
  });

  test("Shield and Counterspell are both flagged as reactions (activationType 4)", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.find((s) => s.name === "Shield")?.isReaction).toBe(true);
    expect(c.knownSpells.find((s) => s.name === "Counterspell")?.isReaction).toBe(true);
  });

  test("Fireball (a standard action, not a reaction) has no isReaction flag", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.find((s) => s.name === "Fireball")?.isReaction).toBeUndefined();
  });

  test("Cure Wounds carries the Healing tag", () => {
    const c = load("durgin-cleric");
    expect(c.knownSpells.find((s) => s.name === "Cure Wounds")?.tags).toEqual(["Healing"]);
  });
});

describe("custom defense adjustments (customDefenseAdjustments)", () => {
  test("Yorun with every entry in her Resistances picker added", () => {
    const c = load("yorun-all-resistances");
    expect(c.resistances).toHaveLength(25);
    expect(c.resistances).toContain("Fire");
    expect(c.resistances).toContain("Sneak Attack / Critical Hit Extra Damage");
    // Pre-existing entries untouched by this round.
    expect(c.immunities).toEqual(["Magical Sleep", "Radiant"]);
    expect(c.vulnerabilities).toEqual(["Lightning"]);
  });

  test("Yorun with every entry in her Immunities picker added — includes the 15 standard conditions (type 1)", () => {
    const c = load("yorun-all-immunities");
    expect(c.immunities).toHaveLength(32);
    expect(c.immunities).toEqual(
      expect.arrayContaining(["Blinded", "Charmed", "Deafened", "Poisoned", "Unconscious", "Bludgeoning", "Force"])
    );
    expect(c.resistances).toEqual([]);
    expect(c.vulnerabilities).toEqual([]);
  });

  test("Yorun with every entry in her Vulnerabilities picker added — basic 12 damage types plus item/spell-specific ones", () => {
    const c = load("yorun-all-vulnerabilities");
    expect(c.vulnerabilities).toHaveLength(15);
    expect(c.vulnerabilities).toEqual(
      expect.arrayContaining(["Bludgeoning", "Force", "Slashing from a Vorpal Sword"])
    );
  });
});

describe("languages and tool proficiencies — no isGranted filter, same reasoning as skills", () => {
  test("Lori (Artificer) — Void Speech, Smith's Tools, and Cook's Utensils are all isGranted:false but genuinely chosen (resolved 'choices' entries)", () => {
    const c = load("lori-artificer");
    expect(c.languages).toEqual(["Common", "Draconic", "Void Speech"]);
    expect(c.toolProficiencies).toEqual(["Cook's Utensils", "Smith's Tools", "Thieves' Tools", "Tinker's Tools"]);
  });

  test("Tarah (Rogue) — Thieves' Cant is a language, not a tool; Aglarondan/Chessentan/Undercommon/Cartographer's Tools are isGranted:false but resolved choices", () => {
    const c = load("tarah-rogue");
    expect(c.languages).toEqual(["Aglarondan", "Chessentan", "Common", "Thieves’ Cant", "Undercommon"]);
    expect(c.toolProficiencies).toEqual(["Cartographer's Tools", "Thieves' Tools"]);
  });

  test("Esmeralda (Bard) — Thieves' Tools is isGranted:false but a resolved choice, so it's included", () => {
    const c = load("esmeralda-bard");
    expect(c.languages).toEqual(["Common", "Infernal"]);
    expect(c.toolProficiencies).toEqual(["Thieves' Tools"]);
  });

  test("Alor (Fighter) — two resolved 'Select a Standard Language' choices (Elvish, Common Sign Language) both show isGranted:false despite being genuinely picked", () => {
    const c = load("alor-fighter");
    expect(c.languages).toEqual(["Common", "Common Sign Language", "Elvish"]);
  });
});

describe("regression baseline — every fixture parses without throwing and has sane shape", () => {
  const fixtures = fs.readdirSync(FIXTURES_DIR).map((f) => f.replace(/\.json$/, ""));

  test.each(fixtures)("%s", (name) => {
    const c = load(name);
    expect(c.name).toBeTruthy();
    expect(c.level).toBeGreaterThan(0);
    expect(Array.isArray(c.knownSpells)).toBe(true);
    expect(Array.isArray(c.spellSlots)).toBe(true);
    expect(Array.isArray(c.resistances)).toBe(true);
    expect(Array.isArray(c.immunities)).toBe(true);
    expect(Array.isArray(c.vulnerabilities)).toBe(true);
    expect(Array.isArray(c.languages)).toBe(true);
    expect(Array.isArray(c.toolProficiencies)).toBe(true);
  });
});
