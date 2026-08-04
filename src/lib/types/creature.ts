import { AbilityScores, CustomCondition, QuickNote } from "./common";

/**
 * One damage roll a trait's attack deals — a single attack can deal several
 * dice/types at once (e.g. "6 (1d6 + 3) bludgeoning plus 9 (2d8) cold"), so
 * this is a list on `CreatureAttack` rather than one dice+type pair.
 */
export interface CreatureDamageRoll {
  /** Dice plus flat bonus already combined into one string, e.g. "2d6 +4" — same convention as `Attack.damage`. */
  dice: string;
  damageType?: string;
}

/** A trait/action's structured to-hit + damage — e.g. a Bite or Claw attack. Melee/ranged is an explicit choice here rather than derived, since some attacks (thrown weapons) are one or the other depending on how they're used. */
export interface CreatureAttack {
  attackType: "melee" | "ranged";
  /**
   * Whether the stat block calls this a "... Weapon Attack" or "... Spell
   * Attack" (e.g. a lich's necrotic touch, a hag's baleful gaze) — same
   * shape either way (bonus + damage), just a different label, so this is
   * the only thing that distinguishes them rather than a parallel
   * structure. Optional and defaults to "weapon" wherever read, so every
   * `attack` written before this field existed still displays correctly.
   */
  attackKind?: "weapon" | "spell";
  /**
   * To-hit modifier, proficiency (if any) already folded in — same
   * convention as `Attack.attackBonus`. Optional: some spell attacks are
   * recorded before the DM knows (or cares about) the exact to-hit number,
   * and a `0` would misleadingly render as "+0" right alongside real
   * bonuses — absent means "not shown", not "zero".
   */
  attackBonus?: number;
  /** Just the distance number(s), e.g. "5" or "80/320" — no "ft." suffix; that unit is added automatically wherever this is displayed, so it's never hand-typed. */
  range?: string;
  damage: CreatureDamageRoll[];
}

export type CreatureAoeShape = "cone" | "cube" | "cylinder" | "line" | "sphere";

export const CREATURE_AOE_SHAPES: CreatureAoeShape[] = ["cone", "cube", "cylinder", "line", "sphere"];

/**
 * The area a trait/action affects — one of 5e's five official area-of-effect
 * shapes (PHB "Areas of Effect"): cone, cube, cylinder, line, sphere. Kept on
 * `CreatureTrait` itself rather than nested under `attack`, since the area is
 * often independent of (or applies to only part of) a trait's attack roll —
 * e.g. Ice Knife's blast radius affects everyone near the target regardless
 * of whether the initial ranged spell attack hit, and Fireball/Web have no
 * attack roll at all, just a save inside an area.
 */
export interface CreatureAoe {
  shape: CreatureAoeShape;
  /** Feet — the shape's defining size: radius for cylinder/sphere, length of the edge for cube, length for cone/line. */
  size: number;
  /** Feet — a line's width, since a line is the one shape needing two numbers (length + width) instead of one. Meaningless for the other four shapes. */
  width?: number;
}

/** A trait/action's structured saving-throw DC — e.g. a breath weapon or Frightful Presence. */
export interface CreatureSave {
  ability: keyof AbilityScores;
  dc: number;
}

export type CreatureEffectKind = "heal" | "tempHp" | "acBonus" | "other";

/**
 * A trait/action effect that isn't damage or a saving throw — restoring HP,
 * granting temporary HP, or a temporary AC bonus (a Shield-like reaction),
 * plus a free-form "other" bucket for anything else (a push, a condition, a
 * teleport...). Kept separate from `attack`/`save` since an action can grant
 * one of these without making an attack roll at all (a Heal action, a
 * reaction that grants +2 AC), and a single action can have more than one
 * (e.g. a bite that both damages and heals the creature for the same amount).
 */
export interface CreatureEffect {
  kind: CreatureEffectKind;
  /** Dice or flat amount, e.g. "2d8 +4", "+2", "10". */
  amount: string;
  /** Required for "other" (a short name for what it does, e.g. "Push"); optional extra context for the rest (e.g. "until the start of its next turn"). */
  label?: string;
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
  /**
   * Free text covering both 5e's "(X/Day)" and "(Recharge 5-6)" parenthetical
   * conventions — deliberately one flexible string rather than a
   * `RecoveryType` enum (which has no dice-based recharge concept) or two
   * separate fields (in a stat block these are the same slot, just phrased
   * differently depending on whether the limit is a fixed daily count or a
   * random recharge roll).
   */
  recharge?: string;
  attack?: CreatureAttack;
  save?: CreatureSave;
  effects?: CreatureEffect[];
  /** Which spell(s) this trait/action casts, e.g. "Fireball" or "Charm Person, Suggestion" — for a spell-like ability that isn't part of the creature's main `spellcasting` block (a Legendary Action that just casts a known spell, an innate one-off). Plain text rather than a link into `spellcasting.spellGroups`, since this ability may not even require the creature to have spellcasting at all. */
  spell?: string;
  /** The area this trait/action affects, if any — see `CreatureAoe`'s own doc comment for why this sits here rather than under `attack`. */
  aoe?: CreatureAoe;
}

/**
 * One frequency/level bucket of a creature's spell list — e.g.
 * `{ label: "At will", spells: ["Mage Hand", "Minor Illusion"] }` or
 * `{ label: "3/day each", spells: ["Charm Person", "Invisibility"] }`. A real
 * stat block always groups spells this way rather than listing them one at a
 * time, so `label` and `spells` are separate structured fields instead of one
 * combined free-text line — a DM can edit either half without re-typing the
 * other.
 */
export interface CreatureSpellGroup {
  label: string;
  spells: string[];
}

/**
 * A creature's spellcasting block — separate from the free-text
 * "Spellcasting" trait's own prose (which still carries the full rules text
 * and stays untouched in `traits`), this is just the fast-glance numbers plus
 * a lightweight spell list grouped by usage frequency. There's no per-spell
 * id/level/school data to hang a richer `KnownSpell`-like shape off of here.
 */
export interface CreatureSpellcasting {
  ability: keyof AbilityScores;
  saveDc: number;
  attackBonus: number;
  spellGroups: CreatureSpellGroup[];
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
  proficiencyBonus?: number;
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
  spellcasting?: CreatureSpellcasting;
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
  enemy: "😈",
  npc: "🧙",
};

/** One row in a creature's `hpHistory` — see that field's doc comment on `Creature`. */
export interface HpHistoryEntry {
  id: string;
  /** ISO timestamp, same convention as `Creature.createdAt`/`updatedAt`. */
  timestamp: string;
  /** Which pool this entry recorded a change to. */
  field: "hp" | "tempHp";
  previous: number;
  next: number;
  /** `next - previous`, precomputed so the viewer doesn't need to re-derive it. */
  delta: number;
}

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
  /** Added to attack rolls/saving throws where applicable — shown alongside AC/Speed/Initiative in the icon-stat row when present; omitted for creatures saved before this field existed. */
  proficiencyBonus?: number;
  hp: number;
  maxHp: number;
  hitDice?: string;
  tempHp: number;
  /**
   * Append-only change log for `hp`/`tempHp`, newest entries last —
   * server-stamped in `updateCreature` (`db.ts`) whenever a PATCH actually
   * changes one of those two values, regardless of whether the DM typed a
   * delta (`+5`/`-8`) or an absolute number into the HP bar; never accepted
   * from a client request body (absent from `creatureUpdateSchema`), same
   * convention as `createdAt`/`updatedAt`. Purely a debugging trail ("did I
   * actually fat-finger that number?"), viewed via a dedicated modal off the
   * card's kebab menu — not shown anywhere on the dashboard itself. Optional
   * and never backfilled, so a creature saved before this field existed
   * simply starts with none until its next HP change.
   */
  hpHistory?: HpHistoryEntry[];
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
  /** See `CreatureSpellcasting`'s own doc comment — the fast-glance numbers + spell list, separate from the free-text "Spellcasting" trait's prose (still in `traits`, untouched). */
  spellcasting?: CreatureSpellcasting;
  conditions: string[];
  exhaustion: number;
  /** Same convention as `Character.customConditions` — see that field's doc comment on `CustomCondition`. */
  customConditions?: CustomCondition[];
  /** Same convention as `Character.concentrating` — a spellcasting enemy/NPC/companion concentrating on a spell is exactly the kind of thing worth a save-or-lose reminder mid-combat, same as a player forgetting their own. Manually toggled via the same `StatusRail` popover and card ring the character card uses. */
  concentrating?: boolean;
  /** Same shape as `CombatState.deathSaves` — only meaningful once `hp` hits 0, tracked separately so stabilizing and dropping again doesn't require guessing a reset. */
  deathSaves?: { successes: number; failures: number };
  /** Which character summons/commands this creature — purely informational (shown as a tag on the card), not a game-mechanical link. */
  ownerCharacterId?: string;
  /** How it entered play, e.g. "Find Steed", "Wild Shape", "Familiar". */
  source?: string;
  /**
   * An arbitrary link the DM can set to open this creature's own reference
   * page — a monster's D&D Beyond entry, a wiki article, anything relevant.
   * Unlike `Character.dndBeyondUrl`, this never drives a sync (a creature
   * has no importer to sync from); it's purely a bookmark shown on the card
   * and in the details modal, same spot as the character card's D&D Beyond
   * link.
   */
  referenceUrl?: string;
  notes?: string;
  /** Same convention as `Character.quickNotes` — short reminders added/edited/removed straight from the dashboard card, separate from the long-form `notes` field above. */
  quickNotes?: QuickNote[];
  /** Same convention as `Character.flaggedAbilities` — names of traits/actions *and* known spells the DM has flagged as a reminder, shown with a flame icon and amber highlight. One flat array across both (matched by name), same as `Character.flaggedAbilities` already spans attacks/features/spells/items. */
  flaggedTraits?: string[];
  /** Same convention as `Character.hidden` — hides this creature from its dashboard category row (and from `RemindersPanel`) without removing it from the campaign. */
  hidden?: boolean;
  /**
   * Server-stamped in `createCreature`/`updateCreature` (`db.ts`) — never
   * accepted from a client request body (absent from `creatureUpdateSchema`),
   * so a PATCH can't backdate either one. Not currently surfaced anywhere in
   * the UI (the card/details-modal "last edited" display that used to read
   * this pair was removed as adding no real value) — kept stamped regardless,
   * since it's DM-facing record-keeping data a future feature may still want.
   * Optional (not backfilled) so creatures saved before this field existed
   * simply have neither, same convention as `Character.dndBeyondUrl` being
   * absent.
   */
  createdAt?: string;
  updatedAt?: string;
}
