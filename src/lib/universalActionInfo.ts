/**
 * Short rules reminders for the 2024 PHB's generally-available actions —
 * the ones any creature can take regardless of what's on its sheet (see the
 * SYSTEM_PROMPT's ACTION ORIGINS section, kind: "universal"). Same
 * condensed-reminder convention as `conditionInfo.ts`/`masteryInfo.ts`:
 * lowercase keys, looked up case-insensitively, not verbatim rules text.
 */
export const UNIVERSAL_ACTION_INFO: Record<string, string> = {
  dash: "Gain extra movement equal to your speed for this turn.",
  disengage: "Your movement doesn't provoke opportunity attacks for the rest of the turn.",
  dodge: "Until the start of your next turn, any attack roll against you has disadvantage if you can see the attacker, and you have advantage on Dexterity saving throws.",
  help: "Give an ally advantage on their next ability check for a task you assist with, or on their next attack roll against a creature within 5 ft of you.",
  hide: "Make a Dexterity (Stealth) check to try to hide from creatures that can't see you.",
  ready: "Choose a trigger and an action, Bonus Action, or movement to take in response to it; you use your reaction to act on that trigger before your next turn.",
  search: "Make a Wisdom (Perception) or Intelligence (Investigation) check to find something.",
  study: "Make an Intelligence check to recall or research information about a creature, object, or place.",
  utilize: "Use an object that requires an action to activate, operate, or otherwise employ.",
  grapple: "Make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics) to grab and restrain it.",
  shove: "Make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics) to knock it prone or push it 5 ft away.",
};

/** Matches a universal action name at a word boundary inside `name` (e.g. "Dash" inside "Dash (Bonus Action)") and returns its title-cased key plus blurb, or `undefined` when `name` doesn't reference one of these actions. */
export function getUniversalActionInfo(name: string): { title: string; description: string } | undefined {
  const match = name.match(new RegExp(`\\b(${Object.keys(UNIVERSAL_ACTION_INFO).join("|")})\\b`, "i"));
  if (!match) return undefined;
  const key = match[1].toLowerCase();
  return { title: key.charAt(0).toUpperCase() + key.slice(1), description: UNIVERSAL_ACTION_INFO[key] };
}
