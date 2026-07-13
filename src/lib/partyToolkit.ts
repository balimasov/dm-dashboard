import {
  Character,
  RecoveryType,
  SKILL_ABILITY,
  SKILL_LABELS,
  Sense,
  SkillName,
  SkillProficiency,
  formatModifier,
  skillBonus,
} from "./types";

export type SkillCoverageStatus = "Strong" | "Medium" | "Weak";

export interface SkillPartyScore {
  characterId: string;
  characterName: string;
  avatarUrl?: string;
  modifier: number;
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
    };
  });

  const proficientCount = scores.filter((s) => s.proficient).length;
  const sorted = [...scores].sort((a, b) => b.modifier - a.modifier || a.characterName.localeCompare(b.characterName));
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
    },
    weakest: weakest && {
      characterId: weakest.characterId,
      characterName: weakest.characterName,
      avatarUrl: weakest.avatarUrl,
      modifier: weakest.modifier,
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

export interface PassiveBest {
  characterName: string;
  avatarUrl?: string;
  value: number;
}

export interface PassiveCharacterScore {
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
  return { characterName: top.name, avatarUrl: top.avatarUrl, value: value(top) };
}

function lowestBy(characters: Character[], value: (c: Character) => number): PassiveBest {
  const bottom = characters.reduce((worst, c) => (value(c) < value(worst) ? c : worst));
  return { characterName: bottom.name, avatarUrl: bottom.avatarUrl, value: value(bottom) };
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
        characterName: c.name,
        avatarUrl: c.avatarUrl,
        value: value(c),
        proficient: Boolean(prof?.proficient || prof?.expertise),
      };
    })
    .sort((a, b) => b.value - a.value || a.characterName.localeCompare(b.characterName));
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
      ? { characterName: last.characterName, avatarUrl: last.avatarUrl, value: last.value }
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
  best: { characterName: string; avatarUrl?: string; range: number } | null;
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
      best: best ? { characterName: best.characterName, avatarUrl: best.avatarUrl, range: best.range } : null,
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
    });
  }

  for (const category of COVERAGE_CATEGORY_ORDER) {
    coverage[category].sort((a, b) => a.name.localeCompare(b.name) || a.characterName.localeCompare(b.characterName));
  }

  return coverage;
}
