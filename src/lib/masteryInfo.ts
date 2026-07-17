/**
 * Short DM-facing reminders of what each 2024 weapon mastery property does.
 * Intentionally condensed (not verbatim rules text) — an in-session memory
 * jog, same convention as `conditionInfo.ts`.
 */
export const MASTERY_INFO: Record<string, string> = {
  Cleave: "On a hit, make a second attack against another creature within 5 ft of the first (no ability modifier to that damage unless it's negative).",
  Graze: "On a miss, still deal damage equal to your ability modifier.",
  Nick: "The Light property's extra attack can be made as part of the Attack action instead of a Bonus Action, once per turn.",
  Push: "On a hit, push the target up to 10 ft away if it's Large or smaller.",
  Sap: "On a hit, the target has disadvantage on its next attack roll before the start of your next turn.",
  Slow: "On a hit, reduce the target's speed by 10 ft until the start of your next turn (not cumulative).",
  Topple: "On a hit, force a Constitution save or the target falls prone.",
  Vex: "On a hit, you have advantage on your next attack roll against that target before the end of your next turn.",
};

export function getMasteryInfo(name: string): string | undefined {
  return MASTERY_INFO[name];
}
