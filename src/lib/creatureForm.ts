import { AbilityScores, Creature, CreatureTemplate } from "./types";
import { AddCreatureInput } from "@/hooks/useCreatures";
import { CreatureFormValue, emptyCreatureFormValue } from "@/components/CreatureFormFields";

/** Seeds an "Add Creature" draft from a picked bestiary/SRD search result. */
export function templateToFormValue(template: CreatureTemplate): CreatureFormValue {
  return {
    ...emptyCreatureFormValue(),
    templateName: template.name,
    creatureType: template.creatureType ?? "",
    size: template.size ?? "",
    alignment: template.alignment ?? "",
    ac: template.ac,
    armorDesc: template.armorDesc ?? "",
    hp: template.maxHp,
    maxHp: template.maxHp,
    hitDice: template.hitDice ?? "",
    speed: template.speed,
    speedDetail: template.speedDetail ?? "",
    initiativeBonus: template.initiativeBonus !== undefined ? String(template.initiativeBonus) : "",
    stats: template.stats,
    savingThrows: template.savingThrows ?? {},
    senses: template.senses ?? "",
    languages: template.languages ?? "",
    challengeRating: template.challengeRating ?? "",
    experiencePoints: template.experiencePoints !== undefined ? String(template.experiencePoints) : "",
    skills: template.skills ?? "",
    damageVulnerabilities: template.damageVulnerabilities ?? "",
    damageResistances: template.damageResistances ?? "",
    damageImmunities: template.damageImmunities ?? "",
    conditionImmunities: template.conditionImmunities ?? "",
    traits: template.traits,
  };
}

/** Seeds an edit draft from an existing creature instance. */
export function creatureToFormValue(creature: Creature): CreatureFormValue {
  return {
    templateName: creature.templateName,
    name: creature.name,
    avatarUrl: creature.avatarUrl ?? "",
    creatureType: creature.creatureType ?? "",
    size: creature.size ?? "",
    alignment: creature.alignment ?? "",
    ac: creature.ac,
    armorDesc: creature.armorDesc ?? "",
    hp: creature.hp,
    maxHp: creature.maxHp,
    hitDice: creature.hitDice ?? "",
    speed: creature.speed,
    speedDetail: creature.speedDetail ?? "",
    initiativeBonus: creature.initiativeBonus !== undefined ? String(creature.initiativeBonus) : "",
    stats: creature.stats,
    savingThrows: creature.savingThrows ?? {},
    senses: creature.senses ?? "",
    languages: creature.languages ?? "",
    challengeRating: creature.challengeRating ?? "",
    experiencePoints: creature.experiencePoints !== undefined ? String(creature.experiencePoints) : "",
    skills: creature.skills ?? "",
    damageVulnerabilities: creature.damageVulnerabilities ?? "",
    damageResistances: creature.damageResistances ?? "",
    damageImmunities: creature.damageImmunities ?? "",
    conditionImmunities: creature.conditionImmunities ?? "",
    traits: creature.traits,
    ownerCharacterId: creature.ownerCharacterId ?? "",
    source: creature.source ?? "",
    notes: creature.notes ?? "",
  };
}

function cleanSavingThrows(savingThrows: Partial<AbilityScores>): Partial<AbilityScores> | undefined {
  return Object.keys(savingThrows).length > 0 ? savingThrows : undefined;
}

function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/** Everything an edited creature instance needs, shared between the Settings roster editor and the dashboard's own edit modal. */
export function formValueToCreatureUpdates(value: CreatureFormValue): Partial<Creature> {
  return {
    templateName: value.templateName.trim() || value.name.trim(),
    name: value.name.trim() || value.templateName.trim(),
    avatarUrl: value.avatarUrl || undefined,
    creatureType: value.creatureType || undefined,
    size: value.size || undefined,
    alignment: value.alignment || undefined,
    ac: value.ac,
    armorDesc: value.armorDesc || undefined,
    hp: value.hp,
    maxHp: value.maxHp,
    hitDice: value.hitDice || undefined,
    speed: value.speed,
    speedDetail: value.speedDetail || undefined,
    initiativeBonus: parseOptionalNumber(value.initiativeBonus),
    stats: value.stats,
    savingThrows: cleanSavingThrows(value.savingThrows),
    senses: value.senses || undefined,
    languages: value.languages || undefined,
    challengeRating: value.challengeRating || undefined,
    experiencePoints: parseOptionalNumber(value.experiencePoints),
    skills: value.skills || undefined,
    damageVulnerabilities: value.damageVulnerabilities || undefined,
    damageResistances: value.damageResistances || undefined,
    damageImmunities: value.damageImmunities || undefined,
    conditionImmunities: value.conditionImmunities || undefined,
    traits: value.traits,
    ownerCharacterId: value.ownerCharacterId || undefined,
    source: value.source || undefined,
    notes: value.notes || undefined,
  };
}

/** Payload for creating a brand new creature instance (adds `templateName`/`templateId`, which an update never needs). */
export function formValueToAddCreatureInput(value: CreatureFormValue, templateId?: string): AddCreatureInput {
  return {
    templateName: value.templateName.trim(),
    name: value.name.trim() || undefined,
    avatarUrl: value.avatarUrl || undefined,
    creatureType: value.creatureType || undefined,
    size: value.size || undefined,
    alignment: value.alignment || undefined,
    ac: value.ac,
    armorDesc: value.armorDesc || undefined,
    hp: value.hp,
    maxHp: value.maxHp,
    hitDice: value.hitDice || undefined,
    speed: value.speed,
    speedDetail: value.speedDetail || undefined,
    initiativeBonus: parseOptionalNumber(value.initiativeBonus),
    stats: value.stats,
    savingThrows: cleanSavingThrows(value.savingThrows),
    senses: value.senses || undefined,
    languages: value.languages || undefined,
    challengeRating: value.challengeRating || undefined,
    experiencePoints: parseOptionalNumber(value.experiencePoints),
    skills: value.skills || undefined,
    damageVulnerabilities: value.damageVulnerabilities || undefined,
    damageResistances: value.damageResistances || undefined,
    damageImmunities: value.damageImmunities || undefined,
    conditionImmunities: value.conditionImmunities || undefined,
    traits: value.traits,
    ownerCharacterId: value.ownerCharacterId || undefined,
    source: value.source || undefined,
    templateId,
  };
}
