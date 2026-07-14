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
  /** Where this resource comes from (e.g. "Race", "Class", "Feat", "Item", "Pact Magic") — shown as the first line of the hover tooltip, above the description. */
  source?: string;
  /** Short rules blurb shown as a hover tooltip on the card (from D&D Beyond, or typed manually). */
  description?: string;
}

export interface SpellSlotLevel {
  level: number;
  current: number;
  max: number;
}

export interface KnownSpell {
  id: string;
  name: string;
  /** 0 = cantrip. */
  level: number;
  school?: string;
  /** Short rules blurb shown as a hover tooltip (from D&D Beyond, or typed manually). */
  description?: string;
  /** Where this spell comes from (e.g. "Class", "Race", "Item"). */
  source: string;
  /** e.g. "V, S, M" — which of Verbal/Somatic/Material components the spell needs. */
  components?: string;
  /** The specific material component text (e.g. "a bit of fleece"), when the spell needs one worth calling out. */
  materialComponent?: string;
  /**
   * Present only for spells with their own limited-use charge pool (e.g. an
   * innate racial spell castable once per long rest without a spell slot) —
   * absent for spells cast normally through spell slots.
   */
  current?: number;
  max?: number;
  recovery?: RecoveryType;
}

export interface Feature {
  id: string;
  name: string;
  /**
   * Where this feature comes from — as specific as the data allows (e.g. the
   * parent feature that granted a choice, like "Maneuvers" or "Metamagic
   * Options", rather than just "Class"), shown in the hover hint.
   */
  source: string;
  /**
   * Groups the Features and Traits list the same way D&D Beyond's own Actions
   * tab does: entries that are genuinely usable via an Action/Bonus Action/
   * Reaction/Special activation (sourced from D&D Beyond's `actions.*` data,
   * which carries that activation type) land in their matching group;
   * everything else — passive traits, proficiency grants, ability-score
   * bumps, subclass-choice announcements, rulebook boilerplate — falls into
   * "other" rather than being filtered out by a custom heuristic.
   */
  group: "action" | "bonusAction" | "reaction" | "special" | "other";
  /**
   * Where this feature originates from, independent of `group` — mirrors the
   * section headers D&D Beyond's own Features & Traits tab uses (Species
   * Traits/Class Features/Feat Features/Background Feature), a different
   * axis than the Actions-tab-style `group` above. Only used to sub-group
   * the "other" bucket in the UI, since Action/Bonus Action/Reaction/Special
   * are already short lists that don't need a second split.
   */
  originType: "species" | "class" | "feat" | "background";
  description?: string;
  /**
   * Present when this feature is also tracked as a Resource elsewhere on the
   * character (e.g. "Second Wind") — lets the Features list show the same
   * charge dots/recovery label inline instead of the character needing to
   * cross-reference the Resources section for the same ability.
   */
  current?: number;
  max?: number;
  recovery?: RecoveryType;
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

/** Canonical stat-block display order — shared by the character and creature cards. */
export const STAT_ORDER: Array<keyof AbilityScores> = ["str", "dex", "con", "int", "wis", "cha"];

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

export interface SkillProficiency {
  name: SkillName;
  /** False for an entry that exists only to carry an advantage/disadvantage note without real training. */
  proficient: boolean;
  expertise: boolean;
  /**
   * Half the proficiency bonus (rounded down), added on top of the ability
   * modifier — e.g. a Bard's Jack of All Trades. Only meaningful when
   * `proficient`/`expertise` are both false (those already grant the full or
   * doubled bonus and take precedence).
   */
  halfProficiency?: boolean;
  /** Conditional advantage/disadvantage on this skill's checks (e.g. Dance Virtuoso's advantage on Performance while dancing). */
  advantage?: "advantage" | "disadvantage";
  /** The condition text, if any (e.g. "that involves you dancing"). */
  advantageNote?: string;
  /** Extra flat bonus on top of ability mod + proficiency (e.g. a feature that adds a second ability's modifier to this one skill). */
  bonus?: number;
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

/** A short, freeform reminder a DM jots down mid-session (e.g. "Owes 20gp to the blacksmith") — added, edited, and removed straight from the dashboard card. */
export interface QuickNote {
  id: string;
  text: string;
  createdAt: string;
}

/** A DM's campaign — its own name, freeform notes, and character roster (characters point back via `Character.campaignId`). */
export interface Campaign {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  /** A square (cropped client-side) base64 data URI — absent falls back to an initial letter, same as `CharacterAvatar` does for characters. */
  logoUrl?: string;
  /** Reference links the DM wants reachable mid-session (rules docs, lore notes, a Google Doc of ideas...) — shown via the floating `QuickLinksButton`, capped at 10 in the editor. */
  quickLinks?: QuickLink[];
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
}

/** A campaign plus its roster size — used for the campaigns list, where showing a count doesn't require loading every character. */
export interface CampaignSummary extends Campaign {
  characterCount: number;
}

export interface Character {
  id: string;
  /** Every character belongs to exactly one campaign — scopes the roster shown on that campaign's dashboard. */
  campaignId: string;
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
  knownSpells: KnownSpell[];
  features: Feature[];
  savingThrowProficiencies: Array<keyof AbilityScores>;
  skillProficiencies: SkillProficiency[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  advantages: string[];
  senses: Sense[];
  /** Known languages, e.g. ["Common", "Infernal"] — display names straight from D&D Beyond, no manual editing UI yet. */
  languages: string[];
  /** Tool proficiencies (artisan's tools, kits, navigator's/vehicles) — deliberately excludes musical instruments and gaming sets, which don't come up as mid-session DM utility the way a Thieves' Tools or Herbalism Kit proficiency does. */
  toolProficiencies: string[];
  inventory: InventoryItem[];
  currency: Currency;
  notes: string;
  /**
   * Short, dashboard-added reminders (a sentence or two) — separate from the
   * single long-form `notes` field above (editable on the character's edit
   * page and, more quickly, in `CharacterDetailsModal`). Meant to be jotted
   * down and cleared quickly mid-session, so each is its own entry rather
   * than one shared block of text.
   */
  quickNotes: QuickNote[];
  /**
   * Names of abilities/spells the DM has flagged as a reminder for the
   * player (e.g. "you keep forgetting you have this") — shown with a flame
   * icon and amber highlight in the character details modal. Matched by
   * name rather than id, since Feature/KnownSpell ids are regenerated on
   * every D&D Beyond sync and wouldn't stay stable across one.
   */
  flaggedAbilities?: string[];
  /**
   * Manually toggled by the DM (not synced from D&D Beyond — that field was
   * tried before and removed, since which spell is being concentrated on
   * isn't reliably exposed by the API). Just a plain reminder flag: players
   * routinely forget they're concentrating, so the whole card gets a violet
   * ring/tint when this is set, toggled via a button in the card's Spells
   * section.
   */
  concentrating?: boolean;
  dndBeyondUrl?: string;
  synced?: boolean;
  lastSyncedAt?: string;
  /**
   * Toggled from the roster list in Settings — hides this character from the
   * dashboard's Party row (and from `RemindersPanel`) without removing it
   * from the campaign, for a character not in play this session but not
   * gone for good either. Still fully editable/visible from Settings.
   */
  hidden?: boolean;
}

export interface CreatureTrait {
  name: string;
  description?: string;
  /**
   * Mirrors a standard 5e stat block's own sections (Traits/Actions/Bonus
   * Actions/Reactions/Legendary Actions) — absent (defaults to "trait" when
   * rendered) on anything saved before this field existed.
   */
  group?: "trait" | "action" | "bonusAction" | "reaction" | "legendary";
}

/**
 * A lightweight Open5e SRD search result — shown in the "Add Creature" picker
 * list without fetching a full stat block for every hit (a popular query
 * can return upwards of a hundred matches; fetching each one's full detail
 * up front would mean that many extra requests before the DM has even
 * picked one). The full `CreatureTemplate` is only fetched for the specific
 * hit actually picked, via `/api/bestiary/resolve?id=`.
 */
export interface CreatureSearchHit {
  id: string;
  name: string;
  creatureType?: string;
  size?: string;
  challengeRating?: string;
}

/**
 * A full creature stat block resolved from one Open5e SRD search hit — not
 * stored anywhere on its own (there's deliberately no shared/cross-campaign
 * bestiary: re-adding the same creature just searches Open5e again, or a
 * custom/homebrew one is re-imported from its own saved YAML file), just the
 * shape used to prefill the "Add Creature" form for the hit the DM picked.
 */
export interface CreatureTemplate {
  id: string;
  name: string;
  /** e.g. "Celestial", "Beast" */
  creatureType?: string;
  /** e.g. "Large" */
  size?: string;
  alignment?: string;
  ac: number;
  /** e.g. "natural armor" — shown as "19 (natural armor)", same convention as a real stat block's AC line. */
  armorDesc?: string;
  maxHp: number;
  /** e.g. "19d12 + 133" — shown as "256 (19d12 + 133)". */
  hitDice?: string;
  speed: number;
  /** Full multi-mode speed text, e.g. "40 ft., fly 80 ft., climb 40 ft." — `speed` above stays the plain walk number other UI relies on. */
  speedDetail?: string;
  initiativeBonus?: number;
  stats: AbilityScores;
  /** Explicit saving-throw bonus per ability — only ones that differ from the plain ability modifier need to be set; falls back to the modifier when absent for a given ability. */
  savingThrows?: Partial<AbilityScores>;
  /** Free text, e.g. "Passive Perception 13, Darkvision 60 ft." — kept as one field like a real stat block's Senses line, rather than modeled after `Character.senses`. */
  senses?: string;
  languages?: string;
  /** e.g. "1/4", "None" — display text, not used in any calculation. */
  challengeRating?: string;
  experiencePoints?: number;
  /** e.g. "Perception +13, Stealth +6" — free text, same convention as `senses`/`languages`. */
  skills?: string;
  /** Free text, e.g. "Bludgeoning, Piercing, and Slashing from Nonmagical Attacks" — same convention as `senses`/`languages`. */
  damageVulnerabilities?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  traits: CreatureTrait[];
}

/**
 * A companion or summoned creature actually at the table in a specific
 * campaign (a mount from Find Steed, a Wild Shape form, a familiar, a
 * Ranger's beast companion...) — a live instance seeded from a
 * `CreatureTemplate`, with its own current HP/conditions that can drift from
 * the template as the fight goes on.
 */
export type CreatureCategory = "companion" | "enemy" | "npc";

export const CREATURE_CATEGORY_ORDER: CreatureCategory[] = ["companion", "enemy", "npc"];

/** Plural form — dashboard section titles ("Companions", "Enemies", "NPCs"). */
export const CREATURE_CATEGORY_LABELS: Record<CreatureCategory, string> = {
  companion: "Companions",
  enemy: "Enemies",
  npc: "NPCs",
};

/** Singular form — the per-creature category chip/tag reads "Companion", not "Companions". */
export const CREATURE_CATEGORY_SINGULAR_LABELS: Record<CreatureCategory, string> = {
  companion: "Companion",
  enemy: "Enemy",
  npc: "NPC",
};

/** One emoji per category, used before the dashboard section title (see also the Campaign/Party/Inventory emoji picked directly in `DashboardClient`). */
export const CREATURE_CATEGORY_EMOJI: Record<CreatureCategory, string> = {
  companion: "🐺",
  enemy: "⚔️",
  npc: "🧙",
};

export interface Creature {
  id: string;
  /** Every creature belongs to exactly one campaign, same as `Character.campaignId`. */
  campaignId: string;
  /**
   * Which of the three dashboard sections this creature lives in — companion
   * (player-controlled: a summon, mount, Wild Shape form, familiar), enemy
   * (DM-run: any monster/adversary), or NPC (non-combat, DM-run). Rows saved
   * before this field existed backfill to "companion" in `rowToCreature`,
   * matching how the block was originally used.
   */
  category: CreatureCategory;
  /** The Open5e SRD search hit this was seeded from, if any — absent for a creature added blank or via YAML import. Purely so a repeat search in this campaign can grey out "Add" as "(Added)"; nothing else reads it. */
  templateId?: string;
  /** The creature's actual species/import name (e.g. "Otherworldly Steed") — stays fixed regardless of `name`, so renaming the in-play nickname never loses track of what it actually is. */
  templateName: string;
  /** An in-play nickname (e.g. "Thunder") — falls back to `templateName` if never set. */
  name: string;
  /** Optional uploaded portrait (base64 data URI, same convention as `Campaign.logoUrl`) — falls back to an initial-letter placeholder when absent. */
  avatarUrl?: string;
  creatureType?: string;
  size?: string;
  alignment?: string;
  ac: number;
  armorDesc?: string;
  hp: number;
  maxHp: number;
  hitDice?: string;
  tempHp: number;
  speed: number;
  speedDetail?: string;
  initiativeBonus?: number;
  stats: AbilityScores;
  savingThrows?: Partial<AbilityScores>;
  senses?: string;
  languages?: string;
  challengeRating?: string;
  experiencePoints?: number;
  skills?: string;
  damageVulnerabilities?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  traits: CreatureTrait[];
  conditions: string[];
  exhaustion: number;
  /** Same convention as `Character.concentrating` — a spellcasting enemy/NPC/companion concentrating on a spell is exactly the kind of thing worth a save-or-lose reminder mid-combat, same as a player forgetting their own. Manually toggled via the same `StatusRail` badge and ring the character card uses. */
  concentrating?: boolean;
  /** Same shape as `CombatState.deathSaves` — only meaningful once `hp` hits 0, tracked separately so stabilizing and dropping again doesn't require guessing a reset. */
  deathSaves?: { successes: number; failures: number };
  /** Which character summons/commands this creature — purely informational (shown as a tag on the card), not a game-mechanical link. */
  ownerCharacterId?: string;
  /** How it entered play, e.g. "Find Steed", "Wild Shape", "Familiar". */
  source?: string;
  notes?: string;
  /** Same convention as `Character.quickNotes` — short reminders added/edited/removed straight from the dashboard card, separate from the long-form `notes` field above. */
  quickNotes?: QuickNote[];
  /** Same convention as `Character.flaggedAbilities` — names of traits/actions the DM has flagged as a reminder, shown with a flame icon and amber highlight. */
  flaggedTraits?: string[];
  /** Same convention as `Character.hidden` — hides this creature from its dashboard category row (and from `RemindersPanel`) without removing it from the campaign. */
  hidden?: boolean;
}

