import { titleCase } from "./shared";
import { RawDdbData, RawDdbModifier } from "./rawTypes";

/**
 * `customDefenseAdjustments` (D&D Beyond's "Damage & Condition Adjustments"
 * picker under Extras — resistances/immunities/vulnerabilities typed in
 * manually rather than granted by a race/class/feat) is a completely
 * separate array from `modifiers`, keyed by a numeric `adjustmentId` with no
 * name and no category anywhere in this endpoint's response, and no public
 * documentation of what the IDs mean. There is NO arithmetic relationship
 * between an id's category and its number, confirmed by cross-referencing a
 * real character's raw export against her actual D&D Beyond sheet across
 * four rounds (adding every entry in her Resistances picker, then every
 * entry in her Immunities picker, then every entry in her Vulnerabilities
 * picker): e.g. Radiant is id 8 as a resistance but id 24 as an immunity,
 * and the basic 12 damage types shift by a consistent +16 between the
 * Resistance and Immunity pickers (1→17, 2→18, ...) and +32 between
 * Resistance and Vulnerability (1→33, 2→34, ...) — except Force, which
 * follows neither offset (47 resist → 48 immune → 49 vulnerable, +1 each
 * time instead) — so nothing here can be derived by formula, only confirmed
 * one id at a time.
 *
 * `type` splits the id space in two, each independently numbered: `type: 2`
 * is damage-type-based (id 1 = "Bludgeoning" resistance); `type: 1` is
 * condition-based (id 1 = "Blinded" immunity — ids 1-15 are exactly the 15
 * standard 5e conditions in PHB order). A plain `adjustmentId` lookup would
 * collide across these two id spaces, so this is keyed by `type` first.
 * Condition-based entries have only ever been observed as Immunity — D&D
 * Beyond doesn't offer a "resistant/vulnerable to a condition" picker.
 *
 * Every id below is individually confirmed against a real character; an id
 * not in this table is skipped rather than guessed.
 */
const CUSTOM_DEFENSE_ADJUSTMENTS: Record<
  number,
  Record<number, { name: string; category: "resistance" | "immunity" | "vulnerability" }>
> = {
  // type 1 — condition-based (the 15 standard 5e conditions, all Immunity).
  1: {
    1: { name: "Blinded", category: "immunity" },
    2: { name: "Charmed", category: "immunity" },
    3: { name: "Deafened", category: "immunity" },
    4: { name: "Exhaustion", category: "immunity" },
    5: { name: "Frightened", category: "immunity" },
    6: { name: "Grappled", category: "immunity" },
    7: { name: "Incapacitated", category: "immunity" },
    8: { name: "Invisible", category: "immunity" },
    9: { name: "Paralyzed", category: "immunity" },
    10: { name: "Petrified", category: "immunity" },
    11: { name: "Poisoned", category: "immunity" },
    12: { name: "Prone", category: "immunity" },
    13: { name: "Restrained", category: "immunity" },
    14: { name: "Stunned", category: "immunity" },
    15: { name: "Unconscious", category: "immunity" },
  },
  // type 2 — damage-type-based.
  2: {
    1: { name: "Bludgeoning", category: "resistance" },
    2: { name: "Piercing", category: "resistance" },
    3: { name: "Slashing", category: "resistance" },
    4: { name: "Lightning", category: "resistance" },
    5: { name: "Thunder", category: "resistance" },
    6: { name: "Poison", category: "resistance" },
    7: { name: "Cold", category: "resistance" },
    8: { name: "Radiant", category: "resistance" },
    9: { name: "Fire", category: "resistance" },
    10: { name: "Necrotic", category: "resistance" },
    11: { name: "Acid", category: "resistance" },
    12: { name: "Psychic", category: "resistance" },
    17: { name: "Bludgeoning", category: "immunity" },
    18: { name: "Piercing", category: "immunity" },
    19: { name: "Slashing", category: "immunity" },
    20: { name: "Lightning", category: "immunity" },
    21: { name: "Thunder", category: "immunity" },
    22: { name: "Poison", category: "immunity" },
    23: { name: "Cold", category: "immunity" },
    24: { name: "Radiant", category: "immunity" },
    25: { name: "Fire", category: "immunity" },
    26: { name: "Necrotic", category: "immunity" },
    27: { name: "Acid", category: "immunity" },
    28: { name: "Psychic", category: "immunity" },
    33: { name: "Bludgeoning", category: "vulnerability" },
    34: { name: "Piercing", category: "vulnerability" },
    35: { name: "Slashing", category: "vulnerability" },
    36: { name: "Lightning", category: "vulnerability" },
    37: { name: "Thunder", category: "vulnerability" },
    38: { name: "Poison", category: "vulnerability" },
    39: { name: "Cold", category: "vulnerability" },
    40: { name: "Radiant", category: "vulnerability" },
    41: { name: "Fire", category: "vulnerability" },
    42: { name: "Necrotic", category: "vulnerability" },
    43: { name: "Acid", category: "vulnerability" },
    44: { name: "Psychic", category: "vulnerability" },
    47: { name: "Force", category: "resistance" },
    48: { name: "Force", category: "immunity" },
    49: { name: "Force", category: "vulnerability" },
    51: { name: "Ranged Attacks", category: "resistance" },
    52: { name: "Damage Dealt By Traps", category: "resistance" },
    54: { name: "Bludgeoning from Nonmagical Attacks", category: "resistance" },
    57: { name: "Damage from Spells", category: "resistance" },
    63: { name: "Petrified (Aberrant Armor Only)", category: "immunity" },
    64: { name: "Slashing from a Vorpal Sword", category: "vulnerability" },
    65: { name: "Animated Breath (Acid, Cold, Fire, Lightning, or Poison)", category: "resistance" },
    66: { name: "Psychic (Ruidium Armor)", category: "resistance" },
    68: { name: "Acid, Cold, Fire, Lightning, or Poison (choice)", category: "resistance" },
    69: { name: "Lightning (Darksteel Greataxe)", category: "resistance" },
    74: { name: "Bludgeoning from Nonmagical Attacks", category: "immunity" },
    77: { name: "Slashing from Nonmagical Attacks", category: "resistance" },
    78: { name: "Piercing from Nonmagical Attacks", category: "resistance" },
    81: { name: "Bludgeoning from Nonmagical Attacks", category: "resistance" },
    84: { name: "Bludgeoning Damage from Falling", category: "immunity" },
    87: { name: "Piercing from Weapons Wielded by Creatures under Bless", category: "vulnerability" },
    92: { name: "Necrotic (Emerald Fulcrum Lens)", category: "resistance" },
    93: { name: "Sneak Attack / Critical Hit Extra Damage", category: "resistance" },
  },
};

/**
 * D&D Beyond doesn't reliably distinguish damage resistances from condition
 * immunities in this endpoint (e.g. immunity to a *condition* like
 * magical-sleep shows up under the same `type: "immunity"` as a damage-type
 * immunity would) — both are surfaced here at face value, matching what the
 * app's Resistances/Immunities/Vulnerabilities section is meant to list.
 */
export function computeDamageModifiers(
  mods: RawDdbModifier[],
  customDefenseAdjustments: RawDdbData["customDefenseAdjustments"]
) {
  function namesFor(type: string): string[] {
    const names = mods
      .filter((m) => m.type === type && m.isGranted && m.subType)
      .map((m) => titleCase(m.subType!));
    return Array.from(new Set(names));
  }

  const custom: Record<"resistance" | "immunity" | "vulnerability", string[]> = {
    resistance: [],
    immunity: [],
    vulnerability: [],
  };
  for (const adj of customDefenseAdjustments ?? []) {
    const known = CUSTOM_DEFENSE_ADJUSTMENTS[adj.type]?.[adj.adjustmentId];
    if (!known) continue;
    custom[known.category].push(known.name);
  }

  return {
    resistances: Array.from(new Set([...namesFor("resistance"), ...custom.resistance])),
    immunities: Array.from(new Set([...namesFor("immunity"), ...custom.immunity])),
    vulnerabilities: Array.from(new Set([...namesFor("vulnerability"), ...custom.vulnerability])),
  };
}

/**
 * Advantage/disadvantage grants (e.g. Fey Ancestry vs. Charmed, War Caster's
 * advantage on Constitution saves to maintain Concentration, Danger Sense)
 * are modeled as `type: "advantage"|"disadvantage"` modifiers whose
 * `friendlySubtypeName` is the subject ("Constitution Saving Throws") and
 * whose `restriction` is a trailing clause of the full rules sentence (often
 * starting mid-sentence, e.g. "saving throws that you make to maintain
 * Concentration."). Shown as raw fragments joined with a dash rather than
 * reassembled into a single sentence, since restriction text isn't
 * consistently a clean standalone clause.
 */
export function computeAdvantages(mods: RawDdbModifier[]): string[] {
  const entries = mods.filter((m) => (m.type === "advantage" || m.type === "disadvantage") && m.isGranted);
  const names = entries.map((m) => {
    const prefix = m.type === "disadvantage" ? "Disadvantage" : "Advantage";
    const subject = m.friendlySubtypeName || titleCase(m.subType ?? "");
    const restriction = (m.restriction ?? "").trim();
    return restriction ? `${prefix}: ${subject} — ${restriction}` : `${prefix}: ${subject}`;
  });
  return Array.from(new Set(names));
}
