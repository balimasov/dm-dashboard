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

describe("languages and tool proficiencies — both respect isGranted, unlike skills", () => {
  test("Lori (Artificer) — Void Speech is an unchosen pool option, Smith's Tools/Cook's Utensils weren't picked", () => {
    const c = load("lori-artificer");
    expect(c.languages).toEqual(["Common", "Draconic"]);
    expect(c.toolProficiencies).toEqual(["Thieves' Tools", "Tinker's Tools"]);
  });

  test("Tarah (Rogue) — Thieves' Cant is a language, not a tool; Aglarondan/Chessentan/Undercommon weren't chosen", () => {
    const c = load("tarah-rogue");
    expect(c.languages).toEqual(["Common", "Thieves’ Cant"]);
    expect(c.toolProficiencies).toEqual(["Thieves' Tools"]);
  });

  test("Esmeralda (Bard) — Thieves' Tools shows up ungranted in her pool, so it's excluded", () => {
    const c = load("esmeralda-bard");
    expect(c.languages).toEqual(["Common", "Infernal"]);
    expect(c.toolProficiencies).toEqual([]);
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
