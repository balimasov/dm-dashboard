/**
 * Short DM-facing reminders of what each condition mechanically does, per the
 * 2024 D&D rules revision. Intentionally condensed (not verbatim rules text) —
 * meant as an in-session memory jog, not a rules-lawyering reference.
 */
export const CONDITION_INFO: Record<string, string> = {
  blinded: "Can't see, automatically fails checks that require sight. Attacks against it have advantage, its own attacks have disadvantage.",
  charmed: "Can't attack the charmer or target it with harmful effects. The charmer has advantage on social checks against it.",
  deafened: "Can't hear, automatically fails checks that require hearing.",
  frightened: "Disadvantage on ability checks and attack rolls while the source of fear is in sight. Can't willingly move closer to it.",
  grappled: "Speed becomes 0 and can't increase. Disadvantage on attacks against anyone but the grappler.",
  incapacitated: "Can't take actions, bonus actions, or reactions. Concentration breaks. Can't speak.",
  invisible: "Can't be seen without special senses. Attacks against it have disadvantage, its own attacks have advantage.",
  paralyzed: "Incapacitated, can't move or speak. Automatically fails Strength and Dexterity saves. Attacks against it have advantage; hits from within 5 ft are critical.",
  petrified: "Turned to stone, incapacitated, unaware of surroundings. Resistant to all damage, immune to poison and disease.",
  poisoned: "Disadvantage on attack rolls and ability checks.",
  prone: "Disadvantage on its own attack rolls. Melee attacks against it have advantage, ranged attacks have disadvantage. Standing up costs half its speed.",
  restrained: "Speed becomes 0. Attacks against it have advantage, its own attacks have disadvantage. Disadvantage on Dexterity saves.",
  stunned: "Incapacitated, can't move, speaks only falteringly. Automatically fails Strength and Dexterity saves. Attacks against it have advantage.",
  unconscious: "Incapacitated, can't move or speak, unaware of surroundings. Drops what it's holding, falls prone. Fails Strength and Dexterity saves. Attacks against it have advantage; hits from within 5 ft are critical.",
  diseased: "Generic term — actual symptoms depend on the specific disease.",
};

export function getConditionInfo(name: string): string | undefined {
  return CONDITION_INFO[name.trim().toLowerCase()];
}

/** Exhaustion is cumulative (1-6): -2×level to every d20 Test, speed -5ft×level, level 6 = death. */
export const EXHAUSTION_RULES_TEXT =
  "Exhaustion is cumulative (1-6 levels). Each level: −2×level to every d20 roll " +
  "(ability checks, attacks, saves), speed −5 ft×level. Level 6 = death. " +
  "A long rest removes 1 level.";

export function getExhaustionEffect(level: number): { d20Penalty: number; speedPenalty: number } | null {
  if (level <= 0) return null;
  return { d20Penalty: level * 2, speedPenalty: level * 5 };
}
