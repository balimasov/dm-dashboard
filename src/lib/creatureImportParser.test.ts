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
      stats: { str: 18, dex: 14, con: 15, int: 11, wis: 17, cha: 16 },
      savingThrows: { wis: 5 },
    });
    expect(outcome.result.input.traits).toHaveLength(2);
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
