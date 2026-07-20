import { z } from "zod";

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

const creatureTraitSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  group: z.enum(["trait", "action", "bonusAction", "reaction", "legendary"]).optional(),
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

/** `Partial<Creature>` — PATCH `/api/creatures/[id]`. */
export const creatureUpdateSchema = z
  .object({
    campaignId: z.string(),
    category: creatureCategorySchema,
    templateId: z.string().optional(),
    templateName: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional(),
    creatureType: z.string().optional(),
    size: z.string().optional(),
    alignment: z.string().optional(),
    ac: z.number(),
    armorDesc: z.string().optional(),
    hp: z.number(),
    maxHp: z.number(),
    hitDice: z.string().optional(),
    tempHp: z.number(),
    speed: z.number(),
    speedDetail: z.string().optional(),
    initiativeBonus: z.number().optional(),
    stats: abilityScoresSchema,
    savingThrows: partialAbilityScoresSchema.optional(),
    senses: z.string().optional(),
    languages: z.string().optional(),
    challengeRating: z.string().optional(),
    experiencePoints: z.number().optional(),
    skills: z.string().optional(),
    damageVulnerabilities: z.string().optional(),
    damageResistances: z.string().optional(),
    damageImmunities: z.string().optional(),
    conditionImmunities: z.string().optional(),
    traits: z.array(creatureTraitSchema),
    conditions: z.array(z.string()),
    exhaustion: z.number(),
    concentrating: z.boolean().optional(),
    deathSaves: z.object({ successes: z.number(), failures: z.number() }).optional(),
    ownerCharacterId: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
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
