import { AbilityScores, QuickNote, SkillName } from "./common";
import { Attack, Currency, InventoryItem } from "./item";

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
  /** Where this resource comes from — as specific as the data allows, e.g. "Class (Combat Superiority)" for a charge pool tied to a specific class feature, or just "Species"/"Class"/"Feat"/"Item"/"Pact Magic" when it doesn't resolve to one. Shown as the first line of the hover tooltip, above the description. */
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
  /** Where this spell comes from — as specific as the data allows, e.g. "Species (Elven Lineage Spells)" or "Class (Spellfire Spells)" for a bonus spell granted by a specific racial trait/subclass feature, or just "Class"/"Species"/"Background"/"Item"/"Feat" when it doesn't resolve to one (e.g. every spell freely chosen from a class's own spell list). */
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
  /** D&D Beyond's own free-text classification (e.g. "Damage", "Healing", "Control", "Warding") — straight passthrough from the spell definition's `tags`, used to auto-categorize Party Toolkit's Coverage grouping without a hand-maintained per-spell-name list. Absent for a spell synced before this field existed (needs a re-sync) or genuinely untagged homebrew content. */
  tags?: string[];
  /** Whether the spell has an area of effect (`range.aoeType` set on the definition) — distinguishes an AOE-damage spell from a single-target one, which the `"Damage"` tag alone doesn't. */
  isAreaEffect?: boolean;
  /** Cast as a Reaction (`activation.activationType === 4`) — same activation-type convention `Feature.group`'s "reaction" bucket already uses. */
  isReaction?: boolean;
  /** Requires concentration to maintain (`duration.durationType === "Concentration"` on the definition) — a real sheet fact computed once here, same as `isAreaEffect`/`isReaction`, rather than re-derived later by string-matching the human-readable `duration` text below. */
  isConcentration?: boolean;
  /** e.g. "1 action", "1 bonus action", "1 reaction", "1 minute" — D&D Beyond's own "Time" column, shown in the hint since a spell's Action/Bonus Action/Reaction split isn't visible anywhere else on the card. */
  castingTime?: string;
  /** e.g. "Self", "Touch", "150 ft.", "150 ft. (20 ft. Sphere)" for an area spell — D&D Beyond's "Range" column. */
  range?: string;
  /** The attack bonus (e.g. "+6") for a spell requiring an attack roll, or the save DC + ability (e.g. "DC 15 DEX") for one requiring a saving throw — D&D Beyond's "Hit/DC" column. Absent for a spell that's neither (most buffs/utility). */
  hitOrDc?: string;
  /** The dice/number half of the spell's primary damage/healing roll (e.g. "8d6", "2d8"), read off its own `modifiers` — falls back to its first D&D Beyond classification tag (e.g. "Buff", "Control") as a one-word summary when it deals no dice-based effect, in which case `effectType` is absent. Kept separate from `effectType` so the UI can bold/whiten just the roll the same way a weapon's damage die is styled, leaving the type as a plain secondary label. D&D Beyond's "Effect" column. */
  effect?: string;
  /** The type/label half of `effect` (e.g. "Fire" for damage, "Healing" for healing) — present only alongside a dice-based `effect`; a fallback classification word (e.g. "Buff") has no separate type to show. */
  effectType?: string;
  /** e.g. "Instantaneous", "1 round", "Concentration, 1 minute", "Until Dispelled" — D&D Beyond's "Notes" column (duration half of it; components/material already surface via `components`/`materialComponent`). */
  duration?: string;
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

export interface Sense {
  name: string;
  range: number;
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
  /** References into `Campaign.customConditionLibrary` — see `CustomConditionTemplate`'s own doc comment. Optional/absent, not defaulted to `[]`, for characters with none attached. */
  customConditionIds?: string[];
  deathSaves?: {
    successes: number;
    failures: number;
  };
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
  /** Non-spell weapon attacks (see `Attack`'s own doc comment for scope) — shown on the character card's "Combat" tab. */
  attacks: Attack[];
  savingThrowProficiencies: Array<keyof AbilityScores>;
  /** A flat bonus applying to every saving throw regardless of proficiency (e.g. a Paladin's Aura of Protection, Charisma-modifier-based) — see `characterMath.ts`'s `savingThrowBonus`. */
  extraSavingThrowBonus?: number;
  skillProficiencies: SkillProficiency[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  advantages: string[];
  senses: Sense[];
  /** Known languages, e.g. ["Common", "Infernal"] — display names straight from D&D Beyond, no manual editing UI yet. */
  languages: string[];
  /** Tool proficiencies — artisan's tools, kits, navigator's/vehicles, musical instruments, and gaming sets, matching D&D Beyond's own "Tools" grouping exactly. */
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
   * ring/tint when this is set, toggled via `StatusRail`'s states popover.
   */
  concentrating?: boolean;
  dndBeyondUrl?: string;
  synced?: boolean;
  lastSyncedAt?: string;
  /**
   * The message from the most recent FAILED sync attempt (individual "Sync",
   * "Sync All", or the automatic first sync right after adding a character
   * by URL) — `undefined` again the moment any later attempt succeeds.
   * Deliberately separate from `synced`/`lastSyncedAt`, which only ever
   * describe the last *successful* sync: a character that synced fine
   * yesterday and just failed a retry today still has `synced: true` and a
   * recent `lastSyncedAt` (correctly — that's still good, if stale, data),
   * but with nothing to say *this* attempt didn't go through. This is that
   * signal, persisted so it survives closing the card/reloading the page
   * instead of vanishing the moment the component that triggered the sync
   * unmounts.
   */
  lastSyncError?: string;
  /**
   * Toggled from the roster list in Settings — hides this character from the
   * dashboard's Party row (and from `RemindersPanel`) without removing it
   * from the campaign, for a character not in play this session but not
   * gone for good either. Still fully editable/visible from Settings.
   */
  hidden?: boolean;
}
