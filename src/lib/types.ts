export type RecoveryType =
  | "short-rest"
  | "long-rest"
  | "dawn"
  | "daily"
  | "encounter"
  | "custom"
  | "manual";

export const RECOVERY_LABELS: Record<RecoveryType, string> = {
  "short-rest": "Short Rest",
  "long-rest": "Long Rest",
  dawn: "Dawn",
  daily: "Daily",
  encounter: "Per Encounter",
  custom: "Custom",
  manual: "Manual",
};

/** Abbreviated form used in the compact character card (full names stay in the edit form's dropdown). */
export const RECOVERY_SHORT_LABELS: Record<RecoveryType, string> = {
  "short-rest": "SR",
  "long-rest": "LR",
  dawn: "Dawn",
  daily: "Daily",
  encounter: "Enc",
  custom: "Custom",
  manual: "M",
};

export interface Resource {
  id: string;
  name: string;
  current: number;
  max: number;
  recovery: RecoveryType;
  note?: string;
  /** Short rules blurb shown as a hover tooltip on the card (from D&D Beyond, or typed manually). */
  description?: string;
}

export interface SpellSlotLevel {
  level: number;
  current: number;
  max: number;
}

export interface SpellcastingStats {
  modifier: number;
  attack: number;
  saveDc: number;
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Sense {
  name: string;
  range: number;
}

export type SkillName =
  | "acrobatics"
  | "animal-handling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleight-of-hand"
  | "stealth"
  | "survival";

export const SKILL_ABILITY: Record<SkillName, keyof AbilityScores> = {
  acrobatics: "dex",
  "animal-handling": "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  "sleight-of-hand": "dex",
  stealth: "dex",
  survival: "wis",
};

export const SKILL_LABELS: Record<SkillName, string> = {
  acrobatics: "Acrobatics",
  "animal-handling": "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  "sleight-of-hand": "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
};

/** Short form used anywhere space is tight (Senses pills, Skills pills) — full name still shows on hover. */
export const SKILL_ABBR: Record<SkillName, string> = {
  acrobatics: "Acro",
  "animal-handling": "AnHa",
  arcana: "Arca",
  athletics: "Athl",
  deception: "Dece",
  history: "Hist",
  insight: "Ins",
  intimidation: "Inti",
  investigation: "Inv",
  medicine: "Medi",
  nature: "Nat",
  perception: "Perc",
  performance: "Perf",
  persuasion: "Pers",
  religion: "Reli",
  "sleight-of-hand": "SoH",
  stealth: "Stea",
  survival: "Surv",
};

export type ItemRarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Very Rare"
  | "Legendary"
  | "Artifact"
  | "Varies"
  | "Unknown";

/** Canonical rarity order, low to high (used for the edit-form dropdown and rarity text-color lookups). */
export const RARITY_ORDER: ItemRarity[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Artifact",
  "Varies",
  "Unknown",
];

export type ItemCategory = "Weapon" | "Armor" | "Consumable" | "Magic Item" | "Gear";

/** Display order for grouping the party inventory. */
/** Alphabetical by label (Armor, Consumables, Gear, Magic Items, Weapons). */
export const CATEGORY_ORDER: ItemCategory[] = ["Armor", "Consumable", "Gear", "Magic Item", "Weapon"];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  Weapon: "Weapons",
  Armor: "Armor",
  Consumable: "Consumables",
  "Magic Item": "Magic Items",
  Gear: "Gear",
};

export interface InventoryItem {
  id: string;
  name: string;
  rarity: ItemRarity;
  category: ItemCategory;
  quantity: number;
  /** Short rules blurb shown as a hover tooltip (from D&D Beyond, or typed manually). */
  description?: string;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

/** Standard 5e coin conversion (10 cp = 1 sp, 10 sp = 1 gp, 2 gp = 1 ep... expressed directly in GP). */
export function currencyToGp(currency: Currency): number {
  return currency.pp * 10 + currency.gp + currency.ep * 0.5 + currency.sp * 0.1 + currency.cp * 0.01;
}

export interface SkillProficiency {
  name: SkillName;
  /** False for an entry that exists only to carry an advantage/disadvantage note without real training. */
  proficient: boolean;
  expertise: boolean;
  /** Conditional advantage/disadvantage on this skill's checks (e.g. Dance Virtuoso's advantage on Performance while dancing). */
  advantage?: "advantage" | "disadvantage";
  /** The condition text, if any (e.g. "that involves you dancing"). */
  advantageNote?: string;
}

export interface CombatState {
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  conditions: string[];
  exhaustion: number;
  deathSaves?: {
    successes: number;
    failures: number;
  };
}

export interface Character {
  id: string;
  name: string;
  avatarUrl?: string;
  race: string;
  className: string;
  subclass?: string;
  level: number;
  role: string;
  heroicInspiration: boolean;
  initiative: number;
  combat: CombatState;
  stats: AbilityScores;
  resources: Resource[];
  spellSlots: SpellSlotLevel[];
  spellcasting?: SpellcastingStats;
  savingThrowProficiencies: Array<keyof AbilityScores>;
  skillProficiencies: SkillProficiency[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  advantages: string[];
  senses: Sense[];
  inventory: InventoryItem[];
  currency: Currency;
  notes: string;
  dndBeyondUrl?: string;
  synced?: boolean;
  lastSyncedAt?: string;
  /**
   * When true, syncing from D&D Beyond keeps the current Max HP untouched and
   * only refreshes current HP against it (damage tracking is safe to trust;
   * the Max HP formula isn't once ability scores have changed after leveling).
   * Automatically set after the first successful sync, but editable — the DM
   * can uncheck it to let one sync recompute Max HP fresh again.
   */
  maxHpLocked?: boolean;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(level, 1) - 1) / 4);
}

/** Ability-mod + proficiency bonus if proficient in that save, else the plain ability mod. */
export function savingThrowBonus(character: Character, ability: keyof AbilityScores): number {
  const mod = abilityModifier(character.stats[ability]);
  return character.savingThrowProficiencies.includes(ability)
    ? mod + proficiencyBonus(character.level)
    : mod;
}

/** Ability-mod + proficiency bonus (doubled for expertise) — plain ability mod if not actually proficient. */
export function skillBonus(character: Character, skill: SkillProficiency): number {
  const mod = abilityModifier(character.stats[SKILL_ABILITY[skill.name]]);
  if (!skill.proficient && !skill.expertise) return mod;
  const multiplier = skill.expertise ? 2 : 1;
  return mod + proficiencyBonus(character.level) * multiplier;
}

/** e.g. "Orc · Barbarian/Path of the Berserker" (level shown separately) */
export function characterInfoLine(character: Character): string {
  const classPart = character.subclass
    ? `${character.className}/${character.subclass}`
    : character.className;
  return [character.race, classPart].filter(Boolean).join(" · ");
}

/**
 * Formats an ISO timestamp using the viewer's own local timezone (not the
 * server's). Omits the year (e.g. "5 лип., 14:32") — this is always a recent
 * sync, so the year is dead weight that's a common culprit for text overflow
 * next to the header's sync button on narrow mobile viewports.
 */
export function formatSyncTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractDndBeyondCharacterId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.endsWith("dndbeyond.com")) return null;
    const match = parsed.pathname.match(/\/characters\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
