import { load as loadYaml } from "js-yaml";
import { AbilityScores, CreatureCategory, CreatureEffect, CreatureSpellcasting, CreatureSpellGroup, CreatureTrait } from "./types";
import { AddCreatureInput } from "@/hooks/useCreatures";
import { CREATURE_IMPORT_FIELDS, CREATURE_STAT_KEYS } from "./creatureImportSchema";

const TRAIT_GROUPS = new Set(["trait", "action", "bonusAction", "reaction", "legendary"]);
const CREATURE_CATEGORIES = new Set(["companion", "enemy", "npc"]);
const ATTACK_TYPES = new Set(["melee", "ranged"]);
const EFFECT_KINDS = new Set(["heal", "tempHp", "acBonus", "other"]);
const STAT_KEY_SET = new Set<string>(CREATURE_STAT_KEYS);

export interface CreatureImportResult {
  input: AddCreatureInput;
  /** Raw text of the template's `ownerCharacter` convenience field, if present — resolved to `ownerCharacterId` by the caller, which has access to the campaign's character list (this module is data-only and doesn't know about any particular campaign). */
  ownerCharacterName?: string;
}

export type CreatureImportOutcome =
  | { ok: true; result: CreatureImportResult; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function readString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : String(raw).trim();
}

function readAbilityScores(raw: unknown, errors: string[], label: string): AbilityScores | undefined {
  if (!isPlainObject(raw)) {
    errors.push(`"${label}" має бути об'єктом з ключами ${CREATURE_STAT_KEYS.join(", ")}.`);
    return undefined;
  }
  const result = {} as AbilityScores;
  const missing: string[] = [];
  for (const key of CREATURE_STAT_KEYS) {
    const value = Number(raw[key]);
    if (raw[key] === undefined || !Number.isFinite(value)) {
      missing.push(key);
    } else {
      result[key] = value;
    }
  }
  if (missing.length > 0) {
    errors.push(`"${label}" бракує числових значень для: ${missing.join(", ")}.`);
    return undefined;
  }
  return result;
}

function readPartialAbilityScores(raw: unknown, errors: string[], label: string): Partial<AbilityScores> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) {
    errors.push(`"${label}" має бути об'єктом (можеш лишити порожнім {}).`);
    return undefined;
  }
  const result: Partial<AbilityScores> = {};
  const statKeySet = new Set<string>(CREATURE_STAT_KEYS);
  for (const [key, value] of Object.entries(raw)) {
    if (!statKeySet.has(key)) {
      errors.push(`"${label}" містить невідому характеристику "${key}" — очікуються лише ${CREATURE_STAT_KEYS.join(", ")}.`);
      continue;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      errors.push(`"${label}.${key}" має бути числом.`);
      continue;
    }
    result[key as keyof AbilityScores] = num;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

type CreatureDamageRolls = NonNullable<CreatureTrait["attack"]>["damage"];

/** `traits[index].attack.damage` — a list of `{dice, damageType}` rolls (an attack can deal several types at once). Accepts a bare string too (`damage: "2d6 +4"`, no `damageType`) so a hand-typed single-roll attack doesn't need the extra list/object nesting for the common case. */
function readTraitDamage(raw: unknown, index: number, errors: string[]): CreatureDamageRolls {
  if (isBlank(raw)) {
    errors.push(`traits[${index}].attack.damage є обов'язковим (напр. "2d6 +4" або список [{dice: "2d6 +4"}]).`);
    return [];
  }
  if (typeof raw === "string") return [{ dice: readString(raw), damageType: undefined }];
  if (!Array.isArray(raw)) {
    errors.push(`traits[${index}].attack.damage має бути рядком або списком [{dice, damageType}].`);
    return [];
  }
  const rolls: CreatureDamageRolls = [];
  raw.forEach((entry, rollIndex) => {
    if (typeof entry === "string") {
      rolls.push({ dice: readString(entry), damageType: undefined });
      return;
    }
    if (!isPlainObject(entry) || isBlank(entry.dice)) {
      errors.push(`traits[${index}].attack.damage[${rollIndex}] має бути рядком або об'єктом з полем dice.`);
      return;
    }
    rolls.push({ dice: readString(entry.dice), damageType: isBlank(entry.damageType) ? undefined : readString(entry.damageType) });
  });
  return rolls;
}

/** `traits[index].attack` — returns `undefined` (with an error pushed) on any malformed sub-field rather than throwing, same "collect everything" style as the rest of this file. */
function readTraitAttack(raw: unknown, index: number, errors: string[]): CreatureTrait["attack"] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) {
    errors.push(`traits[${index}].attack має бути об'єктом з полями attackType/attackBonus/damage.`);
    return undefined;
  }
  const attackType = raw.attackType;
  if (!ATTACK_TYPES.has(String(attackType))) {
    errors.push(`traits[${index}].attack.attackType має бути "melee" або "ranged" (отримано "${String(attackType)}").`);
    return undefined;
  }
  const attackBonus = Number(raw.attackBonus);
  if (raw.attackBonus === undefined || !Number.isFinite(attackBonus)) {
    errors.push(`traits[${index}].attack.attackBonus має бути числом.`);
    return undefined;
  }
  const damage = readTraitDamage(raw.damage, index, errors);
  if (damage.length === 0) return undefined;
  // Backward compat: a YAML saved before `damage` became a list carried a
  // sibling `damageType` string next to a bare-string `damage` — still read
  // here so that file imports with the exact same result as before.
  if (damage.length === 1 && damage[0].damageType === undefined && !isBlank(raw.damageType)) {
    damage[0] = { ...damage[0], damageType: readString(raw.damageType) };
  }
  // Backward compat: `range` used to be free text including a "ft." suffix
  // (e.g. "5 ft.") — the trailing unit is stripped here so an old file still
  // imports into the new "numbers only" convention rather than double-adding
  // it wherever `range` is displayed.
  const range = isBlank(raw.range) ? undefined : readString(raw.range).replace(/\s*ft\.?\s*$/i, "").trim() || undefined;
  return {
    attackType: attackType as "melee" | "ranged",
    attackBonus,
    damage,
    range,
  };
}

/** `traits[index].effects` — non-damage effects (heal/temp HP/AC bonus/other), same "collect everything" style as `readTraitAttack`. */
function readTraitEffects(raw: unknown, index: number, errors: string[]): CreatureEffect[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    errors.push(`traits[${index}].effects має бути списком (навіть порожнім — []).`);
    return undefined;
  }
  const effects: CreatureEffect[] = [];
  raw.forEach((entry, effectIndex) => {
    if (!isPlainObject(entry)) {
      errors.push(`traits[${index}].effects[${effectIndex}] має бути об'єктом з полями kind/amount.`);
      return;
    }
    const kind = entry.kind;
    if (!EFFECT_KINDS.has(String(kind))) {
      errors.push(`traits[${index}].effects[${effectIndex}].kind має бути одним з: heal, tempHp, acBonus, other (отримано "${String(kind)}").`);
      return;
    }
    if (isBlank(entry.amount)) {
      errors.push(`traits[${index}].effects[${effectIndex}].amount є обов'язковим (напр. "2d8 +4").`);
      return;
    }
    if (kind === "other" && isBlank(entry.label)) {
      errors.push(`traits[${index}].effects[${effectIndex}].label є обов'язковим для kind "other".`);
      return;
    }
    effects.push({
      kind: kind as CreatureEffect["kind"],
      amount: readString(entry.amount),
      label: isBlank(entry.label) ? undefined : readString(entry.label),
    });
  });
  return effects;
}

/** `traits[index].save` — same "collect everything" style as `readTraitAttack`. */
function readTraitSave(raw: unknown, index: number, errors: string[]): CreatureTrait["save"] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) {
    errors.push(`traits[${index}].save має бути об'єктом з полями ability/dc.`);
    return undefined;
  }
  const ability = raw.ability;
  if (!STAT_KEY_SET.has(String(ability))) {
    errors.push(`traits[${index}].save.ability має бути одним з: ${CREATURE_STAT_KEYS.join(", ")} (отримано "${String(ability)}").`);
    return undefined;
  }
  const dc = Number(raw.dc);
  if (raw.dc === undefined || !Number.isFinite(dc)) {
    errors.push(`traits[${index}].save.dc має бути числом.`);
    return undefined;
  }
  return { ability: ability as keyof AbilityScores, dc };
}

function readTraits(raw: unknown, errors: string[]): CreatureTrait[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push(`"traits" має бути списком (навіть порожнім — []).`);
    return [];
  }
  const traits: CreatureTrait[] = [];
  raw.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`traits[${index}] має бути об'єктом з полями name/description/group.`);
      return;
    }
    if (isBlank(entry.name)) {
      errors.push(`traits[${index}].name є обов'язковим.`);
      return;
    }
    const group = entry.group;
    if (group !== undefined && !TRAIT_GROUPS.has(String(group))) {
      errors.push(
        `traits[${index}].group має бути одним з: trait, action, bonusAction, reaction, legendary (отримано "${String(group)}").`
      );
      return;
    }
    traits.push({
      name: readString(entry.name),
      description: isBlank(entry.description) ? undefined : readString(entry.description),
      group: group as CreatureTrait["group"] | undefined,
      recharge: isBlank(entry.recharge) ? undefined : readString(entry.recharge),
      attack: readTraitAttack(entry.attack, index, errors),
      save: readTraitSave(entry.save, index, errors),
      effects: readTraitEffects(entry.effects, index, errors),
    });
  });
  return traits;
}

/** `spellcasting.spellGroups[index]` — a label + list of spell names. Also accepts the pre-1.30 flat-line form (`"At will: mage hand, minor illusion"`, a bare string) so a YAML file saved before `spellGroups` existed still imports unchanged. */
function readSpellGroups(raw: unknown, errors: string[]): CreatureSpellGroup[] {
  if (!Array.isArray(raw)) {
    errors.push(`"spellcasting.spellGroups" має бути списком (навіть порожнім — []).`);
    return [];
  }
  const groups: CreatureSpellGroup[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry === "string") {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex === -1) {
        groups.push({ label: "", spells: [entry.trim()].filter(Boolean) });
      } else {
        groups.push({
          label: entry.slice(0, separatorIndex).trim(),
          spells: entry
            .slice(separatorIndex + 1)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      }
      return;
    }
    if (!isPlainObject(entry)) {
      errors.push(`"spellcasting.spellGroups[${index}]" має бути рядком або об'єктом з полями label/spells.`);
      return;
    }
    if (!Array.isArray(entry.spells)) {
      errors.push(`"spellcasting.spellGroups[${index}].spells" має бути списком назв заклять.`);
      return;
    }
    groups.push({
      label: isBlank(entry.label) ? "" : readString(entry.label),
      spells: entry.spells.map((s) => readString(s)),
    });
  });
  return groups;
}

function readSpellcasting(raw: unknown, errors: string[]): CreatureSpellcasting | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) {
    errors.push(`"spellcasting" має бути об'єктом з полями ability/saveDc/attackBonus/spellGroups.`);
    return undefined;
  }
  const ability = raw.ability;
  if (!STAT_KEY_SET.has(String(ability))) {
    errors.push(`"spellcasting.ability" має бути одним з: ${CREATURE_STAT_KEYS.join(", ")} (отримано "${String(ability)}").`);
    return undefined;
  }
  const saveDc = Number(raw.saveDc);
  if (raw.saveDc === undefined || !Number.isFinite(saveDc)) {
    errors.push(`"spellcasting.saveDc" має бути числом.`);
    return undefined;
  }
  const attackBonus = Number(raw.attackBonus);
  if (raw.attackBonus === undefined || !Number.isFinite(attackBonus)) {
    errors.push(`"spellcasting.attackBonus" має бути числом.`);
    return undefined;
  }
  // `spells` is the pre-1.30 field name (a flat list of "label: spell, spell" lines) — still
  // read here so a YAML saved before `spellGroups` existed imports unchanged.
  const groupsRaw = raw.spellGroups ?? raw.spells;
  const spellGroups = groupsRaw === undefined ? [] : readSpellGroups(groupsRaw, errors);
  return { ability: ability as keyof AbilityScores, saveDc, attackBonus, spellGroups };
}

/**
 * Parses and validates a hand/AI-filled YAML creature file against
 * `CREATURE_IMPORT_FIELDS` (the same schema the downloadable template is
 * generated from), returning either a ready-to-post `AddCreatureInput` or a
 * full list of every problem found — collected across the whole file rather
 * than stopping at the first one, so a DM (or the AI helping them) sees
 * everything that needs fixing in one pass instead of one error at a time.
 */
export function parseCreatureImportYaml(text: string): CreatureImportOutcome {
  let parsed: unknown;
  try {
    parsed = loadYaml(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`Невалідний YAML: ${message}`], warnings: [] };
  }

  if (parsed === undefined || parsed === null) {
    return { ok: false, errors: ["Файл порожній."], warnings: [] };
  }
  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      errors: ["Кореневий елемент шаблону має бути об'єктом (map), а не списком чи одним значенням."],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const values: Record<string, unknown> = {};

  for (const field of CREATURE_IMPORT_FIELDS) {
    if (!field.includeInTemplate) continue;
    const raw = parsed[field.key];

    if (field.required && isBlank(raw)) {
      errors.push(`"${String(field.key)}" є обов'язковим полем.`);
      continue;
    }
    if (isBlank(raw)) continue;

    switch (field.kind) {
      case "string":
        values[field.key] = readString(raw);
        break;
      case "number": {
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          errors.push(`"${String(field.key)}" має бути числом.`);
        } else {
          values[field.key] = num;
        }
        break;
      }
      case "abilityScores":
        values[field.key] = readAbilityScores(raw, errors, String(field.key));
        break;
      case "partialAbilityScores":
        values[field.key] = readPartialAbilityScores(raw, errors, String(field.key));
        break;
      case "traits":
        values[field.key] = readTraits(raw, errors);
        break;
      case "spellcasting":
        values[field.key] = readSpellcasting(raw, errors);
        break;
    }
  }

  if (values.category !== undefined && !CREATURE_CATEGORIES.has(values.category as string)) {
    errors.push(`"category" має бути одним з: companion, enemy, npc (отримано "${String(values.category)}").`);
  }

  const knownKeys = new Set<string>([
    ...CREATURE_IMPORT_FIELDS.map((f): string => String(f.key)),
    "ownerCharacter",
  ]);
  for (const key of Object.keys(parsed)) {
    if (!knownKeys.has(key)) warnings.push(`Невідоме поле "${key}" проігноровано.`);
  }

  if (errors.length > 0) return { ok: false, errors, warnings };

  const templateName = values.templateName as string;
  const maxHp = values.maxHp as number;

  const input: AddCreatureInput = {
    templateName,
    name: (values.name as string | undefined) || undefined,
    category: (values.category as CreatureCategory | undefined) ?? "companion",
    creatureType: values.creatureType as string | undefined,
    size: values.size as string | undefined,
    alignment: values.alignment as string | undefined,
    ac: values.ac as number,
    armorDesc: values.armorDesc as string | undefined,
    hp: maxHp,
    maxHp,
    hitDice: values.hitDice as string | undefined,
    speed: values.speed as number,
    speedDetail: values.speedDetail as string | undefined,
    initiativeBonus: values.initiativeBonus as number | undefined,
    proficiencyBonus: values.proficiencyBonus as number | undefined,
    stats: values.stats as AbilityScores,
    savingThrows: values.savingThrows as Partial<AbilityScores> | undefined,
    senses: values.senses as string | undefined,
    languages: values.languages as string | undefined,
    challengeRating: values.challengeRating as string | undefined,
    experiencePoints: values.experiencePoints as number | undefined,
    skills: values.skills as string | undefined,
    damageVulnerabilities: values.damageVulnerabilities as string | undefined,
    damageResistances: values.damageResistances as string | undefined,
    damageImmunities: values.damageImmunities as string | undefined,
    conditionImmunities: values.conditionImmunities as string | undefined,
    traits: (values.traits as CreatureTrait[] | undefined) ?? [],
    spellcasting: values.spellcasting as CreatureSpellcasting | undefined,
    source: values.source as string | undefined,
  };

  const ownerCharacterName = isBlank(parsed.ownerCharacter) ? undefined : readString(parsed.ownerCharacter);

  return { ok: true, result: { input, ownerCharacterName }, warnings };
}
