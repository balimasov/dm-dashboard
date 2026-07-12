import { load as loadYaml } from "js-yaml";
import { AbilityScores, CreatureTrait } from "./types";
import { AddCreatureInput } from "@/hooks/useCreatures";
import { CREATURE_IMPORT_FIELDS, CREATURE_STAT_KEYS } from "./creatureImportSchema";

const TRAIT_GROUPS = new Set(["trait", "action", "bonusAction", "reaction", "legendary"]);

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
    });
  });
  return traits;
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
    }
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
    source: values.source as string | undefined,
  };

  const ownerCharacterName = isBlank(parsed.ownerCharacter) ? undefined : readString(parsed.ownerCharacter);

  return { ok: true, result: { input, ownerCharacterName }, warnings };
}
