import { Character, SKILL_ABILITY, SKILL_LABELS, Sense, SkillName, SkillProficiency, formatModifier, skillBonus } from "./types";

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

export interface PartySpellSlotLevel {
  level: number;
  current: number;
  max: number;
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
 * Sums every character's `spellSlots` by level — a per-character breakdown
 * already exists on each character's own card, so this is deliberately just
 * the party-wide total per level (see the spec's "don't duplicate character
 * cards" constraint). `null` when nobody in the party has any spell slots at
 * all, so the caller can show one empty state instead of an all-zero table.
 */
export function computePartySpellSlotSummary(characters: Character[]): PartySpellSlotSummary | null {
  const byLevel = new Map<number, { current: number; max: number }>();
  for (const c of characters) {
    for (const slot of c.spellSlots) {
      const entry = byLevel.get(slot.level) ?? { current: 0, max: 0 };
      entry.current += slot.current;
      entry.max += slot.max;
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
}

/** Counted separately from `resources` below — it lives on `Character.heroicInspiration` (a plain boolean), not in the `resources` array like class/feat resources. */
export function computeHeroicInspirationSummary(characters: Character[]): HeroicInspirationSummary {
  return {
    withInspiration: characters.filter((c) => c.heroicInspiration).length,
    partySize: characters.length,
  };
}

export type ResourceStatus = "empty" | "low" | "normal";

export interface PartyResourceEntry {
  id: string;
  resourceName: string;
  characterName: string;
  current: number;
  max: number;
  status: ResourceStatus;
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
      current: r.current,
      max: r.max,
      status: computeResourceStatus(r.current, r.max),
    }))
  );

  const statusOrder: Record<ResourceStatus, number> = { empty: 0, low: 1, normal: 2 };
  return entries.sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status] || a.resourceName.localeCompare(b.resourceName)
  );
}

// ---------------------------------------------------------------------------
// Iteration 3 — Critical Inventory Highlights, Senses, Defenses, Languages & Tools
// ---------------------------------------------------------------------------

export type CriticalItemCategory = "Healing & Emergency" | "Exploration" | "Survival" | "Magic & Utility";

/**
 * A simple keyword-per-category config map, not semantic/AI matching (same
 * restraint the spec asks for in the later Spell & Ability Coverage
 * iteration) — first category whose keyword appears in the item's name wins,
 * so e.g. a "Scroll of Revivify" is claimed by Healing & Emergency before
 * the more generic "scroll of" Magic & Utility keyword gets a chance.
 * Quest/Special items are deliberately not auto-detected: unlike the other
 * four categories there's no reliable keyword or field to key off (a "quest
 * item" is campaign-specific, not a recognizable name pattern), and inventing
 * a heuristic for it risks silently hiding or miscategorizing real items.
 */
const CRITICAL_ITEM_CATEGORIES: Array<{ category: CriticalItemCategory; keywords: string[] }> = [
  {
    category: "Healing & Emergency",
    keywords: [
      "healing potion",
      "potion of healing",
      "greater healing",
      "superior healing",
      "supreme healing",
      "antitoxin",
      "healer's kit",
      "healers kit",
      "diamond",
      "revivify",
      "raise dead",
      "resurrection",
    ],
  },
  {
    category: "Exploration",
    keywords: [
      "rope",
      "climber's kit",
      "climbers kit",
      "grappling hook",
      "crowbar",
      "thieves' tools",
      "thieves tools",
      "torch",
      "lantern",
      "oil",
    ],
  },
  {
    category: "Survival",
    keywords: ["rations", "waterskin", "cold weather gear", "tent", "bedroll", "firewood", "fuel", "snowshoes"],
  },
  {
    category: "Magic & Utility",
    keywords: ["spell scroll", "scroll of", "wand", "pearl of power", "identify"],
  },
];

function classifyCriticalItem(name: string): CriticalItemCategory | null {
  const lower = name.toLowerCase();
  for (const { category, keywords } of CRITICAL_ITEM_CATEGORIES) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return null;
}

export interface CriticalItemHolder {
  characterName: string;
  quantity: number;
}

export interface CriticalItemEntry {
  category: CriticalItemCategory;
  name: string;
  totalQuantity: number;
  holders: CriticalItemHolder[];
}

/**
 * Deliberately does not duplicate the full party inventory (`InventoryOverview`
 * already covers that) — only items matching a critical-category keyword
 * make it in, deduped by lowercased name the same way `InventoryOverview`
 * dedupes items across owners.
 */
export function computeCriticalInventoryHighlights(characters: Character[]): CriticalItemEntry[] {
  const byName = new Map<string, CriticalItemEntry>();
  for (const c of characters) {
    for (const item of c.inventory) {
      const category = classifyCriticalItem(item.name);
      if (!category) continue;
      const key = item.name.trim().toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, { category, name: item.name, totalQuantity: 0, holders: [] });
      }
      const entry = byName.get(key)!;
      entry.totalQuantity += item.quantity;
      entry.holders.push({ characterName: c.name, quantity: item.quantity });
    }
  }

  const categoryOrder = CRITICAL_ITEM_CATEGORIES.map((c) => c.category);
  return Array.from(byName.values()).sort(
    (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name)
  );
}

const TRACKED_SENSES = ["Darkvision", "Blindsight", "Tremorsense", "Truesight"];

export interface SenseCoverageEntry {
  name: string;
  count: number;
  partySize: number;
  best: { characterName: string; range: number } | null;
}

export function computeSensesCoverage(characters: Character[]): SenseCoverageEntry[] {
  return TRACKED_SENSES.map((name) => {
    const withSense = characters
      .map((c) => ({ characterName: c.name, sense: c.senses.find((s: Sense) => s.name === name) }))
      .filter((x): x is { characterName: string; sense: Sense } => x.sense !== undefined);

    const best =
      withSense.length > 0
        ? withSense.reduce((top, x) => (x.sense.range > top.sense.range ? x : top))
        : null;

    return {
      name,
      count: withSense.length,
      partySize: characters.length,
      best: best ? { characterName: best.characterName, range: best.sense.range } : null,
    };
  });
}

const TRACKED_UTILITY_SPELLS = ["Detect Magic", "See Invisibility"];

export interface UtilitySpellAvailability {
  name: string;
  available: boolean;
  characterNames: string[];
}

/** Whether anyone in the party currently knows a spell worth flagging for exploration/safety purposes — matched against `knownSpells`, the same already-synced data the rest of the character card uses. */
export function computeUtilitySpellAvailability(characters: Character[]): UtilitySpellAvailability[] {
  return TRACKED_UTILITY_SPELLS.map((spellName) => {
    const withSpell = characters.filter((c) => c.knownSpells.some((s) => s.name === spellName));
    return { name: spellName, available: withSpell.length > 0, characterNames: withSpell.map((c) => c.name) };
  });
}

export interface DefenseCoverageEntry {
  name: string;
  count: number;
  partySize: number;
}

/** Pinned so the campaign-relevant types still show at 0/partySize instead of silently disappearing — matches the spec's own "show even if coverage is 0" requirement. */
const PINNED_RESISTANCES = ["Cold", "Poison", "Fire", "Necrotic"];

export function computeResistanceCoverage(characters: Character[]): DefenseCoverageEntry[] {
  return PINNED_RESISTANCES.map((name) => ({
    name,
    count: characters.filter((c) => c.resistances.includes(name)).length,
    partySize: characters.length,
  }));
}

const PINNED_CONDITION_IMMUNITIES = ["Charmed", "Poisoned"];

/**
 * "Advantage vs Frightened" is matched fuzzily (case-insensitive substring
 * against the free-text `advantages` list) since that field is assembled
 * from D&D Beyond's own rules-sentence fragments rather than a clean
 * enum — see `computeAdvantages`'s own doc comment. Charmed/Poisoned
 * immunity, by contrast, matches the (clean, enum-like) `immunities` list
 * exactly.
 */
export function computeConditionProtectionCoverage(characters: Character[]): DefenseCoverageEntry[] {
  const frightened: DefenseCoverageEntry = {
    name: "Advantage vs Frightened",
    count: characters.filter((c) =>
      c.advantages.some((a) => /^advantage/i.test(a) && /frightened/i.test(a))
    ).length,
    partySize: characters.length,
  };
  const immunities = PINNED_CONDITION_IMMUNITIES.map((name) => ({
    name: `Immunity to ${name}`,
    count: characters.filter((c) => c.immunities.includes(name)).length,
    partySize: characters.length,
  }));
  return [frightened, ...immunities];
}

export interface LanguageCoverageEntry {
  name: string;
  count: number;
  partySize: number;
}

/** Only languages actually present in the party — unlike defenses/tools below, there's no fixed "campaign-relevant" language list to pin at 0 without DM input, which the spec explicitly keeps out of scope for now. */
export function computeLanguageCoverage(characters: Character[]): LanguageCoverageEntry[] {
  const counts = new Map<string, number>();
  for (const c of characters) {
    for (const lang of c.languages) counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count, partySize: characters.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface ToolCoverageEntry {
  name: string;
  characterNames: string[];
}

/** Shown even with no owner (`characterNames: []`) — these four come up often enough at the table that a DM benefits from seeing the gap, same reasoning as the pinned defenses above. */
const PINNED_TOOLS = ["Thieves' Tools", "Herbalism Kit", "Navigator's Tools", "Vehicles (Land)"];

export function computeToolCoverage(characters: Character[]): ToolCoverageEntry[] {
  const owners = new Map<string, string[]>();
  for (const name of PINNED_TOOLS) owners.set(name, []);
  for (const c of characters) {
    for (const tool of c.toolProficiencies) {
      if (!owners.has(tool)) owners.set(tool, []);
      owners.get(tool)!.push(c.name);
    }
  }
  return Array.from(owners.entries())
    .map(([name, characterNames]) => ({ name, characterNames }))
    .sort((a, b) => {
      if ((a.characterNames.length > 0) !== (b.characterNames.length > 0)) {
        return a.characterNames.length > 0 ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}
