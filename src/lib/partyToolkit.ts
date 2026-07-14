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

/** One resource feeding a Short/Long Rest bucket — the bar's hover hint breakdown, same idea as `PartySpellSlotHolder` for a spell slot level. */
export interface RestRecoveryEntry {
  id: string;
  characterName: string;
  avatarUrl?: string;
  resourceName: string;
  current: number;
  max: number;
}

export interface PartyRestRecoveryBucket {
  percent: number;
  resourceCount: number;
  entries: RestRecoveryEntry[];
}

export interface PartyRestRecoveryGauge {
  /** `null` when the party has no resources of this kind tracked at all. */
  shortRest: PartyRestRecoveryBucket | null;
  longRest: PartyRestRecoveryBucket | null;
  /** Both buckets' entries combined into one overall average — same rollup the Spell Slots histogram already shows as its "Total" column. */
  total: PartyRestRecoveryBucket | null;
}

function buildRestBucket(entries: RestRecoveryEntry[]): PartyRestRecoveryBucket | null {
  if (entries.length === 0) return null;
  const percent = Math.round(entries.reduce((sum, e) => sum + (e.current / e.max) * 100, 0) / entries.length);
  return { percent, resourceCount: entries.length, entries };
}

/**
 * Splits per-resource-percentage averaging (each pool is one equal "vote",
 * not summed raw charges — a single fully-spent 2-charge Rage pulls the
 * average down exactly as much as any other tapped-out resource, instead of
 * getting masked by sitting next to a 20-slot spell pool that's still
 * mostly full) into two buckets by `Resource.recovery` — "short-rest" (and
 * "encounter", back within the hour regardless) vs everything slower
 * ("long-rest", "dawn", "daily", "custom", "manual", none of which a short
 * rest touches). Answers the DM's actual mid-session question more directly
 * than one blended number: "if we short rest right now, how much of what's
 * running low actually comes back?" Scoped to `resources` only — spell
 * slots and Heroic Inspiration don't carry a `recovery` type in this app's
 * data model. Most spellcasters are long-rest-only, but a Warlock's pact
 * slots recover on a short rest, and without that distinction tracked
 * per-slot, folding spell slots into either bucket would misrepresent them
 * for some characters. Each bucket keeps its contributing resources
 * (`entries`) so the bar's hover hint can show the same kind of per-holder
 * breakdown a spell slot level's hint already does.
 */
export function computePartyRestRecoveryGauge(characters: Character[]): PartyRestRecoveryGauge {
  const resources = computePartyResourceSummary(characters);
  const shortRestEntries: RestRecoveryEntry[] = [];
  const longRestEntries: RestRecoveryEntry[] = [];

  for (const r of resources) {
    if (r.max <= 0) continue;
    const entry: RestRecoveryEntry = {
      id: r.id,
      characterName: r.characterName,
      avatarUrl: r.avatarUrl,
      resourceName: r.resourceName,
      current: r.current,
      max: r.max,
    };
    if (r.recovery === "short-rest" || r.recovery === "encounter") {
      shortRestEntries.push(entry);
    } else {
      longRestEntries.push(entry);
    }
  }

  return {
    shortRest: buildRestBucket(shortRestEntries),
    longRest: buildRestBucket(longRestEntries),
    total: buildRestBucket([...shortRestEntries, ...longRestEntries]),
  };
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
// Coverage category taxonomy — the keyword map below feeds
// `computeResourceCoverage` further down (the old, now-removed Spell &
// Ability Coverage panel used to be its other consumer).
// ---------------------------------------------------------------------------

export type CoverageCategory =
  | "Healing"
  | "Damage AOE"
  | "Damage Single Target"
  | "Control"
  | "Summoning"
  | "Mobility"
  | "Detection"
  | "Protection"
  | "Social"
  | "Stealth"
  | "Survival"
  | "Rerolls"
  | "Reactions"
  | "Anti-Undead"
  | "Anti-Magic";

export const COVERAGE_CATEGORY_ORDER: CoverageCategory[] = [
  "Healing",
  "Damage AOE",
  "Damage Single Target",
  "Control",
  "Summoning",
  "Mobility",
  "Detection",
  "Protection",
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
    "lay on hands: healing pool",
    "aura of vitality",
  ],
  "Damage AOE": [
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
    "cloud of daggers",
  ],
  "Damage Single Target": [
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
    "fire bolt",
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
    "blindness/deafness",
    "heat metal",
  ],
  // No keyword fallback: unlike every other category here, this one didn't
  // exist before D&D Beyond's `Summoning` tag was mapped to it (see
  // `SPELL_TAG_TO_CATEGORY` below) — there's no legacy name list to carry
  // forward, and the tag itself covers the whole family reliably (Find
  // Familiar, Find Steed, Summon Celestial/Beast/Fiend/Fey/Undead...).
  Summoning: [],
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
    "find steed",
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
    "mirror image",
    "blade ward",
    "bless",
  ],
  Social: ["charm person", "suggestion", "friends", "enthrall", "zone of truth", "vicious mockery", "message"],
  Stealth: ["invisibility", "pass without trace", "nondetection", "disguise self", "minor illusion", "silence"],
  Survival: [
    "goodberry",
    "purify food and drink",
    "create food and water",
    "water breathing",
    "water walk",
    "meld into stone",
    "plant growth",
    "relentless endurance",
  ],
  Rerolls: ["lucky", "luck points"],
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

/**
 * D&D Beyond's own spell `tags` (confirmed against real exports — 21
 * distinct values seen across several characters' full spell lists), mapped
 * to the categories they cleanly correspond to. `Utility`, `Combat`,
 * `Creation`, `Environment` don't map onto any one of our categories — too
 * generic to mean any one specific thing (see `computeSpellCategories`'s own
 * doc comment). `"Damage"` is deliberately absent here — it needs
 * `isAreaEffect` to pick a side (see `computeSpellCategories`), not a flat
 * mapping. `Light / Darkness` and `Revive` used to exist as categories too,
 * but no D&D Beyond tag ever reached them (they only worked via the
 * name-keyword fallback below) — removed rather than left permanently
 * keyword-only, per the same principle that killed the keyword-for-tagged-
 * spells path.
 */
const SPELL_TAG_TO_CATEGORY: Record<string, CoverageCategory[]> = {
  Healing: ["Healing"],
  Control: ["Control"],
  Debuff: ["Control"],
  Summoning: ["Summoning"],
  Teleportation: ["Mobility"],
  Movement: ["Mobility"],
  Detection: ["Detection"],
  // Spelled exactly as D&D Beyond returns it (confirmed against a real
  // synced spell list) — not a typo on our side.
  Foreknoweledge: ["Detection"],
  Warding: ["Protection"],
  Buff: ["Protection"],
  Social: ["Social"],
  Communication: ["Social"],
  Deception: ["Social"],
  Negation: ["Anti-Magic"],
  Contaminated: ["Survival"],
};

/**
 * Fixed ranking used to resolve a spell/feature that technically matches
 * more than one category down to exactly one — a DM sees each ability
 * filed under a single, predictable category instead of it being listed
 * everywhere it happens to apply.
 *
 * `Reactions` ranks first, deliberately above every "what does this solve"
 * category: it answers a different question — *when* can this be used, not
 * what it does — and it's a narrow category (few real members) that would
 * empty out if it always lost to a content category. Shield, Hellish
 * Rebuke, and Counterspell all *also* match a content category (see
 * `COVERAGE_CATEGORY_KEYWORDS`'s own overlapping keyword entries — the same
 * name deliberately listed under two categories); ranking Reactions first
 * keeps that list complete rather than shrinking it to just War Caster.
 * `Anti-Undead`/`Anti-Magic`/`Summoning` are the next-narrowest,
 * single-purpose categories, ranked ahead of the broad ones for the same
 * reason. Nothing past that currently ever actually conflicts (confirmed:
 * no keyword or tag maps two different non-Reaction categories to the same
 * spell/feature today) — their order here is a sensible default for
 * whatever overlap shows up later, not something already exercised.
 */
const COVERAGE_CATEGORY_PRIORITY: CoverageCategory[] = [
  "Reactions",
  "Anti-Undead",
  "Anti-Magic",
  "Summoning",
  "Healing",
  "Damage AOE",
  "Damage Single Target",
  "Control",
  "Protection",
  "Mobility",
  "Detection",
  "Social",
  "Stealth",
  "Survival",
  "Rerolls",
];

/** Picks the single highest-priority category (per `COVERAGE_CATEGORY_PRIORITY`) out of a set of matches, or none — the one place both `computeSpellCategories` and `computeFeatureCategories` funnel through so neither can return more than one category. */
function pickPrimaryCategory(categories: Iterable<CoverageCategory>): CoverageCategory[] {
  const matched = new Set(categories);
  for (const category of COVERAGE_CATEGORY_PRIORITY) {
    if (matched.has(category)) return [category];
  }
  return [];
}

/**
 * Resolves a known spell's coverage category. D&D Beyond's own `tags` (via
 * `SPELL_TAG_TO_CATEGORY`) are the sole signal once a spell has any —
 * `isAreaEffect` splits a `"Damage"`-tagged spell into `Damage AOE` vs
 * `Damage Single Target` (the tag alone doesn't distinguish them), and
 * `isReaction` adds `Reactions` (same `activationType === 4` convention
 * `Feature.group` already uses). The name-keyword lookup (`COVERAGE_MAP`) is
 * a fallback for the one case tags can't cover at all: a spell synced before
 * these fields existed, or genuinely untagged by D&D Beyond (`tags` absent
 * or empty). A spell that *has* tags never falls back to it — no custom
 * per-spell-name logic once D&D Beyond has actually told us what a spell is.
 * Whatever ends up matching more than one category (e.g. a Warding-tagged
 * reaction spell) is resolved to exactly one via `pickPrimaryCategory`.
 */
function computeSpellCategories(spell: Pick<KnownSpell, "name" | "tags" | "isAreaEffect" | "isReaction">): CoverageCategory[] {
  const categories = new Set<CoverageCategory>();
  for (const tag of spell.tags ?? []) {
    for (const category of SPELL_TAG_TO_CATEGORY[tag] ?? []) categories.add(category);
  }
  if (spell.tags?.includes("Damage")) {
    categories.add(spell.isAreaEffect ? "Damage AOE" : "Damage Single Target");
  }
  if (spell.isReaction) categories.add("Reactions");
  if (!spell.tags || spell.tags.length === 0) {
    for (const category of COVERAGE_MAP[spell.name.toLowerCase()] ?? []) categories.add(category);
  }
  return pickPrimaryCategory(categories);
}

/**
 * A `Feature` (class feature, racial trait, feat) has no equivalent of a
 * spell's D&D Beyond `tags` — nothing says *what kind* of ability it is,
 * only `group` (how it's activated) and `originType` (where it's from).
 * Hand-typing every 5e feature's exact name into `COVERAGE_CATEGORY_KEYWORDS`
 * (today's only path, via `COVERAGE_MAP[name.toLowerCase()]`) doesn't scale
 * to the size of that list, so most features that *should* show up in
 * Coverage simply don't. This is a small, deliberately swappable first pass
 * at closing that gap: a handful of hand-picked trigger phrases per
 * category, matched as plain lowercase substrings against the feature's own
 * rules text (already parsed and available as `description`).
 *
 * Both this map and `FEATURE_CATEGORY_TRIGGER_PRIORITY` below are pure data,
 * and `computeFeatureCategories` is the *only* place that reads them — the
 * point of keeping the mechanism this narrow is that replacing it later (a
 * DM-assigned override, a richer heuristic, whatever comes next) only means
 * changing what's inside that one function. Every caller already treats a
 * feature as "however many categories `computeFeatureCategories` says",
 * never how it got there.
 */
const FEATURE_DESCRIPTION_TRIGGERS: Partial<Record<CoverageCategory, string[]>> = {
  Healing: ["regain hit points", "regains hit points", "regain a number of hit points"],
  Protection: ["reduce the damage", "resistance to", "advantage on saving throws", "you can't be charmed"],
  Mobility: [
    "your walking speed increases",
    "your speed increases",
    "you can move up to",
    "without provoking opportunity attacks",
    "fly speed",
    "climbing speed",
    "swimming speed",
  ],
  Detection: ["you can sense", "you know the direction", "detect the presence of"],
  Control: ["target must succeed on a", "frightened of you", "becomes paralyzed"],
  Survival: ["cure disease", "neutralize poison", "immune to disease", "immune to poison"],
};

/**
 * Checked in this order — the first category (if any) whose trigger phrase
 * appears in the description wins, at most one category per feature. Free
 * text is noisy enough (a phrase can plausibly appear for reasons other
 * than the category it's listed under) that "all matches" would mean
 * stacking guesses on top of guesses; a single best guess, cleanly
 * attributable to one phrase, is both simpler and more honest about how
 * approximate this is.
 */
const FEATURE_CATEGORY_TRIGGER_PRIORITY: CoverageCategory[] = ["Healing", "Protection", "Mobility", "Detection", "Control", "Survival"];

/**
 * Resolves a feature's coverage categories. The existing name-keyword lookup
 * (`COVERAGE_MAP`, shared with spells' own fallback) runs first and wins
 * outright when it hits — that's how the "Lucky"/"Luck Points" feats already
 * land in Rerolls today, and this doesn't change that. `group === "reaction"`
 * (the one *structured* signal available, same `activationType` convention
 * `KnownSpell.isReaction` uses) is checked next: a reaction ability is most
 * usefully filed by "when can I use this", same reasoning already applied to
 * spells. Only once both of those come up empty does the description-trigger
 * heuristic above get a turn — it's the least reliable signal, so it's the
 * last resort, not the first guess. A `COVERAGE_MAP` hit still goes through
 * `pickPrimaryCategory` — the same keyword can be listed under two
 * categories (see `COVERAGE_CATEGORY_PRIORITY`'s own doc comment), and a
 * feature is no more exempt from "exactly one category" than a spell is.
 */
function computeFeatureCategories(feature: Pick<Feature, "name" | "description" | "group">): CoverageCategory[] {
  const byName = COVERAGE_MAP[feature.name.toLowerCase()];
  if (byName && byName.length > 0) return pickPrimaryCategory(byName);
  if (feature.group === "reaction") return ["Reactions"];
  const text = feature.description?.toLowerCase();
  if (!text) return [];
  for (const category of FEATURE_CATEGORY_TRIGGER_PRIORITY) {
    const triggers = FEATURE_DESCRIPTION_TRIGGERS[category] ?? [];
    if (triggers.some((phrase) => text.includes(phrase))) return [category];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Resources & Coverage — merges what used to be two separate panels (a
// Resources list, and a `computeSpellAbilityCoverage`-driven Spell & Ability
// Coverage panel, both since removed) into one categorized view: "what can
// solve this problem, and how much of it is left".
// ---------------------------------------------------------------------------

/** `CoverageCategory` plus one bucket for tracked resources that don't match a coverage keyword at all — `Rage`, `Sorcery Points`, and the like, which `COVERAGE_CATEGORY_KEYWORDS` deliberately excludes (see its own doc comment) since they used to live in a separate Resources panel. Now that panel is gone, they need somewhere to land instead of disappearing. Named `"Resources"` rather than `"Other"` — it's usually the single biggest bucket (every personal charge pool that doesn't map to a specific combat need lands here), so it reads better as its own named thing than as a vague leftover. */
export type ResourceCoverageCategory = CoverageCategory | "Resources";

/**
 * `"Resources"` first, then the rest of `COVERAGE_CATEGORY_ORDER` alphabetically.
 * It was tried last (least specific bucket, shouldn't compete with real
 * categories for the first glance) but it's also consistently the largest —
 * the column-balancing layout below always ends up placing it first anyway
 * (heaviest category claims the first column), so fighting that by sorting
 * it last just made the two disagree. Leading with it matches what a DM
 * actually sees.
 */
export const RESOURCE_COVERAGE_CATEGORY_ORDER: ResourceCoverageCategory[] = [
  "Resources",
  ...[...COVERAGE_CATEGORY_ORDER].sort((a, b) => a.localeCompare(b)),
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
  /** Omitted for the one entry that isn't tied to a single character — Heroic Inspiration. */
  characterId?: string;
  characterName: string;
  avatarUrl?: string;
  description?: string;
  /** Only set for the Heroic Inspiration entry — see `CoverageEntry.holders`. */
  holders?: CoverageHolder[];
  /** Absent for a cantrip or an unlimited passive ability — see `ResourceAvailability`. */
  availability?: ResourceAvailability;
  /** What kind of thing this is — the hint panel's own "type" line, same idea as `PartyResourceEntry.source` on the old Resources panel but generalized to spells/features too. Absent for the Heroic Inspiration entry, which isn't any of the three. */
  kind?: "spell" | "feature" | "resource";
  /** Where it comes from (e.g. "Class", "Race", "Feat") — `KnownSpell.source`/`Feature.source`/`Resource.source` passed straight through, same convention as the old Resources panel's hover hint. */
  source?: string;
  /** A spell at level 0 — the row's "no availability badge" is otherwise indistinguishable from an unlimited passive `Feature`, which reads as a gap rather than an intentional cantrip. */
  isCantrip?: boolean;
  /** `kind === "spell"` only — D&D Beyond's own raw tags, passed straight through so the hint panel can show a DM directly whether a spell actually carries any (rather than the category result alone, which can't distinguish "no tags at all" from "tagged but none of them map to a category"). Absent (not just empty) for a spell synced before this field existed. */
  tags?: string[];
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
 * Same category matching as `computeSpellAbilityCoverage`, but every entry
 * now also carries its own `ResourceAvailability`, and every tracked
 * `Resource` that doesn't match a coverage keyword lands in `Resources` instead
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
interface DedupedSpell {
  name: string;
  description?: string;
  source?: string;
  isCantrip: boolean;
  tags?: string[];
  isAreaEffect?: boolean;
  isReaction?: boolean;
  availability?: ResourceAvailability;
}

function dedupeSpellsByName(spells: KnownSpell[], character: Character): DedupedSpell[] {
  const byName = new Map<string, DedupedSpell>();
  for (const s of spells) {
    const key = s.name.toLowerCase();
    const availability = spellResourceAvailability(s, character);
    const existing = byName.get(key);
    if (!existing || (availability?.kind === "pool" && existing.availability?.kind !== "pool")) {
      byName.set(key, {
        name: s.name,
        description: s.description ?? existing?.description,
        source: s.source,
        isCantrip: s.level <= 0,
        tags: s.tags ?? existing?.tags,
        isAreaEffect: s.isAreaEffect ?? existing?.isAreaEffect,
        isReaction: s.isReaction ?? existing?.isReaction,
        availability,
      });
    }
  }
  return Array.from(byName.values());
}

/** D&D Beyond folds a charge-pool spell's level into its `Resource` name (`"Faerie Fire (1st)"` — see `computeResources`'s doc comment), which would otherwise read as a second, unrelated ability next to the properly-categorized plain `"Faerie Fire"` entry above. Stripped before the `Resources`-bucket dedup check so the two collapse into the one entry the spell/feature pass already placed. */
const RESOURCE_LEVEL_SUFFIX = /\s+\(\d+(?:st|nd|rd|th)\)$/i;

/**
 * Same category matching as `computeSpellAbilityCoverage`, but every entry
 * now also carries its own `ResourceAvailability`, and nothing a character
 * has silently disappears: a tracked `Resource` or known spell that doesn't
 * match a coverage keyword lands in `Resources` instead of vanishing — replaces
 * both the old Resources panel and the old Coverage panel with one
 * categorized, quantity-aware list. Features are the one exception left
 * out of `Resources` when uncategorized — unlike spells, most of a character's
 * `features` are pure lore/reference entries (race size, ability-score-
 * increase writeups...) never meant to answer "what can I use", and dumping
 * all of them in would bury the entries that do.
 */
export function computeResourceCoverage(characters: Character[]): Record<ResourceCoverageCategory, ResourceCoverageEntry[]> {
  const coverage = Object.fromEntries(
    RESOURCE_COVERAGE_CATEGORY_ORDER.map((c) => [c, [] as ResourceCoverageEntry[]])
  ) as Record<ResourceCoverageCategory, ResourceCoverageEntry[]>;

  // Tracks every (character, base name) already placed somewhere — a
  // category, or `Resources` — so the raw `Resource` pass below can skip a
  // charge-pool resource that's just the same ability under its
  // level-suffixed name (see `RESOURCE_LEVEL_SUFFIX`) instead of listing it
  // twice.
  const seenNames = new Set<string>();

  for (const c of characters) {
    const namedSpells = dedupeSpellsByName(c.knownSpells, c);
    const namedFeatures = c.features.map((f) => ({
      name: f.name,
      description: f.description,
      source: f.source,
      group: f.group,
      availability: featureResourceAvailability(f),
    }));

    const seenInCategory = new Set<string>();
    function place(
      name: string,
      description: string | undefined,
      availability: ResourceAvailability | undefined,
      fallbackToOther: boolean,
      kind: "spell" | "feature",
      source: string | undefined,
      isCantrip: boolean,
      categories: CoverageCategory[],
      tags: string[] | undefined
    ) {
      if (categories.length === 0) {
        if (!fallbackToOther) return;
        seenNames.add(`${c.id}:${name.toLowerCase()}`);
        coverage.Resources.push({ name, characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl, description, availability, kind, source, isCantrip, tags });
        return;
      }
      seenNames.add(`${c.id}:${name.toLowerCase()}`);
      for (const category of categories) {
        const key = `${category}:${name}`;
        if (seenInCategory.has(key)) continue;
        seenInCategory.add(key);
        coverage[category].push({ name, characterId: c.id, characterName: c.name, avatarUrl: c.avatarUrl, description, availability, kind, source, isCantrip, tags });
      }
    }

    for (const spell of namedSpells) {
      place(spell.name, spell.description, spell.availability, true, "spell", spell.source, spell.isCantrip, computeSpellCategories(spell), spell.tags);
    }
    for (const { name, description, source, group, availability } of namedFeatures) {
      place(name, description, availability, false, "feature", source, false, computeFeatureCategories({ name, description, group }), undefined);
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

  for (const entry of computePartyResourceSummary(characters)) {
    const owner = characters.find((c) => c.name === entry.characterName);
    const baseName = entry.resourceName.replace(RESOURCE_LEVEL_SUFFIX, "");
    if (owner && seenNames.has(`${owner.id}:${baseName.toLowerCase()}`)) continue;
    coverage.Resources.push({
      name: entry.resourceName,
      characterId: owner?.id,
      characterName: entry.characterName,
      avatarUrl: entry.avatarUrl,
      description: entry.description,
      kind: "resource",
      source: entry.source,
      availability: { kind: "pool", current: entry.current, max: entry.max, recovery: entry.recovery },
    });
  }

  for (const category of RESOURCE_COVERAGE_CATEGORY_ORDER) {
    coverage[category].sort((a, b) => a.name.localeCompare(b.name) || compareCharacterId(a.characterId, b.characterId));
  }

  return coverage;
}
