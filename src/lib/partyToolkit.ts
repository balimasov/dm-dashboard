import {
  AbilityScores,
  Character,
  Feature,
  KnownSpell,
  RecoveryType,
  SKILL_ABILITY,
  SKILL_LABELS,
  STAT_ORDER,
  Sense,
  SkillName,
  SkillProficiency,
} from "./types";
import { skillBonus } from "./characterMath";
import { formatModifier } from "./format";

export type SkillCoverageStatus = "Strong" | "Medium" | "Weak";

/**
 * Ordinal `characterId` comparison — the locale-independent tie-break every
 * "sort characters, then break ties by name" spot in this file needs.
 * `characterName.localeCompare(...)` with no explicit locale collates
 * however the *running environment's* default locale says to, which is free
 * to differ between the Node.js server and the browser. For a party with
 * both Latin and Cyrillic names, that's a real mismatch: two tied entries
 * (e.g. two characters who both know the same spell) sort one way during
 * SSR and the other way once the client's locale takes over, so hydration
 * silently "corrects" the DOM — the previously server-picked entry's avatar
 * visibly flashes in before the client's swaps it out. `characterId` is
 * plain ASCII and compared ordinally, so the order is identical everywhere
 * and hydration has nothing to fix. `undefined` (an entry with no owning
 * character, e.g. the Heroic Inspiration coverage row) sorts last.
 */
function compareCharacterId(a: string | undefined, b: string | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? -1 : 1;
}

export interface SkillPartyScore {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
  modifier: number;
  /** Conditional advantage/disadvantage on this character's checks for this skill (e.g. armor-based Stealth disadvantage) — doesn't change `modifier` (advantage/disadvantage affects the roll, not the flat bonus), so it has to be surfaced separately or a numerically-"best" character can be a worse real-world pick. */
  advantage?: "advantage" | "disadvantage";
}

export interface SkillCharacterScore extends SkillPartyScore {
  proficient: boolean;
  expertise: boolean;
}

export interface SkillOverviewEntry {
  skill: SkillName;
  best: SkillPartyScore | null;
  /** Omitted (`null`) when there's nothing to contrast — one character in the party, or every character ties. */
  weakest: SkillPartyScore | null;
  proficientCount: number;
  status: SkillCoverageStatus;
  /** Every character's modifier for this skill, ranked highest first — the full per-character breakdown shown in the row's hover hint. */
  all: SkillCharacterScore[];
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
  const scores: SkillCharacterScore[] = characters.map((c) => {
    const prof = effectiveSkillProficiency(c, skill);
    return {
      characterId: c.id,
      characterName: c.name,
      avatarUrl: c.avatarUrl,
      modifier: skillBonus(c, prof),
      proficient: prof.proficient || prof.expertise,
      expertise: prof.expertise,
      advantage: prof.advantage,
    };
  });

  const proficientCount = scores.filter((s) => s.proficient).length;
  const sorted = [...scores].sort((a, b) => b.modifier - a.modifier || compareCharacterId(a.characterId, b.characterId));
  const best = sorted[0] ?? null;
  const last = sorted[sorted.length - 1] ?? null;
  const weakest = last && best && last.modifier < best.modifier ? last : null;

  return {
    skill,
    best: best && {
      characterId: best.characterId,
      characterName: best.characterName,
      avatarUrl: best.avatarUrl,
      modifier: best.modifier,
      advantage: best.advantage,
    },
    weakest: weakest && {
      characterId: weakest.characterId,
      characterName: weakest.characterName,
      avatarUrl: weakest.avatarUrl,
      modifier: weakest.modifier,
      advantage: weakest.advantage,
    },
    proficientCount,
    status: coverageStatus(proficientCount),
    all: sorted,
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

export interface AbilitySkillCoverage {
  ability: keyof AbilityScores;
  /** Average of `proficientCount / partySize` across every skill tied to this ability, 0-100. */
  percent: number;
  skillCount: number;
}

/**
 * The party's 18-skill coverage collapsed onto the five abilities that
 * actually have skills under them (Constitution has none in 5e, so it's
 * simply omitted rather than shown as a permanent, meaningless zero) — the
 * shape a DM actually needs at a glance for planning: which ability's
 * *whole* skill set is thin across the party (lean on Wisdom checks
 * tonight, or don't — everyone's covered; go easy on Intelligence, nobody
 * has it), not which one specific skill among eighteen. `[]` for an empty
 * party — no shape to draw.
 */
export function computeAbilitySkillCoverage(characters: Character[]): AbilitySkillCoverage[] {
  if (characters.length === 0) return [];

  const overview = computePartySkillOverview(characters);
  const byAbility = new Map<keyof AbilityScores, { sum: number; count: number }>();
  for (const entry of overview) {
    const ability = SKILL_ABILITY[entry.skill];
    const ratio = (entry.proficientCount / characters.length) * 100;
    const bucket = byAbility.get(ability) ?? { sum: 0, count: 0 };
    bucket.sum += ratio;
    bucket.count += 1;
    byAbility.set(ability, bucket);
  }

  return STAT_ORDER.filter((ability) => byAbility.has(ability)).map((ability) => {
    const { sum, count } = byAbility.get(ability)!;
    return { ability, percent: Math.round(sum / count), skillCount: count };
  });
}

export interface PassiveBest {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
  value: number;
}

export interface PassiveCharacterScore {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
  value: number;
  /** Proficient (or expertise) in the underlying skill (Perception/Insight/Investigation) — the passive score's own hover hint marks these the same way a skill row does. */
  proficient: boolean;
}

export interface PassiveStatSummary {
  best: PassiveBest;
  /** Omitted (`null`) when there's nothing to contrast — same rule as `SkillOverviewEntry.weakest`. */
  weakest: PassiveBest | null;
  /** Every character's value for this passive stat, ranked highest first. */
  all: PassiveCharacterScore[];
  /** Characters proficient (or expert) in the underlying skill — same coverage-status math as a skill row, see `coverageStatus`. */
  proficientCount: number;
  status: SkillCoverageStatus;
}

export interface PassivePerceptionSummary extends PassiveStatSummary {
  average: number;
  lowest: PassiveBest;
}

export interface PartyPassiveSummary {
  perception: PassivePerceptionSummary;
  insight: PassiveStatSummary;
  investigation: PassiveStatSummary;
}

function bestBy(characters: Character[], value: (c: Character) => number): PassiveBest {
  const top = characters.reduce((best, c) => (value(c) > value(best) ? c : best));
  return { characterId: top.id, characterName: top.name, avatarUrl: top.avatarUrl, value: value(top) };
}

function lowestBy(characters: Character[], value: (c: Character) => number): PassiveBest {
  const bottom = characters.reduce((worst, c) => (value(c) < value(worst) ? c : worst));
  return { characterId: bottom.id, characterName: bottom.name, avatarUrl: bottom.avatarUrl, value: value(bottom) };
}

function passiveCharacterScores(
  characters: Character[],
  skill: SkillName,
  value: (c: Character) => number
): PassiveCharacterScore[] {
  return characters
    .map((c) => {
      const prof = c.skillProficiencies.find((s) => s.name === skill);
      return {
        characterId: c.id,
        characterName: c.name,
        avatarUrl: c.avatarUrl,
        value: value(c),
        proficient: Boolean(prof?.proficient || prof?.expertise),
      };
    })
    .sort((a, b) => b.value - a.value || compareCharacterId(a.characterId, b.characterId));
}

function passiveStatSummary(
  characters: Character[],
  skill: SkillName,
  value: (c: Character) => number
): PassiveStatSummary {
  const all = passiveCharacterScores(characters, skill, value);
  const proficientCount = all.filter((s) => s.proficient).length;
  const best = all[0] ?? null;
  const last = all[all.length - 1] ?? null;
  const weakest =
    last && best && last.value < best.value
      ? { characterId: last.characterId, characterName: last.characterName, avatarUrl: last.avatarUrl, value: last.value }
      : null;
  return {
    best: bestBy(characters, value),
    weakest,
    all,
    proficientCount,
    status: coverageStatus(proficientCount),
  };
}

/** `null` when there are no characters — an empty average/best/lowest has nothing meaningful to show. */
export function computePartyPassiveSummary(characters: Character[]): PartyPassiveSummary | null {
  if (characters.length === 0) return null;

  const perceptionValues = characters.map((c) => c.combat.passivePerception);
  const average = Math.round(perceptionValues.reduce((sum, v) => sum + v, 0) / characters.length);

  return {
    perception: {
      ...passiveStatSummary(characters, "perception", (c) => c.combat.passivePerception),
      average,
      lowest: lowestBy(characters, (c) => c.combat.passivePerception),
    },
    insight: passiveStatSummary(characters, "insight", (c) => c.combat.passiveInsight),
    investigation: passiveStatSummary(characters, "investigation", (c) => c.combat.passiveInvestigation),
  };
}

export interface PartySpellSlotHolder {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
  current: number;
  max: number;
}

export interface PartySpellSlotLevel {
  level: number;
  current: number;
  max: number;
  /** Per-character breakdown for this level — the row's hover hint. */
  holders: PartySpellSlotHolder[];
}

export interface PartySpellSlotSummary {
  /** Only levels the party actually has slots at, ascending. */
  levels: PartySpellSlotLevel[];
  totalCurrent: number;
  totalMax: number;
  /** The highest slot level with at least one slot still available, or `null` if none are. */
  highestAvailableLevel: number | null;
}

/**
 * Sums every character's `spellSlots` by level — the party-wide total per
 * level is still the headline number (see the spec's "don't duplicate
 * character cards" constraint), but each level now also keeps its
 * per-character breakdown for the row's hover hint, same idea as a skill
 * row's per-character panel. `null` when nobody in the party has any spell
 * slots at all, so the caller can show one empty state instead of an
 * all-zero table.
 */
export function computePartySpellSlotSummary(characters: Character[]): PartySpellSlotSummary | null {
  const byLevel = new Map<number, { current: number; max: number; holders: PartySpellSlotHolder[] }>();
  for (const c of characters) {
    for (const slot of c.spellSlots) {
      const entry = byLevel.get(slot.level) ?? { current: 0, max: 0, holders: [] };
      entry.current += slot.current;
      entry.max += slot.max;
      entry.holders.push({ characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl, current: slot.current, max: slot.max });
      byLevel.set(slot.level, entry);
    }
  }

  const levels = Array.from(byLevel.entries())
    .map(([level, v]) => ({ level, ...v }))
    .filter((l) => l.max > 0)
    .sort((a, b) => a.level - b.level);
  if (levels.length === 0) return null;

  const available = levels.filter((l) => l.current > 0);

  return {
    levels,
    totalCurrent: levels.reduce((sum, l) => sum + l.current, 0),
    totalMax: levels.reduce((sum, l) => sum + l.max, 0),
    highestAvailableLevel: available.length > 0 ? Math.max(...available.map((l) => l.level)) : null,
  };
}

export interface HeroicInspirationSummary {
  withInspiration: number;
  partySize: number;
  /** Who currently has it — the row's hover hint, same pattern as a defense/language/tool row. */
  holders: CoverageHolder[];
}

/** Counted separately from `resources` below — it lives on `Character.heroicInspiration` (a plain boolean), not in the `resources` array like class/feat resources. */
export function computeHeroicInspirationSummary(characters: Character[]): HeroicInspirationSummary {
  const holders = characters
    .filter((c) => c.heroicInspiration)
    .map((c) => ({ characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl }));
  return {
    withInspiration: holders.length,
    partySize: characters.length,
    holders,
  };
}

export type ResourceStatus = "empty" | "low" | "normal";

export interface PartyResourceEntry {
  id: string;
  resourceName: string;
  characterName: string;
  avatarUrl?: string;
  current: number;
  max: number;
  status: ResourceStatus;
  recovery: RecoveryType;
  /** Where this resource comes from (e.g. "Race", "Class", "Feat") — same convention as `Resource.source`, shown in the row's hover hint. */
  source?: string;
  description?: string;
}

/** A third exhausted or less reads as "running low" — matches the kind of margin a DM would actually flag mid-session ("careful, Rage is down to your last one"), tighter than a straight half. */
const LOW_RESOURCE_THRESHOLD = 1 / 3;

export function computeResourceStatus(current: number, max: number): ResourceStatus {
  if (max <= 0 || current <= 0) return "empty";
  if (current / max <= LOW_RESOURCE_THRESHOLD) return "low";
  return "normal";
}

/**
 * One row per character per resource (not merged by name like inventory items)
 * — `Rage`'s max varies per-character, and the spec's own worked example
 * keeps every resource attributed to its owner rather than summed. Sorted
 * empty-first, then low, then normal, so the resources most worth a DM's
 * attention float to the top instead of getting lost alphabetically.
 */
export function computePartyResourceSummary(characters: Character[]): PartyResourceEntry[] {
  const entries = characters.flatMap((c) =>
    c.resources.map((r): PartyResourceEntry => ({
      id: `${c.id}-${r.id}`,
      resourceName: r.name,
      characterName: c.name,
      avatarUrl: c.avatarUrl,
      current: r.current,
      max: r.max,
      status: computeResourceStatus(r.current, r.max),
      recovery: r.recovery,
      source: r.source,
      description: r.description,
    }))
  );

  const statusOrder: Record<ResourceStatus, number> = { empty: 0, low: 1, normal: 2 };
  return entries.sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status] || a.resourceName.localeCompare(b.resourceName)
  );
}

export interface PartyResourceGauge {
  /** Rounded 0-100 — the mean of every individually-tracked pool's own `current/max` percentage. */
  percent: number;
  /** How many pools went into the average (each spell slot level, Heroic Inspiration, one per character-resource row) — the gauge's own caption context. */
  resourceCount: number;
}

function averagePercent(percentages: number[]): { percent: number; resourceCount: number } | null {
  if (percentages.length === 0) return null;
  const percent = Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
  return { percent, resourceCount: percentages.length };
}

/**
 * One "how much is running low" number for the whole card — the mean of
 * every individually-tracked pool's own percentage (each spell slot level,
 * Heroic Inspiration, one per character-resource row), not a sum of raw
 * charges. Averaging means every pool is one equal "vote" regardless of
 * size: a single fully-spent 2-charge Rage pulls the number down exactly as
 * much as any other tapped-out resource, even sitting next to a 20-slot
 * spell pool that's still mostly full — summing raw charges would let that
 * big pool mask the Rage being gone entirely, which is exactly the kind of
 * thing a DM actually needs the gauge to flag. `null` when there's nothing
 * trackable at all — no gauge to draw.
 */
export function computePartyResourceGauge(characters: Character[]): PartyResourceGauge | null {
  const spellSlots = computePartySpellSlotSummary(characters);
  const inspiration = computeHeroicInspirationSummary(characters);
  const resources = computePartyResourceSummary(characters);

  const percentages: number[] = [];
  if (spellSlots) {
    for (const level of spellSlots.levels) {
      if (level.max > 0) percentages.push((level.current / level.max) * 100);
    }
  }
  if (inspiration.partySize > 0) {
    percentages.push((inspiration.withInspiration / inspiration.partySize) * 100);
  }
  for (const r of resources) {
    if (r.max > 0) percentages.push((r.current / r.max) * 100);
  }

  return averagePercent(percentages);
}

export interface PartyRestRecoveryGauge {
  /** `null` when the party has no resources of this kind tracked at all. */
  shortRest: { percent: number; resourceCount: number } | null;
  longRest: { percent: number; resourceCount: number } | null;
}

/**
 * Splits the same per-resource-percentage averaging `computePartyResourceGauge`
 * uses into two buckets by `Resource.recovery` — "short-rest" (and
 * "encounter", back within the hour regardless) vs everything slower
 * ("long-rest", "dawn", "daily", "custom", "manual", none of which a short
 * rest touches). Answers the DM's actual mid-session question more directly
 * than one blended number: "if we short rest right now, how much of what's
 * running low actually comes back?" Scoped to `resources` only — spell
 * slots and Heroic Inspiration don't carry a `recovery` type in this app's
 * data model. Most spellcasters are long-rest-only, but a Warlock's pact
 * slots recover on a short rest, and without that distinction tracked
 * per-slot, folding spell slots into either bucket would misrepresent them
 * for some characters.
 */
export function computePartyRestRecoveryGauge(characters: Character[]): PartyRestRecoveryGauge {
  const resources = computePartyResourceSummary(characters);
  const shortRestPercentages: number[] = [];
  const longRestPercentages: number[] = [];

  for (const r of resources) {
    if (r.max <= 0) continue;
    const percent = (r.current / r.max) * 100;
    if (r.recovery === "short-rest" || r.recovery === "encounter") {
      shortRestPercentages.push(percent);
    } else {
      longRestPercentages.push(percent);
    }
  }

  return { shortRest: averagePercent(shortRestPercentages), longRest: averagePercent(longRestPercentages) };
}

// ---------------------------------------------------------------------------
// Iteration 3 — Senses, Defenses, Languages & Tools
// ---------------------------------------------------------------------------

const TRACKED_SENSES = ["Darkvision", "Blindsight", "Tremorsense", "Truesight"];

export interface SenseHolder {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
  range: number;
}

export interface SenseCoverageEntry {
  name: string;
  count: number;
  partySize: number;
  best: { characterId: string; characterName: string; avatarUrl?: string; range: number } | null;
  /** Every character who has this sense, with their own range — the row's hover hint. */
  holders: SenseHolder[];
}

export function computeSensesCoverage(characters: Character[]): SenseCoverageEntry[] {
  return TRACKED_SENSES.map((name) => {
    const withSense: SenseHolder[] = [];
    for (const c of characters) {
      const sense = c.senses.find((s: Sense) => s.name === name);
      if (sense) withSense.push({ characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl, range: sense.range });
    }

    const best = withSense.length > 0 ? withSense.reduce((top, x) => (x.range > top.range ? x : top)) : null;

    return {
      name,
      count: withSense.length,
      partySize: characters.length,
      best: best ? { characterId: best.characterId, characterName: best.characterName, avatarUrl: best.avatarUrl, range: best.range } : null,
      holders: withSense,
    };
  });
}

const TRACKED_UTILITY_SPELLS = ["Detect Magic", "See Invisibility"];

export interface UtilitySpellHolder {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
}

export interface UtilitySpellAvailability {
  name: string;
  available: boolean;
  characters: UtilitySpellHolder[];
}

/** Whether anyone in the party currently knows a spell worth flagging for exploration/safety purposes ("can we find that secret door/invisible ambusher") — matched by exact name against `knownSpells`, the same already-synced data the rest of the character card uses. */
export function computeUtilitySpellAvailability(characters: Character[]): UtilitySpellAvailability[] {
  return TRACKED_UTILITY_SPELLS.map((spellName) => {
    const withSpell = characters.filter((c) => c.knownSpells.some((s) => s.name === spellName));
    return {
      name: spellName,
      available: withSpell.length > 0,
      characters: withSpell.map((c) => ({ characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl })),
    };
  });
}

export interface CoverageHolder {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
}

/**
 * Shared shape for every "name → who has it" coverage row — resistances,
 * immunities, languages, and tools all reduce to the same
 * `{name, count, partySize, holders}` structure (see `coverageFromField`
 * below), so they share one type and one row component instead of three
 * near-identical ones.
 */
export interface NamedCoverageEntry {
  name: string;
  count: number;
  partySize: number;
  /** Who actually has it — the row's hover hint, same idea as a skill row's per-character breakdown. */
  holders: CoverageHolder[];
}

function coverageFromField(characters: Character[], field: (c: Character) => string[]): NamedCoverageEntry[] {
  const byName = new Map<string, NamedCoverageEntry>();
  for (const c of characters) {
    for (const name of field(c)) {
      if (!byName.has(name)) byName.set(name, { name, count: 0, partySize: characters.length, holders: [] });
      const entry = byName.get(name)!;
      entry.count += 1;
      entry.holders.push({ characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl });
    }
  }
  return Array.from(byName.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Only resistance types the party actually has — no fixed pinned list. A DM already knows which damage types matter for the current campaign; showing every possible type at 0 just added noise. */
export function computeResistanceCoverage(characters: Character[]): NamedCoverageEntry[] {
  return coverageFromField(characters, (c) => c.resistances);
}

/** Only immunity types the party actually has — same "present only" rule as resistances. Deliberately drops the old fuzzy "Advantage vs Frightened" text-matched row: it wasn't backed by a clean list like `immunities`, and folding it into a "these are simplified to what's actually there" view isn't a natural fit for a derived, imprecise signal. */
export function computeConditionProtectionCoverage(characters: Character[]): NamedCoverageEntry[] {
  return coverageFromField(characters, (c) => c.immunities);
}

/** Only languages actually present in the party — there's no fixed "campaign-relevant" language list to pin at 0 without DM input. */
export function computeLanguageCoverage(characters: Character[]): NamedCoverageEntry[] {
  return coverageFromField(characters, (c) => c.languages);
}

/** Only tools actually present in the party — same "present only" rule as languages/defenses; no more pinning a fixed tool list at 0. */
export function computeToolCoverage(characters: Character[]): NamedCoverageEntry[] {
  return coverageFromField(characters, (c) => c.toolProficiencies);
}

// ---------------------------------------------------------------------------
// Iteration 4 — Spell & Ability Coverage
// ---------------------------------------------------------------------------

export type CoverageCategory =
  | "Healing"
  | "Revive"
  | "AOE Damage"
  | "Single Target Burst"
  | "Control"
  | "Mobility"
  | "Detection"
  | "Protection"
  | "Light / Darkness"
  | "Social"
  | "Stealth"
  | "Survival"
  | "Rerolls"
  | "Reactions"
  | "Anti-Undead"
  | "Anti-Magic";

export const COVERAGE_CATEGORY_ORDER: CoverageCategory[] = [
  "Healing",
  "Revive",
  "AOE Damage",
  "Single Target Burst",
  "Control",
  "Mobility",
  "Detection",
  "Protection",
  "Light / Darkness",
  "Social",
  "Stealth",
  "Survival",
  "Rerolls",
  "Reactions",
  "Anti-Undead",
  "Anti-Magic",
];

/**
 * A plain, hand-authored config map (lowercased spell/ability name →
 * category) — deliberately not AI/semantic matching, per the spec's own
 * restraint for this iteration. Grouped by category (not by name) since
 * that's the shape a DM would actually want to extend: "add another Healing
 * spell" is a one-line addition to the `Healing` array below. A name not in
 * this list simply doesn't show up anywhere in Coverage — there's no
 * "Uncategorized" bucket, matching the spec's "don't show unmapped items"
 * rule.
 *
 * Deliberately excludes anything already tracked as a limited-use
 * `Resource` (Rage, Bardic Inspiration, Lay on Hands' charge pool, Sorcery
 * Points...) — that's already visible by name in the Resources panel above,
 * and duplicating it here would be exactly the kind of redundant listing
 * the spec warns against. Heroic Inspiration is the one explicit exception
 * the spec itself calls out under Rerolls, folded in separately below since
 * it isn't a spell or a `Feature` name at all (it's `Character.heroicInspiration`).
 */
const COVERAGE_CATEGORY_KEYWORDS: Record<CoverageCategory, string[]> = {
  Healing: [
    "cure wounds",
    "healing word",
    "mass cure wounds",
    "mass healing word",
    "prayer of healing",
    "heal",
    "mass heal",
    "aid",
    "lesser restoration",
    "greater restoration",
    "lay on hands: heal",
    "lay on hands: purify poison",
  ],
  Revive: ["revivify", "raise dead", "resurrection", "true resurrection", "reincarnate"],
  "AOE Damage": [
    "fireball",
    "burning hands",
    "thunderwave",
    "cone of cold",
    "ice storm",
    "lightning bolt",
    "chain lightning",
    "meteor swarm",
    "delayed blast fireball",
    "shatter",
    "spirit guardians",
    "sunburst",
    "wall of fire",
  ],
  "Single Target Burst": [
    "guiding bolt",
    "divine smite",
    "thunderous smite",
    "melf's acid arrow",
    "scorching ray",
    "eldritch blast",
    "magic missile",
    "inflict wounds",
    "chromatic orb",
    "disintegrate",
    "finger of death",
    "power word kill",
    "hellish rebuke",
  ],
  Control: [
    "command",
    "hold person",
    "hypnotic pattern",
    "web",
    "sleep",
    "banishment",
    "dominate person",
    "polymorph",
    "slow",
    "faerie fire",
    "entangle",
    "grease",
    "dissonant whispers",
  ],
  Mobility: [
    "misty step",
    "fly",
    "expeditious retreat",
    "longstrider",
    "jump",
    "spider climb",
    "feather fall",
    "freedom of movement",
    "dimension door",
    "teleport",
    "adrenaline rush",
  ],
  Detection: [
    "detect magic",
    "identify",
    "locate object",
    "locate creature",
    "locate person",
    "comprehend languages",
    "alarm",
    "see invisibility",
    "true seeing",
    "divination",
    "find the path",
  ],
  Protection: [
    "shield",
    "mage armor",
    "shield of faith",
    "sanctuary",
    "protection from evil and good",
    "warding bond",
    "heroism",
    "danger sense",
  ],
  "Light / Darkness": ["light", "daylight", "darkness", "dancing lights"],
  Social: ["charm person", "suggestion", "friends", "enthrall", "zone of truth", "vicious mockery"],
  Stealth: ["invisibility", "pass without trace", "nondetection", "disguise self", "minor illusion", "silence"],
  Survival: [
    "goodberry",
    "purify food and drink",
    "create food and water",
    "water breathing",
    "water walk",
    "meld into stone",
    "plant growth",
  ],
  Rerolls: ["lucky"],
  Reactions: ["shield", "counterspell", "war caster", "absorb elements", "hellish rebuke"],
  "Anti-Undead": ["turn undead", "destroy undead", "guardian of faith"],
  "Anti-Magic": ["counterspell", "dispel magic", "antimagic field", "globe of invulnerability"],
};

const COVERAGE_MAP: Record<string, CoverageCategory[]> = {};
for (const category of COVERAGE_CATEGORY_ORDER) {
  for (const keyword of COVERAGE_CATEGORY_KEYWORDS[category]) {
    COVERAGE_MAP[keyword] = [...(COVERAGE_MAP[keyword] ?? []), category];
  }
}

export interface CoverageEntry {
  name: string;
  /** Omitted for the one entry that isn't tied to a single character — Heroic Inspiration, where `characterName` is a party-wide "x/partySize" ratio instead of an owner. */
  characterId?: string;
  characterName: string;
  avatarUrl?: string;
  /** The spell's/feature's own rules text, straight from `KnownSpell.description`/`Feature.description` — the row's hover hint, same source the character's own card already shows. */
  description?: string;
  /** Only set for the Heroic Inspiration entry, whose hover hint needs to list who currently has it — every other entry already carries that in `characterId`/`characterName` since it belongs to exactly one character. */
  holders?: CoverageHolder[];
}

/**
 * Matches every character's `knownSpells` and `features` names (case-
 * insensitively) against `COVERAGE_MAP`. Heroic Inspiration is appended to
 * `Rerolls` separately (see the map's own doc comment) whenever there's a
 * party to report it for, formatted the same "name — owner" shape as every
 * other entry but with the party-wide `x / partySize` count standing in for
 * an owner name.
 */
export function computeSpellAbilityCoverage(characters: Character[]): Record<CoverageCategory, CoverageEntry[]> {
  const coverage = Object.fromEntries(COVERAGE_CATEGORY_ORDER.map((c) => [c, [] as CoverageEntry[]])) as Record<
    CoverageCategory,
    CoverageEntry[]
  >;

  for (const c of characters) {
    const named = [
      ...c.knownSpells.map((s) => ({ name: s.name, description: s.description })),
      ...c.features.map((f) => ({ name: f.name, description: f.description })),
    ];
    const seen = new Set<string>();
    for (const { name, description } of named) {
      const categories = COVERAGE_MAP[name.toLowerCase()];
      if (!categories) continue;
      for (const category of categories) {
        const key = `${category}:${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        coverage[category].push({ name, characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl, description });
      }
    }
  }

  if (characters.length > 0) {
    const inspiration = computeHeroicInspirationSummary(characters);
    coverage.Rerolls.push({
      name: "Heroic Inspiration",
      characterName: `${inspiration.withInspiration}/${inspiration.partySize}`,
      holders: inspiration.holders,
    });
  }

  for (const category of COVERAGE_CATEGORY_ORDER) {
    coverage[category].sort((a, b) => a.name.localeCompare(b.name) || compareCharacterId(a.characterId, b.characterId));
  }

  return coverage;
}

// ---------------------------------------------------------------------------
// Resources & Coverage — merges the Resources list and Spell & Ability
// Coverage into one categorized view: "what can solve this problem, and how
// much of it is left". Lives alongside the two panels above (not replacing
// them yet) while it's being shaped; see PartyToolkit's own doc comment for
// the migration plan.
// ---------------------------------------------------------------------------

/** `CoverageCategory` plus one bucket for tracked resources that don't match a coverage keyword at all — `Rage`, `Sorcery Points`, and the like, which `COVERAGE_CATEGORY_KEYWORDS` deliberately excludes (see its own doc comment) since they used to live in a separate Resources panel. Now that panel is gone, they need somewhere to land instead of disappearing. */
export type ResourceCoverageCategory = CoverageCategory | "Other";

/** Alphabetical (not `COVERAGE_CATEGORY_ORDER`'s hand-picked "most-common-need-first" order) — with `Other` always last, since it's the least specific bucket and shouldn't compete with real categories for the DM's first glance. */
export const RESOURCE_COVERAGE_CATEGORY_ORDER: ResourceCoverageCategory[] = [
  ...[...COVERAGE_CATEGORY_ORDER].sort((a, b) => a.localeCompare(b)),
  "Other",
];

/**
 * How "used up" a single coverage entry is, so the row can show it directly
 * instead of the DM having to cross-reference a separate Resources list:
 * `"pool"` for anything with its own charge count (a `Resource`, or a
 * `KnownSpell`/`Feature` already carrying `current`/`max` because the parser
 * attached a linked charge pool to it); `"slot"` for a spell that costs an
 * ordinary spell slot instead — `remaining` sums that one character's own
 * `spellSlots` at this spell's level or higher (a higher-level slot can
 * always cast a lower-level spell). A cantrip or an unlimited passive
 * ability has no `ResourceAvailability` at all — there's nothing to run out
 * of, so no badge should imply otherwise.
 */
export type ResourceAvailability =
  | { kind: "pool"; current: number; max: number; recovery: RecoveryType }
  | { kind: "slot"; level: number; available: boolean; remaining: number };

export interface ResourceCoverageEntry {
  name: string;
  /** Omitted for the one entry that isn't tied to a single character — Heroic Inspiration, same as `CoverageEntry`. */
  characterId?: string;
  characterName: string;
  avatarUrl?: string;
  description?: string;
  /** Only set for the Heroic Inspiration entry — see `CoverageEntry.holders`. */
  holders?: CoverageHolder[];
  /** Absent for a cantrip or an unlimited passive ability — see `ResourceAvailability`. */
  availability?: ResourceAvailability;
}

function spellResourceAvailability(spell: KnownSpell, character: Character): ResourceAvailability | undefined {
  if (spell.current !== undefined && spell.max !== undefined) {
    return { kind: "pool", current: spell.current, max: spell.max, recovery: spell.recovery ?? "manual" };
  }
  if (spell.level <= 0) return undefined;
  const remaining = character.spellSlots
    .filter((s) => s.level >= spell.level)
    .reduce((sum, s) => sum + s.current, 0);
  return { kind: "slot", level: spell.level, available: remaining > 0, remaining };
}

function featureResourceAvailability(feature: Feature): ResourceAvailability | undefined {
  if (feature.current === undefined || feature.max === undefined) return undefined;
  return { kind: "pool", current: feature.current, max: feature.max, recovery: feature.recovery ?? "manual" };
}

/**
 * Rank used to sort each category's entries — "can actually be used right
 * now" (a non-empty pool, or a spell with a free slot) floats to the top,
 * "tracked but currently empty" sinks below it, and an entry with no
 * `ResourceAvailability` at all (a cantrip, a passive trait) sorts last —
 * it's never urgent information, since it's never "out."
 */
function availabilityRank(availability: ResourceAvailability | undefined): number {
  if (!availability) return 2;
  if (availability.kind === "pool") return availability.current > 0 ? 0 : 1;
  return availability.available ? 0 : 1;
}

/**
 * Same category matching as `computeSpellAbilityCoverage`, but every entry
 * now also carries its own `ResourceAvailability`, and every tracked
 * `Resource` that doesn't match a coverage keyword lands in `Other` instead
 * of vanishing — replaces both the old Resources panel and the old Coverage
 * panel with one categorized, quantity-aware list.
 */
/**
 * D&D Beyond's own "two casting modes" quirk (see `computeSpells`'s doc
 * comment): an innate spell with its own free-cast charge pool shows up
 * *twice* in `knownSpells` under the identical name — once as the charge-
 * pool entry, once as an ordinary "costs a spell slot" entry — because a
 * player can genuinely use either. For this merged list that's one ability
 * with two availabilities, not two abilities: collapses to a single entry
 * per (character, name), preferring the charge-pool reading (`"pool"`) over
 * the slot-cost one (`"slot"`) since it's the more specific "you also get
 * free casts" fact a DM benefits from seeing at a glance.
 */
function dedupeSpellsByName(spells: KnownSpell[], character: Character): Array<{ name: string; description?: string; availability?: ResourceAvailability }> {
  const byName = new Map<string, { name: string; description?: string; availability?: ResourceAvailability }>();
  for (const s of spells) {
    const key = s.name.toLowerCase();
    const availability = spellResourceAvailability(s, character);
    const existing = byName.get(key);
    if (!existing || (availability?.kind === "pool" && existing.availability?.kind !== "pool")) {
      byName.set(key, { name: s.name, description: s.description ?? existing?.description, availability });
    }
  }
  return Array.from(byName.values());
}

/** D&D Beyond folds a charge-pool spell's level into its `Resource` name (`"Faerie Fire (1st)"` — see `computeResources`'s doc comment), which would otherwise read as a second, unrelated ability next to the properly-categorized plain `"Faerie Fire"` entry above. Stripped before the `Other`-bucket dedup check so the two collapse into the one entry the spell/feature pass already placed. */
const RESOURCE_LEVEL_SUFFIX = /\s+\(\d+(?:st|nd|rd|th)\)$/i;

/**
 * Same category matching as `computeSpellAbilityCoverage`, but every entry
 * now also carries its own `ResourceAvailability`, and nothing a character
 * has silently disappears: a tracked `Resource` or known spell that doesn't
 * match a coverage keyword lands in `Other` instead of vanishing — replaces
 * both the old Resources panel and the old Coverage panel with one
 * categorized, quantity-aware list. Features are the one exception left
 * out of `Other` when uncategorized — unlike spells, most of a character's
 * `features` are pure lore/reference entries (race size, ability-score-
 * increase writeups...) never meant to answer "what can I use", and dumping
 * all of them in would bury the entries that do.
 */
export function computeResourceCoverage(characters: Character[]): Record<ResourceCoverageCategory, ResourceCoverageEntry[]> {
  const coverage = Object.fromEntries(
    RESOURCE_COVERAGE_CATEGORY_ORDER.map((c) => [c, [] as ResourceCoverageEntry[]])
  ) as Record<ResourceCoverageCategory, ResourceCoverageEntry[]>;

  // Tracks every (character, base name) already placed somewhere — a
  // category, or `Other` — so the raw `Resource` pass below can skip a
  // charge-pool resource that's just the same ability under its
  // level-suffixed name (see `RESOURCE_LEVEL_SUFFIX`) instead of listing it
  // twice.
  const seenNames = new Set<string>();

  for (const c of characters) {
    const namedSpells = dedupeSpellsByName(c.knownSpells, c);
    const namedFeatures = c.features.map((f) => ({ name: f.name, description: f.description, availability: featureResourceAvailability(f) }));

    const seenInCategory = new Set<string>();
    function place(name: string, description: string | undefined, availability: ResourceAvailability | undefined, fallbackToOther: boolean) {
      const categories = COVERAGE_MAP[name.toLowerCase()];
      if (!categories) {
        if (!fallbackToOther) return;
        seenNames.add(`${c.id}:${name.toLowerCase()}`);
        coverage.Other.push({ name, characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl, description, availability });
        return;
      }
      seenNames.add(`${c.id}:${name.toLowerCase()}`);
      for (const category of categories) {
        const key = `${category}:${name}`;
        if (seenInCategory.has(key)) continue;
        seenInCategory.add(key);
        coverage[category].push({ name, characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl, description, availability });
      }
    }

    for (const { name, description, availability } of namedSpells) place(name, description, availability, true);
    for (const { name, description, availability } of namedFeatures) place(name, description, availability, false);
  }

  if (characters.length > 0) {
    const inspiration = computeHeroicInspirationSummary(characters);
    coverage.Rerolls.push({
      name: "Heroic Inspiration",
      characterName: `${inspiration.withInspiration}/${inspiration.partySize}`,
      holders: inspiration.holders,
    });
  }

  for (const entry of computePartyResourceSummary(characters)) {
    const owner = characters.find((c) => c.name === entry.characterName);
    const baseName = entry.resourceName.replace(RESOURCE_LEVEL_SUFFIX, "");
    if (owner && seenNames.has(`${owner.id}:${baseName.toLowerCase()}`)) continue;
    coverage.Other.push({
      name: entry.resourceName,
      characterId: owner?.id,
      characterName: entry.characterName,
      avatarUrl: entry.avatarUrl,
      description: entry.description,
      availability: { kind: "pool", current: entry.current, max: entry.max, recovery: entry.recovery },
    });
  }

  for (const category of RESOURCE_COVERAGE_CATEGORY_ORDER) {
    coverage[category].sort(
      (a, b) =>
        availabilityRank(a.availability) - availabilityRank(b.availability) ||
        a.name.localeCompare(b.name) ||
        compareCharacterId(a.characterId, b.characterId)
    );
  }

  return coverage;
}
