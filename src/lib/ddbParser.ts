import {
  AbilityScores,
  Character,
  formatModifier,
  proficiencyBonus,
  RecoveryType,
  Resource,
  Sense,
  SKILL_ABILITY,
  SkillName,
  SkillProficiency,
  SpellSlotLevel,
} from "./types";

/**
 * Parses the response of D&D Beyond's undocumented character JSON endpoint
 * (character-service.dndbeyond.com/character/v5/character/{id}).
 *
 * Field meanings below come from inspecting a real character export and
 * cross-referencing MrPrimate/ddb-importer (the most complete open-source
 * parser of this API, used by the ddb-importer Foundry VTT module).
 *
 * Known limitations (left for manual correction on the edit page):
 * - Free-choice ability score increases ("choose-an-ability-score" with no
 *   fixed ability) aren't resolved — only fixed racial/item stat bonuses are.
 * - AC ignores special unarmored defense (Monk/Barbarian/Sorcerer), natural
 *   armor races, dragon hide and dual-wielding bonuses.
 * - Third-caster subclasses (Eldritch Knight, Arcane Trickster) aren't
 *   detected — only classes whose base `definition.canCastSpells` is true
 *   contribute spell slots.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const ABILITY_BY_ID: Record<number, keyof AbilityScores> = {
  1: "str",
  2: "dex",
  3: "con",
  4: "int",
  5: "wis",
  6: "cha",
};

const ABILITY_SUBTYPE: Record<keyof AbilityScores, string> = {
  str: "strength-score",
  dex: "dexterity-score",
  con: "constitution-score",
  int: "intelligence-score",
  wis: "wisdom-score",
  cha: "charisma-score",
};

const CONDITION_LABELS: Record<number, string> = {
  1: "Blinded",
  2: "Charmed",
  3: "Deafened",
  5: "Frightened",
  6: "Grappled",
  7: "Incapacitated",
  8: "Invisible",
  9: "Paralyzed",
  10: "Petrified",
  11: "Poisoned",
  12: "Prone",
  13: "Restrained",
  14: "Stunned",
  15: "Unconscious",
  16: "Diseased",
};
const EXHAUSTION_CONDITION_ID = 4;

const RESET_TYPE_MAP: Record<number, RecoveryType> = {
  1: "short-rest",
  2: "long-rest",
  3: "dawn",
  4: "manual",
};

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

const SAVE_SUBTYPE: Record<keyof AbilityScores, string> = {
  str: "strength-saving-throws",
  dex: "dexterity-saving-throws",
  con: "constitution-saving-throws",
  int: "intelligence-saving-throws",
  wis: "wisdom-saving-throws",
  cha: "charisma-saving-throws",
};

const SENSE_SUBTYPES = ["darkvision", "blindsight", "tremorsense", "truesight"];

function titleCase(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function collectModifiers(data: any): any[] {
  const groups = ["race", "class", "background", "item", "feat", "condition"];
  return groups.flatMap((g) => data.modifiers?.[g] ?? []);
}

function computeAbilityScores(data: any, mods: any[]): AbilityScores {
  const result = {} as AbilityScores;
  for (const [idStr, key] of Object.entries(ABILITY_BY_ID)) {
    const id = Number(idStr);
    const base = data.stats?.find((s: any) => s.id === id)?.value ?? 10;
    const bonus = data.bonusStats?.find((s: any) => s.id === id)?.value ?? 0;
    const override = data.overrideStats?.find((s: any) => s.id === id)?.value;
    if (override != null) {
      result[key] = override;
      continue;
    }
    // D&D Beyond's `isGranted` flag is unreliable for ability-score bonuses that
    // come from a choice with sub-options (e.g. a background ASI offering "+2 to
    // one ability" or "+1 to two abilities") — both the chosen and unchosen
    // branches can show isGranted:false even though the choice was made and one
    // branch is genuinely active. A modifier tied to a *specific* ability
    // (entityId set) is only ever present when that ability was actually part of
    // some granted feature, so it's safe to sum unconditionally; only the
    // free-choice "pick any ability" case (entityId null) can't be resolved this
    // way and is intentionally left out.
    const flatBonus = mods
      .filter((m) => m.type === "bonus" && m.subType === ABILITY_SUBTYPE[key] && m.entityId === id)
      .reduce((sum, m) => sum + (m.value ?? m.fixedValue ?? 0), 0);
    result[key] = base + bonus + flatBonus;
  }
  return result;
}

function computeConditionsAndExhaustion(data: any): { conditions: string[]; exhaustion: number } {
  const conditions: string[] = [];
  let exhaustion = 0;
  for (const c of data.conditions ?? []) {
    if (c.id === EXHAUSTION_CONDITION_ID) {
      exhaustion = c.level ?? 0;
      continue;
    }
    const label = CONDITION_LABELS[c.id];
    if (label) conditions.push(label);
  }
  return { conditions, exhaustion };
}

function computeSavingThrowProficiencies(mods: any[]): Array<keyof AbilityScores> {
  return (Object.keys(SAVE_SUBTYPE) as Array<keyof AbilityScores>).filter((key) =>
    mods.some((m) => m.type === "proficiency" && m.subType === SAVE_SUBTYPE[key] && m.isGranted)
  );
}

/**
 * Unlike saving throws (a fixed, automatic class grant), skill proficiencies
 * come from a player choice (background/class "pick N skills") — and just
 * like the ability-score choice bug above, D&D Beyond flags every skill
 * proficiency/expertise modifier `isGranted: false` regardless of whether it
 * was actually chosen. But unlike the ability-score case, there's no need to
 * disambiguate: the modifiers array only ever contains the skills the
 * character actually has (verified against real exports — a Fighter's
 * "choose 2 of 8" class skill list shows up here as exactly 2 entries, not
 * all 8 options), so presence in the array is itself the signal.
 */
/** Equipped armor/shields expose `stealthCheck: 2` when they impose disadvantage on Stealth (1 = normal). */
function hasArmorStealthDisadvantage(data: any): boolean {
  return (data.inventory ?? []).some((i: any) => i.equipped && i.definition?.stealthCheck === 2);
}

function computeSkillProficiencies(mods: any[], armorStealthDisadvantage: boolean): SkillProficiency[] {
  const skills: SkillProficiency[] = [];
  for (const name of Object.keys(SKILL_ABILITY) as SkillName[]) {
    const proficient = mods.some((m) => m.type === "proficiency" && m.subType === name);
    const expertise = mods.some((m) => m.type === "expertise" && m.subType === name);
    const advMod = mods.find((m) => m.type === "advantage" && m.subType === name && m.isGranted);
    const disadvMod = mods.find((m) => m.type === "disadvantage" && m.subType === name && m.isGranted);
    const fromArmor = name === "stealth" && armorStealthDisadvantage;
    if (!proficient && !expertise && !advMod && !disadvMod && !fromArmor) continue;

    let advantage: "advantage" | "disadvantage" | undefined;
    let advantageNote: string | undefined;
    if (advMod || disadvMod) {
      advantage = advMod ? "advantage" : "disadvantage";
      advantageNote = (advMod ?? disadvMod).restriction?.trim() || undefined;
    } else if (fromArmor) {
      advantage = "disadvantage";
      advantageNote = "Wearing armor that imposes disadvantage on Stealth checks.";
    }

    skills.push({
      name,
      proficient,
      expertise,
      ...(advantage ? { advantage, ...(advantageNote ? { advantageNote } : {}) } : {}),
    });
  }
  return skills;
}

/**
 * D&D Beyond doesn't reliably distinguish damage resistances from condition
 * immunities in this endpoint (e.g. immunity to a *condition* like
 * magical-sleep shows up under the same `type: "immunity"` as a damage-type
 * immunity would) — both are surfaced here at face value, matching what the
 * app's Resistances/Immunities/Vulnerabilities section is meant to list.
 */
function computeDamageModifiers(mods: any[]) {
  function namesFor(type: string): string[] {
    const names = mods
      .filter((m) => m.type === type && m.isGranted && m.subType)
      .map((m) => titleCase(m.subType));
    return Array.from(new Set(names));
  }
  return {
    resistances: namesFor("resistance"),
    immunities: namesFor("immunity"),
    vulnerabilities: namesFor("vulnerability"),
  };
}

/**
 * Advantage/disadvantage grants (e.g. Fey Ancestry vs. Charmed, War Caster's
 * advantage on Constitution saves to maintain Concentration, Danger Sense)
 * are modeled as `type: "advantage"|"disadvantage"` modifiers whose
 * `friendlySubtypeName` is the subject ("Constitution Saving Throws") and
 * whose `restriction` is a trailing clause of the full rules sentence (often
 * starting mid-sentence, e.g. "saving throws that you make to maintain
 * Concentration."). Shown as raw fragments joined with a dash rather than
 * reassembled into a single sentence, since restriction text isn't
 * consistently a clean standalone clause.
 */
function computeAdvantages(mods: any[]): string[] {
  const entries = mods.filter((m) => (m.type === "advantage" || m.type === "disadvantage") && m.isGranted);
  const names = entries.map((m) => {
    const prefix = m.type === "disadvantage" ? "Disadvantage" : "Advantage";
    const subject = m.friendlySubtypeName || titleCase(m.subType ?? "");
    const restriction = (m.restriction ?? "").trim();
    return restriction ? `${prefix}: ${subject} — ${restriction}` : `${prefix}: ${subject}`;
  });
  return Array.from(new Set(names));
}

/**
 * Additional senses (Darkvision, Blindsight, Tremorsense, Truesight) appear as
 * modifiers keyed by `subType`, but the `type` field is inconsistent across
 * real character exports (`"set-base"` in one sample, `"sense"` in another)
 * — so both are accepted, keying only off the known `subType` names. When
 * more than one source grants the same sense (e.g. race + an item), the
 * larger range wins.
 */
function computeSenses(mods: any[]): Sense[] {
  const senses: Sense[] = [];
  for (const subType of SENSE_SUBTYPES) {
    const range = mods
      .filter((m) => (m.type === "sense" || m.type === "set-base") && m.subType === subType && m.isGranted)
      .reduce((max, m) => Math.max(max, m.value ?? 0), 0);
    if (range > 0) senses.push({ name: titleCase(subType), range });
  }
  return senses;
}

/**
 * D&D Beyond's `baseHitPoints` only stores the sum of hit-die values rolled/taken
 * at each level — it excludes the Constitution modifier entirely. The Con
 * contribution (conMod * total level) has to be added back on top, along with
 * any flat or per-level HP bonuses (e.g. the Tough feat), matching the formula
 * used by MrPrimate/ddb-importer's character parser.
 *
 * This retroactive formula only holds while a character's Constitution has
 * never changed — if it's raised or lowered later (ASI, a curse, a DM
 * ruling...), recomputing with the *current* modifier silently rewrites HP
 * gained at old levels under a different modifier, drifting the total in
 * either direction with no way to recover the real history from a snapshot.
 * So the computed value is only used to seed max HP the first time a
 * character is synced (or whenever `maxHpLocked` is off); every sync after
 * that defaults to treating max HP as DM-owned and only refreshes current HP
 * against it using D&D Beyond's damage tracker (`removedHitPoints`), which is
 * safe to trust every time. An explicit D&D Beyond HP override always wins
 * outright, regardless of the lock.
 */
function computeHp(data: any, mods: any[], conMod: number, totalLevel: number, existing: Character) {
  const perLevelBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points-per-level" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0) * totalLevel, 0);
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);

  const computedMax =
    conMod * totalLevel + (data.baseHitPoints ?? 0) + (data.bonusHitPoints ?? 0) + perLevelBonus + flatBonus;
  const shouldLockMax = existing.maxHpLocked ?? existing.synced ?? false;
  const maxHp = data.overrideHitPoints ?? (shouldLockMax ? existing.combat.maxHp : computedMax);
  const hp = Math.max(0, maxHp - (data.removedHitPoints ?? 0));
  return { hp, maxHp, tempHp: data.temporaryHitPoints ?? 0, maxHpLocked: true };
}

function computeClassSummary(data: any) {
  const classes = data.classes ?? [];
  const level = classes.reduce((sum: number, c: any) => sum + (c.level ?? 0), 0);
  const primary = classes.find((c: any) => c.isStartingClass) ?? classes[0];
  const className =
    classes.length > 1
      ? classes.map((c: any) => `${c.definition?.name ?? "?"} ${c.level}`).join(" / ")
      : classes[0]?.definition?.name ?? "";
  const subclass = classes.length === 1 ? primary?.subclassDefinition?.name ?? undefined : undefined;
  return { level, className, subclass };
}

function computeSpeed(data: any): number {
  return data.race?.weightSpeeds?.normal?.walk ?? 30;
}

function computeArmorClass(data: any, dexMod: number, mods: any[]): number {
  const inventory = data.inventory ?? [];
  const equippedArmor = inventory.filter(
    (i: any) => i.equipped && i.definition?.filterType === "Armor" && i.definition?.armorTypeId !== 4
  );
  const equippedShields = inventory.filter((i: any) => i.equipped && i.definition?.armorTypeId === 4);

  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "armor-class" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  const shieldBonus = equippedShields.reduce(
    (sum: number, i: any) => sum + (i.definition?.armorClass ?? 0),
    0
  );

  if (equippedArmor.length === 0) {
    return 10 + dexMod + shieldBonus + flatBonus;
  }

  const armor = equippedArmor[0];
  const base = armor.definition?.armorClass ?? 10;
  const type = armor.definition?.type;
  let dexContribution = dexMod;
  if (type === "Medium Armor") dexContribution = Math.min(dexMod, 2);
  else if (type === "Heavy Armor") dexContribution = 0;

  return base + dexContribution + shieldBonus + flatBonus;
}

function computePassiveSkill(abilityMod: number, profBonus: number, skill: string, mods: any[]): number {
  const proficient = mods.some((m) => m.type === "proficiency" && m.subType === skill && m.isGranted);
  const expert = mods.some((m) => m.type === "expertise" && m.subType === skill && m.isGranted);
  const profMultiplier = expert ? 2 : proficient ? 1 : 0;
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === `passive-${skill}` && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  return 10 + abilityMod + profBonus * profMultiplier + flatBonus;
}

function computeInitiative(dexMod: number, mods: any[]): number {
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "initiative" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  return dexMod + flatBonus;
}

/**
 * D&D Beyond's `snippet` is usually clean plain text but NOT always — some
 * (e.g. a Circle Spell feature's Cube-count text) embed raw HTML tags
 * unstripped, confirmed on a real export. So both `snippet` and the
 * HTML `description` fallback go through the same cleaning pass rather
 * than trusting snippet to already be safe.
 *
 * Bold/italic are preserved as markdown-lite `**bold**`/`*italic*` markers
 * (rendered back into real <strong>/<em> by the UI) instead of being
 * dropped like other tags, since D&D Beyond uses them to highlight the
 * one number in a sentence a player actually needs (e.g. "regain **1d10**
 * HP").
 */
function cleanRulesText(html: string): string {
  return html
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\[\/?(?:rules|skill|item|spell|condition)\]/gi, "")
    .replace(/<\/(?:p|div|li)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<(?:strong|b)>/gi, "**")
    .replace(/<\/(?:strong|b)>/gi, "**")
    .replace(/<(?:em|i)>/gi, "*")
    .replace(/<\/(?:em|i)>/gi, "*")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prefers D&D Beyond's `snippet` over its longer `description` (both get the same HTML cleanup). */
function shortDescription(snippet?: string | null, description?: string | null): string | undefined {
  const raw = (snippet && snippet.trim()) || description;
  if (!raw) return undefined;
  const cleaned = cleanRulesText(raw);
  return cleaned || undefined;
}

/** Resolves the D&D Beyond snippet template placeholders we can fill in from data we have. */
function resolveSnippetTemplate(text: string, maxUses: number, level: number, abilities: AbilityScores): string {
  return text
    .replace(/\{\{scalevalue\}\}/gi, String(maxUses))
    .replace(/\{\{limiteduse\}\}/gi, String(maxUses))
    .replace(/\{\{classlevel\}\}/gi, String(level))
    .replace(/\{\{modifier:(\w+)(?:@min:(-?\d+))?#(signed|unsigned)\}\}/gi, (_match, abilityKey, min, sign) => {
      const ability = String(abilityKey).toLowerCase() as keyof AbilityScores;
      let mod = abilityModifier(abilities[ability] ?? 10);
      if (min !== undefined) mod = Math.max(mod, Number(min));
      return sign === "signed" ? formatModifier(mod) : String(mod);
    })
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function computeResources(data: any, abilities: AbilityScores, profBonus: number, level: number): Resource[] {
  const abilityById: Record<number, number> = {
    1: abilities.str,
    2: abilities.dex,
    3: abilities.con,
    4: abilities.int,
    5: abilities.wis,
    6: abilities.cha,
  };

  function fromLimitedUse(
    name: string,
    lu: any,
    keyPrefix: string,
    idx: number,
    rawDescription?: string
  ): Resource | null {
    if (!lu || (!lu.maxUses && !lu.statModifierUsesId && !lu.useProficiencyBonus)) return null;
    let maxUses = lu.maxUses && lu.maxUses !== -1 ? lu.maxUses : 0;
    if (lu.statModifierUsesId) {
      const mod = abilityModifier(abilityById[lu.statModifierUsesId] ?? 10);
      maxUses = lu.operator === 2 ? maxUses * mod : maxUses + mod;
    }
    if (lu.useProficiencyBonus) {
      maxUses = lu.proficiencyBonusOperator === 2 ? maxUses * profBonus : maxUses + profBonus;
    }
    maxUses = Math.max(0, maxUses);
    const description = rawDescription
      ? resolveSnippetTemplate(rawDescription, maxUses, level, abilities)
      : undefined;
    return {
      id: `${keyPrefix}-${idx}`,
      name: name || "Resource",
      current: Math.max(0, maxUses - (lu.numberUsed ?? 0)),
      max: maxUses,
      recovery: RESET_TYPE_MAP[lu.resetType] ?? "manual",
      ...(description ? { description } : {}),
    };
  }

  const resources: Resource[] = [];
  const actionGroups: Array<[string, any[]]> = [
    ["race", data.actions?.race ?? []],
    ["class", data.actions?.class ?? []],
    ["feat", data.actions?.feat ?? []],
  ];
  for (const [group, actions] of actionGroups) {
    actions.forEach((action: any, idx: number) => {
      const resource = fromLimitedUse(
        action.name,
        action.limitedUse,
        `action-${group}`,
        idx,
        shortDescription(action.snippet, action.description)
      );
      if (resource) resources.push(resource);
    });
  }

  (data.inventory ?? [])
    .filter((item: any) => item.equipped && item.limitedUse)
    .forEach((item: any, idx: number) => {
      const resource = fromLimitedUse(
        item.definition?.name,
        item.limitedUse,
        "item",
        idx,
        shortDescription(item.definition?.snippet, item.definition?.description)
      );
      if (resource) resources.push(resource);
    });

  (data.pactMagic ?? []).forEach((pact: any) => {
    const max = (pact.available ?? 0) + (pact.used ?? 0);
    if (max > 0) {
      resources.push({
        id: `pact-${pact.level}`,
        name: `Pact Magic Slot L${pact.level}`,
        current: pact.available ?? 0,
        max,
        recovery: "short-rest",
      });
    }
  });

  return dedupeResourcesByName(resources);
}

/**
 * When a class feature is restated at a higher level (e.g. a Bard's
 * "Bardic Inspiration" being upgraded by level 5's Font of Inspiration,
 * which changes its recharge to Short or Long Rest), D&D Beyond doesn't
 * remove the original lower-level action entry — both stay in the actions
 * array, each independently flagged as limited-use, producing two resources
 * with the same name (confirmed on a real level 5 Bard export). The later
 * entry in the array reflects the character's current level, so it wins.
 */
function dedupeResourcesByName(resources: Resource[]): Resource[] {
  const byName = new Map<string, Resource>();
  for (const resource of resources) {
    byName.set(resource.name.trim().toLowerCase(), resource);
  }
  return resources.filter((r) => byName.get(r.name.trim().toLowerCase()) === r);
}

/**
 * D&D Beyond's `spellSlots[].available` is NOT "slots remaining" — in every
 * real export it's 0 regardless of how many slots are actually free, while
 * `used` tracks consumption against the class's own slot table. The real
 * per-level max comes from `class.definition.spellRules.levelSpellSlots`
 * (indexed by that class's level), which D&D Beyond already computes
 * correctly including the standard full/half/third-caster progression.
 * Multiclass casters are combined via `multiClassSpellSlotDivisor` (1 for
 * full casters, 2 for half, 3 for third) per the normal 5e multiclassing
 * spellcasting rule, then looked up in the same shared table. Warlocks are
 * excluded — their Pact Magic slots are handled separately as a resource.
 */
function computeSpellSlots(data: any): SpellSlotLevel[] {
  const casterClasses = (data.classes ?? []).filter(
    (c: any) =>
      c.definition?.canCastSpells &&
      c.definition?.name !== "Warlock" &&
      Array.isArray(c.definition?.spellRules?.levelSpellSlots)
  );
  if (casterClasses.length === 0) return [];

  let combinedLevel = 0;
  let table: number[][] = casterClasses[0].definition.spellRules.levelSpellSlots;
  for (const c of casterClasses) {
    const divisor = c.definition.spellRules.multiClassSpellSlotDivisor || 1;
    combinedLevel += Math.floor((c.level ?? 0) / divisor);
    if (c.definition.spellRules.levelSpellSlots.length > table.length) {
      table = c.definition.spellRules.levelSpellSlots;
    }
  }
  combinedLevel = Math.min(combinedLevel, table.length - 1);
  const maxes: number[] = table[combinedLevel] ?? [];

  const usedByLevel: Record<number, number> = {};
  for (const slot of data.spellSlots ?? []) {
    usedByLevel[slot.level] = slot.used ?? 0;
  }

  const slots: SpellSlotLevel[] = [];
  maxes.forEach((max, idx) => {
    if (max > 0) {
      const level = idx + 1;
      const used = usedByLevel[level] ?? 0;
      slots.push({ level, current: Math.max(0, max - used), max });
    }
  });
  return slots;
}

/**
 * Unlike computeSpellSlots, Warlocks are NOT excluded here — Spell Attack
 * and Save DC apply to Pact Magic casters too, only the slot table differs.
 * For multiclass casters with different spellcasting abilities per class,
 * this picks the first caster class found (matching this codebase's existing
 * "known limitations" pattern of not fully modeling multiclass edge cases).
 */
function computeSpellcastingStats(
  data: any,
  abilities: AbilityScores,
  profBonus: number
): { modifier: number; attack: number; saveDc: number } | undefined {
  const casterClass = (data.classes ?? []).find((c: any) => c.definition?.canCastSpells && c.definition?.spellCastingAbilityId);
  if (!casterClass) return undefined;
  const ability = ABILITY_BY_ID[casterClass.definition.spellCastingAbilityId];
  if (!ability) return undefined;
  const modifier = abilityModifier(abilities[ability]);
  return { modifier, attack: modifier + profBonus, saveDc: 8 + modifier + profBonus };
}

export class DdbParseError extends Error {}

/** Maps a raw D&D Beyond `character/v5/character/{id}` response onto our Character shape. */
export function parseDdbCharacter(rawResponse: any, existing: Character): Character {
  const data = rawResponse?.data;
  if (!rawResponse?.success || !data) {
    throw new DdbParseError("Неочікуваний формат відповіді D&D Beyond.");
  }

  const mods = collectModifiers(data);
  const abilities = computeAbilityScores(data, mods);
  const dexMod = abilityModifier(abilities.dex);
  const wisMod = abilityModifier(abilities.wis);
  const conMod = abilityModifier(abilities.con);
  const intMod = abilityModifier(abilities.int);
  const { level, className, subclass } = computeClassSummary(data);
  const profBonus = proficiencyBonus(level);
  const { hp, maxHp, tempHp, maxHpLocked } = computeHp(data, mods, conMod, level, existing);
  const { conditions, exhaustion } = computeConditionsAndExhaustion(data);

  return {
    ...existing,
    name: data.name || existing.name,
    avatarUrl: data.decorations?.avatarUrl || data.race?.avatarUrl || existing.avatarUrl,
    race: data.race?.fullName || existing.race,
    className: className || existing.className,
    subclass,
    level: level || existing.level,
    heroicInspiration: Boolean(data.inspiration),
    initiative: computeInitiative(dexMod, mods),
    maxHpLocked,
    combat: {
      hp,
      maxHp,
      tempHp,
      ac: computeArmorClass(data, dexMod, mods),
      speed: computeSpeed(data),
      passivePerception: computePassiveSkill(wisMod, profBonus, "perception", mods),
      passiveInvestigation: computePassiveSkill(intMod, profBonus, "investigation", mods),
      passiveInsight: computePassiveSkill(wisMod, profBonus, "insight", mods),
      conditions,
      exhaustion,
      deathSaves:
        hp <= 0
          ? {
              successes: data.deathSaves?.successCount ?? 0,
              failures: data.deathSaves?.failCount ?? 0,
            }
          : undefined,
    },
    stats: abilities,
    resources: computeResources(data, abilities, profBonus, level),
    spellSlots: computeSpellSlots(data),
    spellcasting: computeSpellcastingStats(data, abilities, profBonus),
    savingThrowProficiencies: computeSavingThrowProficiencies(mods),
    skillProficiencies: computeSkillProficiencies(mods, hasArmorStealthDisadvantage(data)),
    ...computeDamageModifiers(mods),
    advantages: computeAdvantages(mods),
    senses: computeSenses(mods),
    synced: true,
    lastSyncedAt: new Date().toISOString(),
  };
}
