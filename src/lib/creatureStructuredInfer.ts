import { AbilityScores, CreatureAttack, CreatureSave, CreatureTrait } from "./types";

const ABILITY_NAME_TO_KEY: Record<string, keyof AbilityScores> = {
  strength: "str",
  dexterity: "dex",
  constitution: "con",
  intelligence: "int",
  wisdom: "wis",
  charisma: "cha",
};

/** e.g. "Fire Breath (Recharge 5-6)", "Frightful Presence (1/Day)" — the parenthetical a DM typed straight from a physical/PDF stat block before this field existed, at the tail of the trait's own name rather than its description. */
const RECHARGE_SUFFIX = /\s*\((recharge(?: after a short or long rest)?|recharge\s*\d(?:\s*-\s*\d)?|\d+\s*\/\s*day(?: each)?)\)\s*$/i;

function inferRecharge(name: string): string | undefined {
  const match = name.match(RECHARGE_SUFFIX);
  return match ? match[1].replace(/\s+/g, " ").trim() : undefined;
}

function stripRechargeSuffix(name: string): string {
  return name.replace(RECHARGE_SUFFIX, "").trim();
}

/** e.g. "Melee Weapon Attack: +7 to hit, reach 5 ft., one target." / "Ranged Weapon Attack: +5 to hit, range 80/320 ft., one target." — the standard 5e stat-block phrasing for a weapon/spell attack line. */
const ATTACK_PATTERN = /(Melee|Ranged)\s+(?:Weapon|Spell)\s+Attack:\s*([+-]\d+)\s+to hit,\s*(?:reach|range)\s+([\d/]+\s*ft\.?)/i;
/** e.g. "Hit: 13 (2d6 + 6) piercing damage." */
const DAMAGE_PATTERN = /Hit:\s*\d+\s*\(([^)]+)\)\s*([A-Za-z]+)\s*damage/i;

function inferAttack(description: string): CreatureAttack | undefined {
  const attackMatch = description.match(ATTACK_PATTERN);
  if (!attackMatch) return undefined;
  const damageMatch = description.match(DAMAGE_PATTERN);
  return {
    attackType: attackMatch[1].toLowerCase() === "melee" ? "melee" : "ranged",
    attackBonus: Number(attackMatch[2]),
    range: attackMatch[3].trim(),
    damage: damageMatch ? damageMatch[1].trim() : "",
    damageType: damageMatch ? damageMatch[2].toLowerCase() : undefined,
  };
}

/** e.g. "...must succeed on a DC 15 Wisdom saving throw..." */
const SAVE_PATTERN = /DC\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s*saving throw/i;

function inferSave(description: string): CreatureSave | undefined {
  const match = description.match(SAVE_PATTERN);
  if (!match) return undefined;
  const ability = ABILITY_NAME_TO_KEY[match[2].toLowerCase()];
  return ability ? { ability, dc: Number(match[1]) } : undefined;
}

/**
 * Best-effort extraction of structured `attack`/`save`/`recharge` out of a
 * trait's plain `name`/`description` — for creatures added (via YAML, Open5e,
 * or manual entry) before these structured fields existed, whose data still
 * lives entirely as prose typed in from a physical/PDF stat block. Matches
 * the standard 5e stat-block phrasing ("Melee Weapon Attack: +7 to hit...",
 * "Hit: 13 (2d6 + 6) piercing damage", "DC 15 Wisdom saving throw",
 * "(Recharge 5-6)") — homebrew wording that doesn't follow this convention
 * simply won't match, and the DM fills those in by hand instead.
 *
 * Never overwrites a field the trait already has (only fields the trait
 * doesn't yet carry are inferred) — a DM's own prior edit always wins.
 * Returns only the fields that changed (an empty object when nothing
 * matched), so the caller can tell "no fields were touched" without doing
 * its own recharge/attack/save-plus-name comparisons.
 */
export function inferStructuredTraitFields(
  trait: CreatureTrait
): Partial<Pick<CreatureTrait, "name" | "attack" | "save" | "recharge">> {
  const result: Partial<Pick<CreatureTrait, "name" | "attack" | "save" | "recharge">> = {};

  if (trait.recharge === undefined) {
    const recharge = inferRecharge(trait.name);
    if (recharge) {
      result.recharge = recharge;
      result.name = stripRechargeSuffix(trait.name);
    }
  }

  if (trait.attack === undefined && trait.description) {
    const attack = inferAttack(trait.description);
    if (attack) result.attack = attack;
  }

  if (trait.save === undefined && trait.description) {
    const save = inferSave(trait.description);
    if (save) result.save = save;
  }

  return result;
}
