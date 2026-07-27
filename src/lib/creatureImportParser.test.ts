import { describe, expect, test } from "vitest";
import { parseCreatureImportYaml } from "./creatureImportParser";
import { buildCreatureImportTemplate } from "./creatureImportTemplate";

describe("creature import template round-trip", () => {
  test("the generated template parses back into the exact example values with no errors", () => {
    const outcome = parseCreatureImportYaml(buildCreatureImportTemplate());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.warnings).toEqual([]);
    expect(outcome.result.input).toMatchObject({
      templateName: "Unicorn",
      name: "Thunder",
      ac: 12,
      hp: 67,
      maxHp: 67,
      speed: 50,
      proficiencyBonus: 3,
      stats: { str: 18, dex: 14, con: 15, int: 11, wis: 17, cha: 16 },
      savingThrows: { wis: 5 },
      spellcasting: {
        ability: "cha",
        saveDc: 15,
        attackBonus: 7,
        spellGroups: [
          { label: "At will", spells: ["Mage Hand", "Minor Illusion"] },
          { label: "3/day each", spells: ["Charm Person", "Invisibility"] },
        ],
      },
    });
    expect(outcome.result.input.traits).toHaveLength(7);
    expect(outcome.result.input.traits?.[1]).toMatchObject({
      name: "Hooves",
      attack: { attackType: "melee", attackBonus: 7, range: "5", damage: [{ dice: "2d6 +4", damageType: "bludgeoning" }] },
    });
    expect(outcome.result.input.traits?.[2]).toMatchObject({
      name: "Frost Touch",
      attack: { attackType: "melee", attackKind: "spell", attackBonus: 7, range: "5", damage: [{ dice: "3d6 +4", damageType: "necrotic" }] },
      save: { ability: "con", dc: 15 },
    });
    expect(outcome.result.input.traits?.[3]).toMatchObject({
      name: "Cold Breath",
      recharge: "Recharge 5-6",
      save: { ability: "con", dc: 15 },
      aoe: { shape: "cone", size: 30 },
    });
    expect(outcome.result.input.traits?.[4]).toMatchObject({
      name: "Frightful Presence",
      recharge: "Recharge 5-6",
      save: { ability: "wis", dc: 15 },
    });
    expect(outcome.result.input.traits?.[5]).toMatchObject({
      name: "Lay On Hooves",
      recharge: "1/Day",
      effects: [{ kind: "heal", amount: "6d8 +4" }],
    });
    expect(outcome.result.input.traits?.[6]).toMatchObject({
      name: "Cast a Spell",
      spell: "Suggestion",
    });
    // The template's owner-character field is intentionally left blank —
    // resolving a filled-in name to an id needs the campaign's character
    // list, which this data-only module never sees.
    expect(outcome.result.ownerCharacterName).toBeUndefined();
  });
});

describe("minimal valid input", () => {
  test("only the four truly required fields still imports cleanly, with sensible defaults for the rest", () => {
    const yaml = `
templateName: "Giant Rat"
ac: 12
maxHp: 7
speed: 30
stats:
  str: 7
  dex: 15
  con: 11
  int: 2
  wis: 10
  cha: 4
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.input.name).toBeUndefined();
    expect(outcome.result.input.hp).toBe(7); // hp always starts equal to maxHp on import, same as a fresh SRD add
    expect(outcome.result.input.traits).toEqual([]);
    expect(outcome.result.input.savingThrows).toBeUndefined();
  });
});

describe("invalid input surfaces every problem at once, not just the first", () => {
  test("missing required fields, a wrong-typed field, an incomplete stat block, and a bad trait group", () => {
    const yaml = `
templateName: ""
ac: notanumber
stats:
  str: 18
  dex: 14
savingThrows:
  wis: 5
  luck: 3
traits:
  - description: "no name here"
  - name: "Bite"
    group: "weird"
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"templateName"'),
        expect.stringContaining('"maxHp"'),
        expect.stringContaining('"speed"'),
        expect.stringContaining('"ac" має бути числом'),
        expect.stringContaining("con, int, wis, cha"),
        expect.stringContaining('невідому характеристику "luck"'),
        expect.stringContaining("traits[0].name"),
        expect.stringContaining("traits[1].group"),
      ])
    );
  });

  test("malformed YAML syntax produces a readable error instead of throwing", () => {
    const outcome = parseCreatureImportYaml("templateName: [unterminated");
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors[0]).toContain("YAML");
  });

  test("an empty file and a top-level list are both rejected with a clear reason", () => {
    expect(parseCreatureImportYaml("").ok).toBe(false);
    const listOutcome = parseCreatureImportYaml("- a\n- b\n");
    expect(listOutcome.ok).toBe(false);
    if (listOutcome.ok) return;
    expect(listOutcome.errors[0]).toContain("об'єктом");
  });
});

describe("unknown fields are a soft warning, not a hard error — likely a typo worth flagging either way", () => {
  test("a misspelled field name doesn't block a successful import but is reported", () => {
    const yaml = `
templateName: "Wolf"
ac: 13
maxHp: 11
speed: 40
stats:
  str: 12
  dex: 15
  con: 12
  int: 3
  wis: 12
  cha: 6
damageResistance: "Cold"
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.warnings).toEqual([expect.stringContaining('"damageResistance"')]);
  });
});

describe("backward compatibility — old files with none of the new structured fields", () => {
  test("a YAML saved before proficiencyBonus/attack/save/recharge/spellcasting existed still imports unchanged", () => {
    const yaml = `
templateName: "Giant Rat"
ac: 12
maxHp: 7
speed: 30
stats:
  str: 7
  dex: 15
  con: 11
  int: 2
  wis: 10
  cha: 4
traits:
  - name: "Keen Smell"
    group: "trait"
    description: "The rat has advantage on Wisdom (Perception) checks that rely on smell."
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.warnings).toEqual([]);
    expect(outcome.result.input.proficiencyBonus).toBeUndefined();
    expect(outcome.result.input.spellcasting).toBeUndefined();
    expect(outcome.result.input.traits).toEqual([
      { name: "Keen Smell", group: "trait", description: expect.any(String), recharge: undefined, attack: undefined, save: undefined },
    ]);
  });
});

describe("new structured fields — valid and invalid shapes", () => {
  test("a YAML using the pre-1.30 attack/spellcasting shape (bare-string damage + damageType sibling, range with 'ft.', flat spells lines) still imports, converted into the current shapes", () => {
    const yaml = `
templateName: "Young Sorcerer"
ac: 13
maxHp: 30
speed: 30
proficiencyBonus: 3
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Bite"
    group: "action"
    attack:
      attackType: melee
      attackBonus: 5
      range: "5 ft."
      damage: "1d6 +2"
      damageType: piercing
  - name: "Frightful Presence"
    group: "action"
    recharge: "Recharge 5-6"
    save:
      ability: wis
      dc: 13
spellcasting:
  ability: cha
  saveDc: 14
  attackBonus: 6
  spells:
    - "At will: fire bolt"
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.input.proficiencyBonus).toBe(3);
    expect(outcome.result.input.traits[0].attack).toEqual({
      attackType: "melee",
      attackBonus: 5,
      range: "5",
      damage: [{ dice: "1d6 +2", damageType: "piercing" }],
    });
    expect(outcome.result.input.traits[1].recharge).toBe("Recharge 5-6");
    expect(outcome.result.input.traits[1].save).toEqual({ ability: "wis", dc: 13 });
    expect(outcome.result.input.spellcasting).toEqual({
      ability: "cha",
      saveDc: 14,
      attackBonus: 6,
      spellGroups: [{ label: "At will", spells: ["fire bolt"] }],
    });
  });

  test("the current shapes — multi-roll damage, effects, and structured spellGroups — parse when well-formed", () => {
    const yaml = `
templateName: "Young Sorcerer"
ac: 13
maxHp: 30
speed: 30
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Flaming Bite"
    group: "action"
    attack:
      attackType: melee
      attackBonus: 5
      range: "5"
      damage:
        - dice: "1d6 +2"
          damageType: piercing
        - dice: "2d6"
          damageType: fire
  - name: "Lay On Hooves"
    group: "action"
    recharge: "1/Day"
    effects:
      - kind: heal
        amount: "6d8 +4"
spellcasting:
  ability: cha
  saveDc: 14
  attackBonus: 6
  spellGroups:
    - label: "At will"
      spells: ["Fire Bolt", "Mage Hand"]
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.input.traits[0].attack).toEqual({
      attackType: "melee",
      attackBonus: 5,
      range: "5",
      damage: [
        { dice: "1d6 +2", damageType: "piercing" },
        { dice: "2d6", damageType: "fire" },
      ],
    });
    expect(outcome.result.input.traits[1].effects).toEqual([{ kind: "heal", amount: "6d8 +4", label: undefined }]);
    expect(outcome.result.input.spellcasting).toEqual({
      ability: "cha",
      saveDc: 14,
      attackBonus: 6,
      spellGroups: [{ label: "At will", spells: ["Fire Bolt", "Mage Hand"] }],
    });
  });

  test("attackKind: spell parses onto a Melee/Ranged Spell Attack, and defaults to undefined (weapon) when absent", () => {
    const yaml = `
templateName: "Frost Wraith"
ac: 13
maxHp: 30
speed: 30
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Frost Touch"
    group: "action"
    attack:
      attackType: melee
      attackKind: spell
      attackBonus: 7
      range: "5"
      damage: "3d6 +4"
      damageType: necrotic
    save:
      ability: con
      dc: 15
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.input.traits[0].attack).toEqual({
      attackType: "melee",
      attackKind: "spell",
      attackBonus: 7,
      range: "5",
      damage: [{ dice: "3d6 +4", damageType: "necrotic" }],
    });
    expect(outcome.result.input.traits[0].attack?.attackKind).toBe("spell");
  });

  test("an invalid attackKind is reported clearly, not thrown", () => {
    const yaml = `
templateName: "Broken Spell Attack"
ac: 13
maxHp: 30
speed: 30
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Bad Kind"
    attack:
      attackType: melee
      attackKind: "cantrip"
      attackBonus: 5
      damage: "1d6"
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toEqual(expect.arrayContaining([expect.stringContaining("traits[0].attack.attackKind")]));
  });

  test("attackBonus is optional — an attack with only damage (no to-hit number yet) parses fine", () => {
    const yaml = `
templateName: "Vague Attacker"
ac: 13
maxHp: 30
speed: 30
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Mystery Strike"
    group: "action"
    attack:
      attackType: melee
      damage: "2d6"
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.input.traits[0].attack).toEqual({
      attackType: "melee",
      attackKind: undefined,
      attackBonus: undefined,
      range: undefined,
      damage: [{ dice: "2d6", damageType: undefined }],
    });
  });

  test("aoe parses a shape + size (and width for a line), and rejects an unknown shape", () => {
    const yaml = `
templateName: "Cone Breather"
ac: 13
maxHp: 30
speed: 30
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Cold Breath"
    group: "action"
    save:
      ability: con
      dc: 15
    aoe:
      shape: cone
      size: 30
  - name: "Lightning Line"
    group: "action"
    save:
      ability: dex
      dc: 15
    aoe:
      shape: line
      size: 60
      width: 5
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.input.traits[0].aoe).toEqual({ shape: "cone", size: 30, width: undefined });
    expect(outcome.result.input.traits[1].aoe).toEqual({ shape: "line", size: 60, width: 5 });
  });

  test("an invalid aoe shape is reported clearly, not thrown", () => {
    const yaml = `
templateName: "Broken Aoe"
ac: 13
maxHp: 30
speed: 30
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Weird Blast"
    aoe:
      shape: "triangle"
      size: 10
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toEqual(expect.arrayContaining([expect.stringContaining("traits[0].aoe.shape")]));
  });

  test("malformed attack/save/spellcasting shapes are reported clearly, not thrown", () => {
    const yaml = `
templateName: "Broken Example"
ac: 13
maxHp: 30
speed: 30
stats:
  str: 8
  dex: 12
  con: 12
  int: 10
  wis: 10
  cha: 16
traits:
  - name: "Bad Attack"
    attack:
      attackType: "diagonal"
      attackBonus: 5
      damage: "1d6"
  - name: "Missing Damage"
    attack:
      attackType: melee
      attackBonus: 5
  - name: "Bad Save"
    save:
      ability: "luck"
      dc: 13
spellcasting:
  ability: "luck"
  saveDc: 14
  attackBonus: 6
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("traits[0].attack.attackType"),
        expect.stringContaining("traits[1].attack.damage"),
        expect.stringContaining("traits[2].save.ability"),
        expect.stringContaining('"spellcasting.ability"'),
      ])
    );
  });
});

describe("owner character is resolved by name, not id", () => {
  test("ownerCharacter is parsed as free text, separate from the AddCreatureInput payload", () => {
    const yaml = `
templateName: "Otherworldly Steed"
ac: 14
maxHp: 13
speed: 60
stats:
  str: 18
  dex: 15
  con: 13
  int: 7
  wis: 12
  cha: 8
ownerCharacter: "Aria"
`;
    const outcome = parseCreatureImportYaml(yaml);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.ownerCharacterName).toBe("Aria");
    expect("ownerCharacterId" in outcome.result.input).toBe(false);
  });
});
