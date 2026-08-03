import { z } from "zod";
import { AI_OPTION_CATEGORIES, AI_OPTION_KINDS, AI_OPTION_LIMITS, AI_OPTION_PRIORITIES, AI_OPTION_STATUSES, AI_REPLY_LIMITS } from "./aiOptionContract";

/**
 * Runtime validation for API route request bodies, mirroring the shapes in
 * `types.ts`. PATCH endpoints persist `{ ...existing, ...updates }` straight
 * into the database, so an unvalidated body could silently corrupt stored
 * JSON with wrong types or unknown keys — these schemas are the boundary
 * that catches that before it reaches `db.ts`. Kept in sync with `types.ts`
 * by hand (no codegen); a field added there needs a matching one here to
 * actually be accepted by a PATCH.
 */

const abilityScoresSchema = z.object({
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
});

const partialAbilityScoresSchema = abilityScoresSchema.partial();

const recoveryTypeSchema = z.enum(["short-rest", "long-rest", "dawn", "daily", "encounter", "custom", "manual"]);

const resourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  current: z.number(),
  max: z.number(),
  recovery: recoveryTypeSchema,
  note: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
});

const customConditionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  // Real-world custom conditions get copied straight from a monster's stat
  // block (e.g. a dragon's multi-paragraph "Malevolent Presence") — 500 was
  // silently truncating a paste like that well before the DM even reached
  // the end of it.
  description: z.string().max(2000).optional(),
});

const spellSlotLevelSchema = z.object({
  level: z.number(),
  current: z.number(),
  max: z.number(),
});

const knownSpellSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(),
  school: z.string().optional(),
  description: z.string().optional(),
  source: z.string(),
  components: z.string().optional(),
  materialComponent: z.string().optional(),
  current: z.number().optional(),
  max: z.number().optional(),
  recovery: recoveryTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  isAreaEffect: z.boolean().optional(),
  isReaction: z.boolean().optional(),
  isConcentration: z.boolean().optional(),
  castingTime: z.string().optional(),
  range: z.string().optional(),
  hitOrDc: z.string().optional(),
  effect: z.string().optional(),
  effectType: z.string().optional(),
  duration: z.string().optional(),
});

const featureSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  group: z.enum(["action", "bonusAction", "reaction", "special", "other"]),
  originType: z.enum(["species", "class", "feat", "background"]),
  description: z.string().optional(),
  current: z.number().optional(),
  max: z.number().optional(),
  recovery: recoveryTypeSchema.optional(),
});

const itemRaritySchema = z.enum([
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Artifact",
  "Varies",
  "Unknown",
]);

const attackSchema = z.object({
  id: z.string(),
  name: z.string(),
  attackType: z.enum(["melee", "ranged"]),
  attackBonus: z.number(),
  damage: z.string(),
  damageType: z.string().optional(),
  properties: z.array(z.string()),
  mastery: z.string().optional(),
  category: z.enum(["Simple", "Martial"]).optional(),
  extraDamage: z.string().optional(),
  range: z.string().optional(),
  proficient: z.boolean(),
  weaponType: z.string().optional(),
  rarity: itemRaritySchema.optional(),
  description: z.string().optional(),
});

const spellcastingStatsSchema = z.object({
  modifier: z.number(),
  attack: z.number(),
  saveDc: z.number(),
});

const senseSchema = z.object({
  name: z.string(),
  range: z.number(),
});

const skillNameSchema = z.enum([
  "acrobatics",
  "animal-handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight-of-hand",
  "stealth",
  "survival",
]);

const skillProficiencySchema = z.object({
  name: skillNameSchema,
  proficient: z.boolean(),
  expertise: z.boolean(),
  halfProficiency: z.boolean().optional(),
  advantage: z.enum(["advantage", "disadvantage"]).optional(),
  advantageNote: z.string().optional(),
  bonus: z.number().optional(),
});

const combatStateSchema = z.object({
  hp: z.number(),
  maxHp: z.number(),
  tempHp: z.number(),
  ac: z.number(),
  speed: z.number(),
  passivePerception: z.number(),
  passiveInvestigation: z.number(),
  passiveInsight: z.number(),
  conditions: z.array(z.string()),
  exhaustion: z.number(),
  customConditions: z.array(customConditionSchema).optional(),
  deathSaves: z.object({ successes: z.number(), failures: z.number() }).optional(),
});

const quickNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
});

const itemCategorySchema = z.enum(["Weapon", "Armor", "Consumable", "Magic Item", "Gear"]);

const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: itemRaritySchema,
  category: itemCategorySchema,
  quantity: z.number(),
  type: z.string().optional(),
  weight: z.number().optional(),
  cost: z.number().optional(),
  description: z.string().optional(),
});

const currencySchema = z.object({
  cp: z.number(),
  sp: z.number(),
  ep: z.number(),
  gp: z.number(),
  pp: z.number(),
});

const quickLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
});

const creatureDamageRollSchema = z.object({
  dice: z.string(),
  damageType: z.string().optional(),
});

const creatureAttackSchema = z.object({
  attackType: z.enum(["melee", "ranged"]),
  attackKind: z.enum(["weapon", "spell"]).optional(),
  attackBonus: z.number().optional(),
  range: z.string().optional(),
  damage: z.array(creatureDamageRollSchema),
});

const creatureSaveSchema = z.object({
  ability: z.enum(["str", "dex", "con", "int", "wis", "cha"]),
  dc: z.number(),
});

const creatureAoeSchema = z.object({
  shape: z.enum(["cone", "cube", "cylinder", "line", "sphere"]),
  size: z.number(),
  width: z.number().optional(),
});

const creatureEffectSchema = z.object({
  kind: z.enum(["heal", "tempHp", "acBonus", "other"]),
  amount: z.string(),
  label: z.string().optional(),
});

const creatureSpellGroupSchema = z.object({
  label: z.string(),
  spells: z.array(z.string()),
});

const creatureSpellcastingSchema = z.object({
  ability: z.enum(["str", "dex", "con", "int", "wis", "cha"]),
  saveDc: z.number(),
  attackBonus: z.number(),
  spellGroups: z.array(creatureSpellGroupSchema),
});

const creatureTraitSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  group: z.enum(["trait", "action", "bonusAction", "reaction", "legendary"]).optional(),
  recharge: z.string().optional(),
  attack: creatureAttackSchema.optional(),
  save: creatureSaveSchema.optional(),
  effects: z.array(creatureEffectSchema).optional(),
  spell: z.string().optional(),
  aoe: creatureAoeSchema.optional(),
});

const creatureCategorySchema = z.enum(["companion", "enemy", "npc"]);

/** `Partial<Campaign>` — PATCH `/api/campaigns/[id]`. */
export const campaignUpdateSchema = z
  .object({
    name: z.string(),
    notes: z.string(),
    createdAt: z.string(),
    logoUrl: z.string().optional(),
    quickLinks: z.array(quickLinkSchema).optional(),
  })
  .partial();

/** `Partial<Character>` — PATCH `/api/characters/[id]`. */
export const characterUpdateSchema = z
  .object({
    campaignId: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional(),
    race: z.string(),
    className: z.string(),
    subclass: z.string().optional(),
    level: z.number(),
    role: z.string(),
    heroicInspiration: z.boolean(),
    initiative: z.number(),
    combat: combatStateSchema,
    stats: abilityScoresSchema,
    resources: z.array(resourceSchema),
    spellSlots: z.array(spellSlotLevelSchema),
    spellcasting: spellcastingStatsSchema.optional(),
    knownSpells: z.array(knownSpellSchema),
    features: z.array(featureSchema),
    attacks: z.array(attackSchema),
    savingThrowProficiencies: z.array(z.enum(["str", "dex", "con", "int", "wis", "cha"])),
    skillProficiencies: z.array(skillProficiencySchema),
    resistances: z.array(z.string()),
    immunities: z.array(z.string()),
    vulnerabilities: z.array(z.string()),
    advantages: z.array(z.string()),
    senses: z.array(senseSchema),
    languages: z.array(z.string()),
    toolProficiencies: z.array(z.string()),
    inventory: z.array(inventoryItemSchema),
    currency: currencySchema,
    notes: z.string(),
    quickNotes: z.array(quickNoteSchema),
    flaggedAbilities: z.array(z.string()).optional(),
    concentrating: z.boolean().optional(),
    dndBeyondUrl: z.string().optional(),
    synced: z.boolean().optional(),
    lastSyncedAt: z.string().optional(),
    hidden: z.boolean().optional(),
  })
  .partial();

/**
 * `Partial<Creature>` — PATCH `/api/creatures/[id]`.
 *
 * Fields below marked `.nullable()` are ones `formValueToCreatureUpdates`
 * (in `creatureForm.ts`) can send as an explicit `null` to mean "clear this
 * field" — plain omission only means "don't touch it", and `undefined`
 * doesn't survive `JSON.stringify` over the wire, so `null` is the only
 * value that can carry a "clear" instruction to this route. `updateCreature`
 * in `db.ts` normalizes any incoming `null` back to `undefined` before
 * merging/storing.
 */
export const creatureUpdateSchema = z
  .object({
    campaignId: z.string(),
    category: creatureCategorySchema,
    templateId: z.string().optional(),
    templateName: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable().optional(),
    creatureType: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    alignment: z.string().nullable().optional(),
    ac: z.number(),
    armorDesc: z.string().nullable().optional(),
    proficiencyBonus: z.number().nullable().optional(),
    hp: z.number(),
    maxHp: z.number(),
    hitDice: z.string().nullable().optional(),
    tempHp: z.number(),
    speed: z.number(),
    speedDetail: z.string().nullable().optional(),
    initiativeBonus: z.number().nullable().optional(),
    stats: abilityScoresSchema,
    savingThrows: partialAbilityScoresSchema.nullable().optional(),
    senses: z.string().nullable().optional(),
    languages: z.string().nullable().optional(),
    challengeRating: z.string().nullable().optional(),
    experiencePoints: z.number().nullable().optional(),
    skills: z.string().nullable().optional(),
    damageVulnerabilities: z.string().nullable().optional(),
    damageResistances: z.string().nullable().optional(),
    damageImmunities: z.string().nullable().optional(),
    conditionImmunities: z.string().nullable().optional(),
    traits: z.array(creatureTraitSchema),
    spellcasting: creatureSpellcastingSchema.nullable().optional(),
    conditions: z.array(z.string()),
    exhaustion: z.number(),
    customConditions: z.array(customConditionSchema).optional(),
    concentrating: z.boolean().optional(),
    deathSaves: z.object({ successes: z.number(), failures: z.number() }).optional(),
    ownerCharacterId: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    quickNotes: z.array(quickNoteSchema).optional(),
    flaggedTraits: z.array(z.string()).optional(),
    hidden: z.boolean().optional(),
  })
  .partial();

export const reorderBodySchema = z.object({
  orderedIds: z.array(z.string()),
});

/** POST `/api/campaigns`. */
export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1, "A campaign name is required."),
  notes: z.string().optional(),
  logoUrl: z.string().optional(),
});

/** POST `/api/characters`. */
export const characterCreateSchema = z.object({
  url: z.string().trim().min(1),
  campaignId: z.string().min(1),
});

/**
 * POST `/api/journal/entries`. `sessionId` optional — omitted, the route
 * auto-resolves the campaign's current session (Quick Note's path); given,
 * it attaches to that exact session instead (the full Journal modal's
 * path).
 *
 * `audience` — which tab this entry belongs to. Only meaningful for a DM
 * caller (a player's request always gets forced to `"party"` server-side,
 * regardless of what's sent here — see `entries/route.ts`); a DM caller
 * omitting it (Quick Note's exact request shape) defaults to `"dm"`.
 *
 * No `timeZone` field here (unlike `journalSessionCreateSchema` below) —
 * auto-resolution matches "today" by a single canonical UTC calendar day
 * (see `resolveOrCreateSessionForDate` in `db.ts` and its caller in
 * `entries/route.ts`), not the caller's own live IANA zone. Trusting each
 * device's self-reported zone here is exactly what let two devices at the
 * same table (different configured timezones, or one just having a wrong
 * system clock) disagree about "today" and silently split one real session
 * across two rows.
 */
export const journalEntryCreateSchema = z.object({
  campaignId: z.string().min(1),
  sessionId: z.string().optional(),
  text: z.string().min(1, "A note can't be empty."),
  audience: z.enum(["dm", "party"]).optional(),
});

/**
 * POST `/api/assistant/suggest` — exactly one of `characterId`/`creatureId`,
 * never both/neither. `intent` picks which of the two request shapes this
 * is:
 *
 * - `"plan"` (the "Підказати хід"/"Оновити план" actions) — a full
 *   structured turn plan, `situation` optional.
 * - `"ask"` (the "Запитати" action, or a quick-suggestion chip) — a short
 *   conversational reply, `situation` required (there's nothing to ask
 *   about otherwise).
 *
 * There is no client-supplied "previous answer" field — `route.ts` derives
 * follow-up context itself from this entity's own persisted conversation
 * (`listAssistantMessages`), which is both simpler for the frontend and
 * correct even if its local state was never populated (a fresh page load).
 */
export const assistantSuggestSchema = z
  .object({
    campaignId: z.string().min(1),
    characterId: z.string().min(1).optional(),
    creatureId: z.string().min(1).optional(),
    /**
     * Optional free-text "here's the current scene" note (required for
     * `intent: "ask"` — see the class-level refine below), folded into the
     * LLM prompt. This isn't only what a human typed — `AiAssistantModal`'s
     * quick-question chips (see `QUICK_QUESTIONS`) send their own longer,
     * app-authored instruction text through this same field, bypassing the
     * textarea's own 500-char `maxLength` entirely (that limit only bounds
     * what someone can *type*, not what the app can send programmatically).
     * The cap here is set well above that so a longer chip query never hits
     * it — a real chip query already did once (876 chars), which is what
     * this comment is here to prevent happening silently again.
     */
    situation: z.string().max(2000).optional(),
    intent: z.enum(["plan", "ask"]).default("plan"),
    /**
     * Only meaningful for `intent: "plan"`. Set by the frontend, not
     * inferred here — `AiAssistantModal` sends `"overview"` when the
     * situation bar was left empty and `"focused"` the moment there's typed
     * text, so this always lines up with whether `situation` is present.
     */
    response_mode: z.enum(["overview", "focused"]).default("overview"),
  })
  .refine((data) => Boolean(data.characterId) !== Boolean(data.creatureId), {
    message: "Provide exactly one of characterId or creatureId.",
  })
  .refine((data) => data.intent !== "ask" || Boolean(data.situation?.trim()), {
    message: "situation is required when intent is \"ask\".",
  });

/**
 * The AI assistant's structured reply — mirrors the JSON Schema passed to
 * OpenAI's structured-output `response_format` in
 * `/api/assistant/suggest/route.ts` (kept in sync by hand, same as every
 * other schema in this file). Re-validated here after `JSON.parse`-ing the
 * model's response: structured-output "strict" mode makes the *shape*
 * reliable, but never trust an upstream API blindly — this is the same
 * boundary-validation posture as every other schema below.
 */
export const aiOptionSchema = z.object({
  category: z.enum(AI_OPTION_CATEGORIES),
  /** The exact `Feature`/`KnownSpell`/`Attack`/`Resource` `.id`, or a `trait-N`/`spell-G-N` id from `aiSourceIds.ts` for a creature — `null` for `universal`/`improvised` options, which have nothing on the sheet to link to. */
  source_id: z.string().nullable(),
  name: z.string().min(1).max(AI_OPTION_LIMITS.nameMaxLength),
  kind: z.enum(AI_OPTION_KINDS),
  priority: z.enum(AI_OPTION_PRIORITIES),
  status: z.enum(AI_OPTION_STATUSES),
  description: z.string().min(1).max(AI_OPTION_LIMITS.descriptionMaxLength),
  conditions: z.array(z.string().min(1).max(AI_OPTION_LIMITS.conditionMaxLength)).max(AI_OPTION_LIMITS.conditionMaxItems),
});

export const aiTacticalResponseSchema = z.object({
  game_plan: z.object({ summary: z.string().min(1).max(AI_OPTION_LIMITS.summaryMaxLength) }),
  options: z.array(aiOptionSchema).max(AI_OPTION_LIMITS.optionsMaxItems),
});

export type AiOption = z.infer<typeof aiOptionSchema>;
export type AiTacticalResponse = z.infer<typeof aiTacticalResponseSchema>;

/** The "Запитати" chat-reply shape — see `AI_REPLY_JSON_SCHEMA`'s own doc comment for why it's just one field. */
export const aiReplySchema = z.object({
  reply: z.string().min(1).max(AI_REPLY_LIMITS.replyMaxLength),
});

export type AiReply = z.infer<typeof aiReplySchema>;

/**
 * PATCH `/api/journal/entries/[id]`. Deliberately NOT a `.partial()` of a
 * full `JournalEntry` shape the way the other update schemas above are —
 * `sessionId`/`campaignId`/`authorRole`/`audience`/`createdAt` must never
 * be client-editable, so only `text` is accepted here.
 *
 * `expectedUpdatedAt` — optional compare-and-swap token: the `updatedAt` the
 * client last saw when it started editing. Omitted, the write always
 * proceeds (unconditional overwrite, same behavior as before this field
 * existed); given, `updateJournalEntryText` in `db.ts` rejects the write
 * with a `"conflict"` result if the entry's stored `updatedAt` has since
 * moved on.
 */
export const journalEntryUpdateSchema = z.object({
  text: z.string().min(1, "A note can't be empty."),
  expectedUpdatedAt: z.string().optional(),
});

/** POST `/api/journal/sessions` — DM-only manual "start a new session." */
export const journalSessionCreateSchema = z.object({
  campaignId: z.string().min(1),
  timeZone: z.string().optional(),
});

/** PATCH `/api/journal/sessions/[id]` — DM-only rename/archive/unarchive; both fields optional so either can be sent alone. */
export const journalSessionUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  archived: z.boolean().optional(),
});
