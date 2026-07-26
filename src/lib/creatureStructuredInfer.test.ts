import { describe, expect, test } from "vitest";
import { inferStructuredTraitFields } from "./creatureStructuredInfer";

describe("inferStructuredTraitFields", () => {
  test("infers a melee attack + damage from standard stat-block phrasing", () => {
    const result = inferStructuredTraitFields({
      name: "Bite",
      group: "action",
      description: "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 17 (2d10 + 6) piercing damage.",
    });
    expect(result.attack).toEqual({
      attackType: "melee",
      attackBonus: 7,
      range: "5",
      damage: [{ dice: "2d10 + 6", damageType: "piercing" }],
    });
    expect(result.save).toBeUndefined();
    expect(result.recharge).toBeUndefined();
  });

  test("infers a ranged attack", () => {
    const result = inferStructuredTraitFields({
      name: "Longbow",
      group: "action",
      description: "Ranged Weapon Attack: +5 to hit, range 150/600 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
    });
    expect(result.attack?.attackType).toBe("ranged");
    expect(result.attack?.range).toBe("150/600");
  });

  test("infers a second damage roll from a 'plus' clause", () => {
    const result = inferStructuredTraitFields({
      name: "Flaming Bite",
      group: "action",
      description:
        "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage plus 9 (2d8) fire damage.",
    });
    expect(result.attack?.damage).toEqual([
      { dice: "1d6 + 3", damageType: "bludgeoning" },
      { dice: "2d8", damageType: "fire" },
    ]);
  });

  test("infers a saving throw DC + ability", () => {
    const result = inferStructuredTraitFields({
      name: "Frightful Presence",
      group: "action",
      description: "Each creature of the DM's choice must succeed on a DC 15 Wisdom saving throw or become frightened.",
    });
    expect(result.save).toEqual({ ability: "wis", dc: 15 });
  });

  test("infers recharge from a name suffix and strips it from the name", () => {
    const result = inferStructuredTraitFields({ name: "Fire Breath (Recharge 5-6)", group: "action" });
    expect(result.recharge).toBe("Recharge 5-6");
    expect(result.name).toBe("Fire Breath");
  });

  test("infers a X/Day suffix too", () => {
    const result = inferStructuredTraitFields({ name: "Teleport (1/Day)", group: "action" });
    expect(result.recharge).toBe("1/Day");
    expect(result.name).toBe("Teleport");
  });

  test("never overwrites a field the trait already has", () => {
    const result = inferStructuredTraitFields({
      name: "Bite (Recharge 5-6)",
      group: "action",
      description: "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 17 (2d10 + 6) piercing damage.",
      recharge: "Recharge 6",
      attack: { attackType: "melee", attackBonus: 99, damage: [{ dice: "1" }] },
    });
    expect(result.attack).toBeUndefined();
    expect(result.recharge).toBeUndefined();
    expect(result.name).toBeUndefined();
  });

  test("returns an empty object for prose that doesn't match any known pattern", () => {
    const result = inferStructuredTraitFields({
      name: "Charge",
      group: "trait",
      description: "If the unicorn moves at least 20 feet straight toward a target, it can make a hooves attack.",
    });
    expect(result).toEqual({});
  });
});
