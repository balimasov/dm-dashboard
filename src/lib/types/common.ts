export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

/** Canonical stat-block display order — shared by the character and creature cards. */
export const STAT_ORDER: Array<keyof AbilityScores> = ["str", "dex", "con", "int", "wis", "cha"];

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

/** One-line DM reminder of what each skill covers, shown in the Skills pill hover tooltip. */
export const SKILL_DESCRIPTIONS: Record<SkillName, string> = {
  acrobatics: "Balance, tumble, or escape a grapple with agility.",
  "animal-handling": "Calm, control, or read the intentions of an animal.",
  arcana: "Recall lore about spells, magic items, and planes.",
  athletics: "Climb, jump, swim, grapple, or shove.",
  deception: "Convincingly hide the truth.",
  history: "Recall lore about past events, people, and civilizations.",
  insight: "Read intentions, detect lies, and predict behavior.",
  intimidation: "Influence through threats or a hostile presence.",
  investigation: "Deduce clues, find hidden details, or analyze evidence.",
  medicine: "Diagnose illness, stabilize the dying, or treat wounds.",
  nature: "Recall lore about terrain, plants, animals, and weather.",
  perception: "Spot, hear, or otherwise notice something.",
  performance: "Entertain an audience with music, dance, or acting.",
  persuasion: "Influence someone with tact and good faith.",
  religion: "Recall lore about deities, rites, and religious symbols.",
  "sleight-of-hand": "Pick a pocket, plant an item, or perform manual trickery.",
  stealth: "Avoid notice by hiding, sneaking, or moving quietly.",
  survival: "Track, forage, navigate, or endure the wilderness.",
};

/** A short, freeform reminder a DM jots down mid-session (e.g. "Owes 20gp to the blacksmith") — added, edited, and removed straight from the dashboard card. */
export interface QuickNote {
  id: string;
  text: string;
  createdAt: string;
}

/**
 * A homebrew condition/state with its own name and description — for
 * anything the standard D&D condition list (`conditionInfo.ts`) doesn't
 * cover: a dragon's fear-roar-induced madness, a story curse, a
 * campaign-specific status effect. Shown on the card the same way a standard
 * condition is (its own badge on `StatusRail`, added/removed from the same
 * popover), and its `description` is sent to the AI assistant's context the
 * same way a standard condition's `conditionInfo.ts` blurb is — the model
 * never has to reason about a custom condition "blind". Shared by `Character`
 * (nested in `CombatState`) and `Creature` (flat on the object), same
 * convention as `conditions`/`exhaustion` already being duplicated across
 * both rather than factored into one shared "combat state" type.
 */
export interface CustomCondition {
  id: string;
  name: string;
  /** Optional only for the moment right after typing a name and before filling this in — an empty description still renders and still gets sent to the AI, just with nothing beyond the bare name. */
  description?: string;
  /** Temporarily off without deleting it — the only other way to stop a custom state from being "active" used to be removing it outright, losing its name/description for next time it's needed. `undefined`/`false` (the default for every already-persisted condition, from before this field existed) means active, same as `Character.hidden`'s convention. */
  disabled?: boolean;
}
