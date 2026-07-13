import { Character, SKILL_ABILITY, SKILL_LABELS, SkillName, SkillProficiency, formatModifier, skillBonus } from "./types";

/**
 * The DM-facing "compact view" list from the Party Toolkit spec — the skills
 * asked about most often at the table. Already alphabetical, which doubles
 * as the display order. The remaining six (Animal Handling, History,
 * Medicine, Nature, Performance, Sleight of Hand) are reachable via "show
 * all" rather than shown by default.
 */
export const PARTY_TOOLKIT_COMPACT_SKILLS: SkillName[] = [
  "acrobatics",
  "arcana",
  "athletics",
  "deception",
  "insight",
  "intimidation",
  "investigation",
  "perception",
  "persuasion",
  "religion",
  "stealth",
  "survival",
];

export type SkillCoverageStatus = "Strong" | "Medium" | "Weak";

export interface SkillPartyScore {
  characterId: string;
  characterName: string;
  modifier: number;
}

export interface SkillOverviewEntry {
  skill: SkillName;
  best: SkillPartyScore | null;
  /** Omitted (`null`) when there's nothing to contrast — one character in the party, or every character ties. */
  weakest: SkillPartyScore | null;
  proficientCount: number;
  status: SkillCoverageStatus;
}

/** A character with no entry for this skill is still a valid (non-proficient) check — `skillProficiencies` only lists skills with something noteworthy attached (see `computeSkillProficiencies`), so a plain ability-mod-only entry stands in for the rest. */
function effectiveSkillProficiency(character: Character, skill: SkillName): SkillProficiency {
  return (
    character.skillProficiencies.find((s) => s.name === skill) ?? {
      name: skill,
      proficient: false,
      expertise: false,
    }
  );
}

/**
 * Coverage status uses fixed counts rather than a percentage of party size:
 * the DM's real question is "is more than one person backing this up", and
 * a percentage answers a different question (1 of 2 characters reads as
 * "weak" by the same percentage as 2 of 4, even though the former is
 * actually solid single coverage). These thresholds mirror the spec's own
 * worked examples (1 proficient → Weak, 2 → Medium, 3+ → Strong).
 */
function coverageStatus(proficientCount: number): SkillCoverageStatus {
  if (proficientCount >= 3) return "Strong";
  if (proficientCount === 2) return "Medium";
  return "Weak";
}

export function computeSkillOverviewEntry(characters: Character[], skill: SkillName): SkillOverviewEntry {
  const scores = characters.map((c) => {
    const prof = effectiveSkillProficiency(c, skill);
    return {
      characterId: c.id,
      characterName: c.name,
      modifier: skillBonus(c, prof),
      proficient: prof.proficient || prof.expertise,
    };
  });

  const proficientCount = scores.filter((s) => s.proficient).length;
  const sorted = [...scores].sort((a, b) => b.modifier - a.modifier);
  const best = sorted[0] ?? null;
  const last = sorted[sorted.length - 1] ?? null;
  const weakest = last && best && last.modifier < best.modifier ? last : null;

  return {
    skill,
    best: best && { characterId: best.characterId, characterName: best.characterName, modifier: best.modifier },
    weakest: weakest && { characterId: weakest.characterId, characterName: weakest.characterName, modifier: weakest.modifier },
    proficientCount,
    status: coverageStatus(proficientCount),
  };
}

/** All 18 skills, alphabetical by display label — the "show all" view. */
export function computePartySkillOverview(characters: Character[]): SkillOverviewEntry[] {
  return (Object.keys(SKILL_ABILITY) as SkillName[])
    .sort((a, b) => SKILL_LABELS[a].localeCompare(SKILL_LABELS[b]))
    .map((skill) => computeSkillOverviewEntry(characters, skill));
}

export function formatSkillScore(score: SkillPartyScore): string {
  return `${score.characterName} ${formatModifier(score.modifier)}`;
}

export interface PassiveBest {
  characterName: string;
  value: number;
}

export interface PassivePerceptionSummary {
  best: PassiveBest;
  average: number;
  lowest: PassiveBest;
}

export interface PartyPassiveSummary {
  perception: PassivePerceptionSummary;
  insight: PassiveBest;
  investigation: PassiveBest;
}

function bestBy(characters: Character[], value: (c: Character) => number): PassiveBest {
  const top = characters.reduce((best, c) => (value(c) > value(best) ? c : best));
  return { characterName: top.name, value: value(top) };
}

function lowestBy(characters: Character[], value: (c: Character) => number): PassiveBest {
  const bottom = characters.reduce((worst, c) => (value(c) < value(worst) ? c : worst));
  return { characterName: bottom.name, value: value(bottom) };
}

/** `null` when there are no characters — an empty average/best/lowest has nothing meaningful to show. */
export function computePartyPassiveSummary(characters: Character[]): PartyPassiveSummary | null {
  if (characters.length === 0) return null;

  const perceptionValues = characters.map((c) => c.combat.passivePerception);
  const average = Math.round(perceptionValues.reduce((sum, v) => sum + v, 0) / characters.length);

  return {
    perception: {
      best: bestBy(characters, (c) => c.combat.passivePerception),
      average,
      lowest: lowestBy(characters, (c) => c.combat.passivePerception),
    },
    insight: bestBy(characters, (c) => c.combat.passiveInsight),
    investigation: bestBy(characters, (c) => c.combat.passiveInvestigation),
  };
}
