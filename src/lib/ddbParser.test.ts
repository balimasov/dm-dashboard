import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseDdbCharacter } from "./ddbParser";
import { Character } from "./types";
import { formatModifier } from "./format";
import { savingThrowBonus } from "./characterMath";

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

describe("Armor Class", () => {
  test("Fighter (Eldritch Knight 20) — Fighting Style: Defense's +1 AC (armored-armor-class, not the plain armor-class subtype) is included", () => {
    const c = load("fighter-eldritch-knight-20");
    expect(c.combat.ac).toBe(17); // 16 (Chain Mail) + 1 (Defense) — matches this character's real D&D Beyond sheet.
  });

  test("Paladin (Oath of Vengeance 20, Medium armor, Dex +4) — Medium Armor Master raises the Medium-armor Dex cap from +2 to +3 (ac-max-dex-armored-modifier), not the plain default", () => {
    const c = load("paladin-oath-of-vengeance-20");
    expect(c.combat.ac).toBe(21); // 15 (Enspelled Half Plate) + 3 (Dex, capped by Medium Armor Master not +2) + 2 (Shield) + 1 (Fighting Style: Defense) — matches this character's real D&D Beyond sheet.
  });
});

describe("Saving Throws", () => {
  test("Paladin (Oath of Vengeance 20) — Aura of Protection (blanket bonus = Charisma modifier) is added to all six saves, not just the two she's proficient in", () => {
    const c = load("paladin-oath-of-vengeance-20");
    // Real D&D Beyond sheet: STR +5, DEX +6, CON +4, INT +1, WIS +9, CHA +10 —
    // each exactly 2 (her Charisma modifier) above the plain ability-mod/
    // proficiency total, confirming the aura applies uniformly to every save.
    expect(savingThrowBonus(c, "str")).toBe(5);
    expect(savingThrowBonus(c, "dex")).toBe(6);
    expect(savingThrowBonus(c, "con")).toBe(4);
    expect(savingThrowBonus(c, "int")).toBe(1);
    expect(savingThrowBonus(c, "wis")).toBe(9);
    expect(savingThrowBonus(c, "cha")).toBe(10);
  });
});

describe("half-proficiency (Jack of All Trades) passive senses", () => {
  test("Esmeralda (Bard 5) — blanket half-proficiency grant raises all three passives by +1", () => {
    const c = load("esmeralda-bard");
    expect(c.combat.passivePerception).toBe(11);
    expect(c.combat.passiveInvestigation).toBe(12);
    expect(c.combat.passiveInsight).toBe(11);
  });
});

describe("ability scores — a 2014-ruleset race's flat racial ASI stays isGranted:true even when superseded", () => {
  test("Esmeralda (Tiefling/Criminal) — the Tiefling's +1 Int/+2 Cha racial trait doesn't stack with the Criminal background's own (2024-style) ability score improvements, matching her real D&D Beyond sheet (STR 9, DEX 16, CON 15, INT 12, WIS 10, CHA 18)", () => {
    const c = load("esmeralda-bard");
    expect(c.stats).toEqual({ str: 9, dex: 16, con: 15, int: 12, wis: 10, cha: 18 });
    expect(c.combat.ac).toBe(17);
    expect(c.initiative).toBe(6);
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

describe("prepared-spellbook casters (spellPrepareType 1) show only what's actually prepared, not the whole spellbook", () => {
  test("Wizard (Diviner 20) — Feather Fall/Thunderwave sit in her spellbook (countsAsKnownSpell) but aren't prepared today, so they're excluded; Mage Armor/Magic Missile/Sleep/Detect Magic (prepared: true) are included; her cantrips (Ray of Frost/Light/Mage Hand — never need preparing) show regardless of their own prepared: false", () => {
    const c = load("wizard-diviner-20");
    const names = c.knownSpells.map((s) => s.name).sort();
    expect(names).not.toContain("Feather Fall");
    expect(names).not.toContain("Thunderwave");
    expect(names).toEqual(
      expect.arrayContaining(["Mage Armor", "Magic Missile", "Sleep", "Detect Magic", "Ray of Frost", "Light", "Mage Hand"])
    );
  });

  test("Sorcerer (a known-spell caster, spellPrepareType not 1) is unaffected — every classSpells entry has prepared: false on a real export since the field is never toggled for her, so countsAsKnownSpell alone still includes the whole list", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Fireball", "Counterspell", "Misty Step", "Shield"])
    );
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
      weaponType: "Scimitar",
      rarity: "Common",
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
      attackBonus: 4, // dex +3 (Finesse) + magic +1, no proficiency bonus
      damage: "1d8 +4",
      category: "Martial",
      range: "5 ft.",
      proficient: false,
      weaponType: "Rapier",
      rarity: "Uncommon",
      description: "You have a +1 bonus to attack and damage rolls made with this magic weapon.",
    });
    expect(rapier.mastery).toBeUndefined(); // weapon's own property is Vex, but a Bard never unlocks Weapon Mastery

    const crossbow = c.attacks.find((a) => a.name === "Crossbow, Hand")!;
    expect(crossbow).toMatchObject({
      attackType: "ranged",
      attackBonus: 3, // dex +3 only, not proficient with a Martial weapon
      damage: "1d6 +3",
      category: "Martial",
      range: "30/120 ft.",
      proficient: false,
    });
    expect(crossbow.mastery).toBeUndefined();

    const dagger = c.attacks.find((a) => a.name === "Dagger")!;
    expect(dagger).toMatchObject({
      attackBonus: 6, // dex +3 (Finesse) + proficiency +3 (Simple weapon)
      damage: "1d4 +3",
      category: "Simple",
      range: "20/60 ft.", // Thrown
      proficient: true,
    });
    expect(dagger.mastery).toBeUndefined();
  });

  test("Yorun (Sorcerer 5, Str 8) — an equipped Staff (Ferol's Staff of Acid) has no weapon stats of its own on D&D Beyond, but is wielded per the 2024 PHB rule as a Quarterstaff: Simple, Versatile, proficient via her class's Simple Weapons grant, Str modifier (not spellcasting) sets the bonus", () => {
    const c = load("yorun-all-immunities");
    const staff = c.attacks.find((a) => a.name === "Ferol’s Staff of Acid")!;
    expect(staff).toBeDefined();
    expect(staff).toMatchObject({
      attackType: "melee",
      attackBonus: 2, // str -1 + proficiency +3 (Simple Weapons)
      damage: "1d6 -1",
      damageType: "Bludgeoning",
      properties: ["Versatile"],
      category: "Simple",
      range: "5 ft.",
      proficient: true,
      weaponType: "Quarterstaff",
      rarity: "Rare",
    });
  });

  test("Paladin (Oath of Vengeance 20, Str +3) — the Thrown Weapon Fighting style's +2 damage lands on the Javelin (has the Thrown property) but not the Longsword or Sickle (don't), matching D&D Beyond's own Actions tab (Javelin 1d6+5, Longsword 1d8+3, Sickle 1d4+3)", () => {
    const c = load("paladin-oath-of-vengeance-20");
    expect(c.attacks.find((a) => a.name === "Javelin")).toMatchObject({ attackBonus: 9, damage: "1d6 +5" });
    expect(c.attacks.find((a) => a.name === "Longsword")).toMatchObject({ attackBonus: 9, damage: "1d8 +3" });
    expect(c.attacks.find((a) => a.name === "Sickle")).toMatchObject({ attackBonus: 9, damage: "1d4 +3" });
  });

  test("Monk (Warrior of the Open Hand 20, unarmored, Dex +6) — Martial Arts' Dexterous Attacks + the level-20 1d12 Martial Arts die apply to every equipped Monk weapon (Simple Melee Club/Dagger/Spear), not just the ones that also happen to have Finesse, matching D&D Beyond's own Actions tab (all four at +12, 1d12+6)", () => {
    const c = load("monk-warrior-open-hand-20");
    for (const name of ["Club", "Dagger", "Spear"]) {
      const attack = c.attacks.find((a) => a.name === name)!;
      expect(attack, name).toMatchObject({
        attackType: "melee",
        attackBonus: 12, // dex +6 + proficiency +6
        damage: "1d12 +6",
        category: "Simple",
        proficient: true,
      });
    }
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
    expect(unarmed.weaponType).toBeUndefined(); // a natural attack, not an actual weapon
    expect(unarmed.rarity).toBeUndefined();
    expect(unarmed.description).toBeUndefined();
  });

  test("Chem (Monk 8, has the Tavern Brawler feat, unarmored) — D&D Beyond's resolved 'Enhanced Unarmed Strike' action (1d4, Str-based) is only the feat's own raw baseline; Martial Arts still stacks on top (Dexterous Attacks + the level-8 1d8 Martial Arts die beats the feat's 1d4)", () => {
    const c = load("chem-monk");
    // Named "Enhanced Unarmed Strike", not "Unarmed Strike" — it's the feat's
    // own resolved action, and D&D Beyond lists it as its own separate row.
    const unarmed = c.attacks.find((a) => a.name === "Enhanced Unarmed Strike")!;
    expect(unarmed).toMatchObject({
      attackType: "melee",
      attackBonus: 6, // dex +3 (Martial Arts' Dexterous Attacks beats str +1) + proficiency +3
      damage: "1d8 +3", // Martial Arts die at level 8 (1d8) beats the feat's own 1d4
      damageType: "Bludgeoning",
      proficient: true,
    });
  });

  test("Monk (Warrior of the Open Hand 20, unarmored, Dex +6) — the resolved 'Enhanced Unarmed Strike' action's numbers get Martial Arts applied on top, matching D&D Beyond's own displayed +12, 1d12+6, not the feat's own raw 1d4/Str baseline", () => {
    const c = load("monk-warrior-open-hand-20");
    const unarmed = c.attacks.find((a) => a.name === "Enhanced Unarmed Strike")!;
    expect(unarmed).toMatchObject({
      attackType: "melee",
      attackBonus: 12, // dex +6 + proficiency +6
      damage: "1d12 +6",
      damageType: "Bludgeoning",
      proficient: true,
    });
  });

  test("Warlock (Fiend Patron 20, Tavern Brawler, Str -1, not a Monk) — the resolved unarmed-strike entry keeps the feat's own name 'Enhanced Unarmed Strike' instead of being relabeled 'Unarmed Strike', matching D&D Beyond's Actions tab where both are separate rows", () => {
    const c = load("warlock-fiend-patron-20");
    expect(c.attacks.find((a) => a.name === "Enhanced Unarmed Strike")).toMatchObject({
      attackType: "melee",
      attackBonus: 5, // str -1 + proficiency +6
      damage: "1d4 -1",
      damageType: "Bludgeoning",
      proficient: true,
    });
    // No separate plain "Unarmed Strike" row — this app shows one row per
    // unarmed strike (the character's best resolved option), not every
    // variant D&D Beyond lists.
    expect(c.attacks.find((a) => a.name === "Unarmed Strike")).toBeUndefined();
  });
});

describe("spell tags/isAreaEffect/isReaction/isConcentration — Party Toolkit coverage categorization signals", () => {
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

  test("Bless (a concentration spell) is flagged isConcentration (durationType 'Concentration')", () => {
    const c = load("durgin-cleric");
    expect(c.knownSpells.find((s) => s.name === "Bless")?.isConcentration).toBe(true);
  });

  test("Fireball (instantaneous, not concentration) has no isConcentration flag", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.find((s) => s.name === "Fireball")?.isConcentration).toBeUndefined();
  });

  test("Detect Magic (Wizard, Diviner 20) is flagged isRitual (definition.ritual: true) — also still concentration, both at once", () => {
    const c = load("wizard-diviner-20");
    const detectMagic = c.knownSpells.find((s) => s.name === "Detect Magic");
    expect(detectMagic?.isRitual).toBe(true);
    expect(detectMagic?.isConcentration).toBe(true);
  });

  test("Fireball (not a ritual) has no isRitual flag", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.find((s) => s.name === "Fireball")?.isRitual).toBeUndefined();
  });
});

describe("spell hint fields (castingTime/range/hitOrDc/effect/duration) — matches D&D Beyond's own Time/Range/Hit-DC/Effect/Notes columns", () => {
  test("Fireball: 1 action, ranged+AOE, save DC, damage dice, instantaneous", () => {
    const c = load("yorun-all-immunities");
    const fireball = c.knownSpells.find((s) => s.name === "Fireball");
    expect(fireball?.castingTime).toBe("1 action");
    expect(fireball?.range).toBe("150 ft. (20 ft. Sphere)");
    expect(fireball?.hitOrDc).toBe(`DC ${c.spellcasting!.saveDc} DEX`);
    expect(fireball?.effect).toBe("8d6");
    expect(fireball?.effectType).toBe("Fire");
    expect(fireball?.duration).toBe("Instantaneous");
  });

  test("Fire Bolt: attack roll instead of a save DC", () => {
    const c = load("yorun-all-immunities");
    const fireBolt = c.knownSpells.find((s) => s.name === "Fire Bolt");
    expect(fireBolt?.hitOrDc).toBe(formatModifier(c.spellcasting!.attack));
  });

  test("Fire Bolt: cantrip damage scales with character level (1d10 base -> 2d10 at level 5), not stuck at its level-1 die", () => {
    const c = load("yorun-all-immunities");
    expect(c.level).toBe(5);
    const fireBolt = c.knownSpells.find((s) => s.name === "Fire Bolt");
    expect(fireBolt?.effect).toBe("2d10");
    expect(fireBolt?.effectType).toBe("Fire");
  });

  test("Insect Plague (a 5th-level spell, not a cantrip): stays its own base 4d10, not misread as its upcast-per-slot-level table (which starts '{level: 1, dice: 1d10}' — that '1' means 'per slot level above base', not 'character level 1')", () => {
    const c = load("durgin-cleric");
    const insectPlague = c.knownSpells.find((s) => s.name === "Insect Plague");
    expect(insectPlague?.effect).toBe("4d10");
    expect(insectPlague?.effectType).toBe("Piercing");
  });

  test("Cure Wounds: touch range, healing dice fall back to a plain 'Healing' label", () => {
    const c = load("durgin-cleric");
    const cureWounds = c.knownSpells.find((s) => s.name === "Cure Wounds");
    expect(cureWounds?.range).toBe("Touch");
    expect(cureWounds?.effect).toBe("2d8");
    expect(cureWounds?.effectType).toBe("Healing");
    expect(cureWounds?.duration).toBe("Instantaneous");
  });

  test("Shield: reaction casting time, no dice-based effect falls back to its own D&D Beyond tag", () => {
    const c = load("yorun-all-immunities");
    const shield = c.knownSpells.find((s) => s.name === "Shield");
    expect(shield?.castingTime).toBe("1 reaction");
    expect(shield?.effect).toBeTruthy();
    expect(shield?.effectType).toBeUndefined();
  });

  test("Bless: concentration duration formatted as 'Concentration, up to 1 minute'", () => {
    const c = load("durgin-cleric");
    expect(c.knownSpells.find((s) => s.name === "Bless")?.duration).toBe("Concentration, up to 1 minute");
  });
});

describe("spell/resource source resolves to the specific granting feature (buildComponentSourceIndex)", () => {
  test("a normal class-list spell (componentId 0) keeps the plain 'Class' source", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.find((s) => s.name === "Fireball")?.source).toBe("Class");
  });

  test("a subclass-granted bonus spell resolves to 'Class (Spellfire Spells)', matching D&D Beyond's own spell list", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.find((s) => s.name === "Cure Wounds")?.source).toBe("Class (Spellfire Spells)");
  });

  test("a racial bonus spell resolves through the option indirection to 'Race (Elven Lineage Spells)'", () => {
    const c = load("yorun-all-immunities");
    const mistyStep = c.knownSpells.filter((s) => s.name === "Misty Step");
    expect(mistyStep.some((s) => s.source === "Species (Elven Lineage Spells)")).toBe(true);
  });

  test("an item-granted spell (no matching racial trait/class feature/feat) keeps the plain 'Item' source", () => {
    const c = load("yorun-all-immunities");
    expect(c.knownSpells.find((s) => s.name === "Melf's Acid Arrow")?.source).toBe("Item");
  });

  test("a charge-pool resource resolves the same way — 'Class (Font of Magic)', not just 'Class'", () => {
    const c = load("yorun-all-immunities");
    expect(c.resources.find((r) => r.name === "Font of Magic: Sorcery Points")?.source).toBe("Class (Font of Magic)");
  });

  test("the racial spell's own charge-pool resource resolves to 'Race (Elven Lineage Spells)' too", () => {
    const c = load("yorun-all-immunities");
    expect(c.resources.find((r) => r.name === "Detect Magic (1st)")?.source).toBe("Species (Elven Lineage Spells)");
  });
});

describe("Feature.source is always 'Category' or 'Category (Specific)' — formatSource keeps it uniform", () => {
  test("a top-level racial trait (no more specific parent than itself) is the bare category", () => {
    const c = load("yorun-all-immunities");
    expect(c.features.find((f) => f.name === "Darkvision")?.source).toBe("Species");
  });

  test("a top-level feat reads 'Feat (Origin)', its own category folded into the same 'Category (Specific)' grammar", () => {
    const c = load("yorun-all-immunities");
    expect(c.features.find((f) => f.name === "Skilled")?.source).toBe("Feat (Origin)");
  });

  test("a base-class feature reads 'Class (Sorcerer)', not the bare class name replacing the category", () => {
    const c = load("yorun-all-immunities");
    expect(c.features.find((f) => f.name === "Font of Magic")?.source).toBe("Class (Sorcerer)");
  });

  test("a subclass feature reads 'Class (Spellfire Sorcery)'", () => {
    const c = load("yorun-all-immunities");
    expect(c.features.find((f) => f.name === "Spellfire Burst")?.source).toBe("Class (Spellfire Sorcery)");
  });

  test("an action whose componentId resolves back to its own granting feature (no more specific grantor exists) collapses to the bare 'Class', not a self-duplicating 'Class (Innate Sorcery)'", () => {
    const c = load("yorun-all-immunities");
    expect(c.features.find((f) => f.name === "Innate Sorcery")?.source).toBe("Class");
    expect(c.features.find((f) => f.name === "Sorcerous Restoration")?.source).toBe("Class");
  });

  test("a chosen option under a racial lineage reads 'Species (Elven Lineage)'; one whose real parent D&D Beyond itself hides doesn't survive at all", () => {
    const c = load("yorun-all-immunities");
    expect(c.features.find((f) => f.name === "High Elf Lineage")?.source).toBe("Species (Elven Lineage)");
    // "High Elf - Intelligence"'s real componentId parent is "Elven Lineage
    // Spells" — a racialTrait D&D Beyond itself flags `hideOnDetailsPage`
    // (never meant to be seen), so this option is filtered right alongside
    // it rather than surviving as an orphan with a parent link nothing can
    // resolve (see `hiddenParentIds` in ddbParser/features.ts).
    expect(c.features.find((f) => f.name === "High Elf - Intelligence")).toBeUndefined();
  });

  test("a feat-granted option reads 'Feat (Skilled)'", () => {
    const c = load("yorun-all-immunities");
    expect(c.features.find((f) => f.name === "Increase two scores (+2 / +1)")?.source).toBe("Feat (Skilled)");
  });
});

describe("a feat's own category folds into Feature.source as 'Feat (Kind)'; featPrerequisite carries the qualifier, if any", () => {
  test("an Origin feat with no prerequisite (Skilled) reads 'Feat (Origin)' and has no featPrerequisite", () => {
    const c = load("yorun-all-immunities");
    const skilled = c.features.find((f) => f.name === "Skilled");
    expect(skilled?.source).toBe("Feat (Origin)");
    expect(skilled?.featPrerequisite).toBeUndefined();
  });

  test("a General feat with a prerequisite (War Caster) reads 'Feat (General)', prerequisite split into its own field", () => {
    const c = load("yorun-all-immunities");
    const warCaster = c.features.find((f) => f.name === "War Caster");
    expect(warCaster?.source).toBe("Feat (General)");
    expect(warCaster?.featPrerequisite).toBe("Level 4+ Spellcasting or Pact Magic Feature");
  });
});

describe("a background's baked-in ASI placeholder (__INITIAL_ASI, e.g. 'Soldier Ability Score Improvements') is dropped entirely", () => {
  test("Alor's Feat Features has no 'Soldier Ability Score Improvements' entry — confirmed absent from D&D Beyond's own Feats tab too, unlike the real feats it grants (Blind Fighting/Two-Weapon Fighting/Savage Attacker)", () => {
    const c = load("alor-fighter");
    expect(c.features.find((f) => f.name === "Soldier Ability Score Improvements")).toBeUndefined();
    expect(c.features.find((f) => f.name === "Savage Attacker")).toBeDefined();
  });

  test("the actual ASI choice still surfaces, nested under the origin feat it's attached to, unaffected by the __INITIAL_ASI filter", () => {
    const c = load("alor-fighter");
    const increase = c.features.find((f) => f.name === "Increase two scores (+2 / +1)");
    expect(increase?.parentFeatureName).toBe("Savage Attacker");
  });
});

describe("non-feat entries D&D Beyond stuffs into its feats array anyway (__DISGUISE_FEAT) are dropped, same as D&D Beyond's own Feats tab", () => {
  test("a level-20 pre-built character's companion widgets (Dark Bargain/Character Threads/Runestones) never surface as feats — confirmed absent from that character's real D&D Beyond Feats tab", () => {
    const c = load("artificer-battle-smith-20");
    expect(c.features.find((f) => f.name === "Dark Bargain")).toBeUndefined();
    expect(c.features.find((f) => f.name === "Character Threads")).toBeUndefined();
    expect(c.features.find((f) => f.name === "Runestones")).toBeUndefined();
  });

  test("Alor's disguised duplicate of his own real class feature ('4: Weapon Mastery' stored feat-shaped) doesn't shadow the real one", () => {
    const c = load("alor-fighter");
    const weaponMastery = c.features.filter((f) => f.name === "4: Weapon Mastery");
    expect(weaponMastery).toHaveLength(1);
    expect(weaponMastery[0].source).toBe("Class (Fighter)");
  });
});

describe("cleanRulesText preserves paragraph breaks in a plain-text snippet (no <p>/<br> markup)", () => {
  test("War Caster's four bold sub-effects stay on separate paragraphs, not one run-on wall of text", () => {
    const c = load("yorun-all-immunities");
    const warCaster = c.features.find((f) => f.name === "War Caster");
    expect(warCaster?.description).toBe(
      "**Ability Score Increase.** Increase your Int., Wis., or Cha. by 1.\n\n" +
        "**Concentration.** You have Advantage on Con. saving throws to maintain Concentration.\n\n" +
        "**Reactive Spell.** When a creature provokes an Opportunity Attack from you by leaving your reach, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack. This spell must have a casting time of one action and must target only that creature.\n\n" +
        "**Somatic Components.** You can perform the Somatic components of spells even when you have weapons or a Shield in one or both hands."
    );
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

  test("Esmeralda (Bard) — Thieves' Tools and her three musical instruments are all isGranted:false but resolved choices, so all four are included", () => {
    const c = load("esmeralda-bard");
    expect(c.languages).toEqual(["Common", "Infernal"]);
    expect(c.toolProficiencies).toEqual(["Drum", "Horn", "Lute", "Thieves' Tools"]);
  });

  test("Alor (Fighter) — two resolved 'Select a Standard Language' choices (Elvish, Common Sign Language) both show isGranted:false despite being genuinely picked", () => {
    const c = load("alor-fighter");
    expect(c.languages).toEqual(["Common", "Common Sign Language", "Elvish"]);
  });
});

describe("armor and weapon proficiencies", () => {
  test("Fighter (Eldritch Knight 20) — the 4 armor categories and 2 weapon categories a Fighter gets, nothing else", () => {
    const c = load("fighter-eldritch-knight-20");
    expect(c.armorProficiencies).toEqual(["Heavy Armor", "Light Armor", "Medium Armor", "Shields"]);
    expect(c.weaponProficiencies).toEqual(["Martial Weapons", "Simple Weapons"]);
  });

  test("Tarah (Rogue) — individual named weapons (Drow Weapon Training) alongside the standard Simple Weapons category, determined by exclusion rather than a hardcoded weapon list", () => {
    const c = load("tarah-rogue");
    expect(c.weaponProficiencies).toEqual(
      expect.arrayContaining(["Simple Weapons", "Rapier", "Scimitar", "Shortsword", "Whip", "Crossbow, Hand"])
    );
    expect(c.armorProficiencies).toEqual(["Light Armor"]);
  });
});

describe("inventory item type/weight/cost", () => {
  test("Durgin (Cleric) — Potion of Healing carries D&D Beyond's own subtype and weight, no invented cost when D&D Beyond has none on file", () => {
    const c = load("durgin-cleric");
    const potion = c.inventory.find((i) => i.name === "Potion of Healing");
    expect(potion?.type).toBe("Potion");
    expect(potion?.weight).toBe(0.5);
    expect(potion?.cost).toBeUndefined();
  });

  test("a priced item (Breastplate, real cost on file) carries its cost through", () => {
    const c = load("esmeralda-bard");
    const breastplate = c.inventory.find((i) => i.name === "Breastplate");
    expect(breastplate?.cost).toBe(400);
  });
});

describe("custom conditions survive a sync", () => {
  test("a previously added custom condition is still present after syncing fresh D&D Beyond data — not a D&D Beyond concept, so nothing here computes it, but the sync must not silently drop it either", () => {
    const raw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "esmeralda-bard.json"), "utf8"));
    const existing = load("esmeralda-bard");
    const withCustom: Character = {
      ...existing,
      combat: {
        ...existing.combat,
        customConditionIds: ["cb"],
      },
    };

    const resynced = parseDdbCharacter(raw, withCustom);

    expect(resynced.combat.customConditionIds).toEqual(["cb"]);
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
    expect(Array.isArray(c.armorProficiencies)).toBe(true);
    expect(Array.isArray(c.weaponProficiencies)).toBe(true);
  });
});
