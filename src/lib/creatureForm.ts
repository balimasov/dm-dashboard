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
    hp: template.maxHp,
    maxHp: template.maxHp,
    speed: template.speed,
    stats: template.stats,
    savingThrows: template.savingThrows ?? {},
    senses: template.senses ?? "",
    languages: template.languages ?? "",
    challengeRating: template.challengeRating ?? "",
    traits: template.traits,
  };
}

/** Seeds an edit draft from an existing creature instance. */
export function creatureToFormValue(creature: Creature): CreatureFormValue {
  return {
    templateName: creature.name,
    name: creature.name,
    creatureType: creature.creatureType ?? "",
    size: creature.size ?? "",
    alignment: creature.alignment ?? "",
    ac: creature.ac,
    hp: creature.hp,
    maxHp: creature.maxHp,
    speed: creature.speed,
    stats: creature.stats,
    savingThrows: creature.savingThrows ?? {},
    senses: creature.senses ?? "",
    languages: creature.languages ?? "",
    challengeRating: creature.challengeRating ?? "",
    traits: creature.traits,
    ownerCharacterId: creature.ownerCharacterId ?? "",
    source: creature.source ?? "",
  };
}

function cleanSavingThrows(savingThrows: Partial<AbilityScores>): Partial<AbilityScores> | undefined {
  return Object.keys(savingThrows).length > 0 ? savingThrows : undefined;
}

/** Everything an edited creature instance needs, shared between the Settings roster editor and the dashboard's own edit modal. */
export function formValueToCreatureUpdates(value: CreatureFormValue): Partial<Creature> {
  return {
    name: value.name.trim() || value.templateName.trim(),
    creatureType: value.creatureType || undefined,
    size: value.size || undefined,
    alignment: value.alignment || undefined,
    ac: value.ac,
    hp: value.hp,
    maxHp: value.maxHp,
    speed: value.speed,
    stats: value.stats,
    savingThrows: cleanSavingThrows(value.savingThrows),
    senses: value.senses || undefined,
    languages: value.languages || undefined,
    challengeRating: value.challengeRating || undefined,
    traits: value.traits,
    ownerCharacterId: value.ownerCharacterId || undefined,
    source: value.source || undefined,
  };
}

/** Payload for creating a brand new creature instance (adds `templateName`/`templateId`, which an update never needs). */
export function formValueToAddCreatureInput(value: CreatureFormValue, templateId?: string): AddCreatureInput {
  return {
    templateName: value.templateName.trim(),
    name: value.name.trim() || undefined,
    creatureType: value.creatureType || undefined,
    size: value.size || undefined,
    alignment: value.alignment || undefined,
    ac: value.ac,
    hp: value.hp,
    maxHp: value.maxHp,
    speed: value.speed,
    stats: value.stats,
    savingThrows: cleanSavingThrows(value.savingThrows),
    senses: value.senses || undefined,
    languages: value.languages || undefined,
    challengeRating: value.challengeRating || undefined,
    traits: value.traits,
    ownerCharacterId: value.ownerCharacterId || undefined,
    source: value.source || undefined,
    templateId,
  };
}
