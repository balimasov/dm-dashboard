import { abilityModifier, SKILL_LABELS, SkillName } from "./types";

const SKILL_NAME_BY_LABEL: Partial<Record<string, SkillName>> = Object.fromEntries(
  (Object.keys(SKILL_LABELS) as SkillName[]).map((name) => [SKILL_LABELS[name].toLowerCase(), name])
);

export interface ParsedCreatureSkill {
  /** Resolved 5e skill, when the free-text label matches a known one — lets the pill show the same abbreviation/hint as a character's skill. */
  name: SkillName | null;
  label: string;
  bonus: number | null;
}

/**
 * A stat block's Skills line (e.g. "Perception +13, Stealth +6") only ever
 * lists skills the creature is actually trained in — unlike a character,
 * there's no separate "proficient: true/false" flag to parse, being listed
 * here at all *is* the proficiency.
 */
export function parseCreatureSkills(text?: string): ParsedCreatureSkill[] {
  if (!text) return [];
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.+?)\s*([+-]\d+)\s*$/);
      const rawLabel = (match ? match[1] : entry).trim();
      const bonus = match ? Number(match[2]) : null;
      const name = SKILL_NAME_BY_LABEL[rawLabel.toLowerCase()] ?? null;
      return { name, label: name ? SKILL_LABELS[name] : rawLabel, bonus };
    });
}

/**
 * A stat block never prints Passive Investigation/Insight the way it does
 * Passive Perception — a DM is expected to work them out themselves, same as
 * for a character: 10 + the skill's own listed bonus (already folds in
 * proficiency) if the creature is trained in it, otherwise just the plain
 * ability modifier.
 */
export function computePassiveSkill(
  skillName: SkillName,
  skills: ParsedCreatureSkill[],
  abilityScore: number
): number {
  const listed = skills.find((s) => s.name === skillName && s.bonus !== null);
  const bonus = listed ? listed.bonus! : abilityModifier(abilityScore);
  return 10 + bonus;
}

export interface ParsedCreatureSenses {
  passivePerception: number | null;
  entries: Array<{ name: string; range: number }>;
}

function titleCase(text: string): string {
  return text
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * A stat block's Senses line (e.g. "darkvision 120 ft., passive Perception
 * 19") mixes named senses with a range and the passive Perception score into
 * one free-text field — split back into the same shape a character's
 * structured `senses`/`passivePerception` fields already have, so both can
 * render through the same pill/list components.
 */
export function parseCreatureSenses(text?: string): ParsedCreatureSenses {
  if (!text) return { passivePerception: null, entries: [] };
  const segments = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let passivePerception: number | null = null;
  const entries: Array<{ name: string; range: number }> = [];
  segments.forEach((segment) => {
    const passiveMatch = segment.match(/passive\s+perception\s+(\d+)/i);
    if (passiveMatch) {
      passivePerception = Number(passiveMatch[1]);
      return;
    }
    const rangeMatch = segment.match(/^(.*?)(\d+)\s*ft\.?/i);
    if (!rangeMatch) return;
    const name = titleCase(rangeMatch[1].trim().replace(/[.,]+$/, ""));
    if (name) entries.push({ name, range: Number(rangeMatch[2]) });
  });

  return { passivePerception, entries };
}
