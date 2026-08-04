import { AbilityScores, Creature, CreatureSpellcasting, CreatureSpellGroup, CreatureTemplate } from "./types";
import { AddCreatureInput } from "@/hooks/useCreatures";
import { CreatureFormValue, emptyCreatureFormValue } from "@/components/CreatureFormFields";

/** Seeds the edit form's spell-group rows from a stored `CreatureSpellGroup[]` — each group's `spells` array becomes one comma-separated line, split back apart on save (see `buildSpellcasting`). */
function spellGroupsToFormValue(groups: CreatureSpellGroup[] | undefined): Array<{ label: string; spells: string }> {
  return (groups ?? []).map((g) => ({ label: g.label, spells: g.spells.join(", ") }));
}

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
    proficiencyBonus: template.proficiencyBonus !== undefined ? String(template.proficiencyBonus) : "",
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
    spellcastingAbility: template.spellcasting?.ability ?? "",
    spellcastingSaveDc: template.spellcasting ? String(template.spellcasting.saveDc) : "",
    spellcastingAttackBonus: template.spellcasting ? String(template.spellcasting.attackBonus) : "",
    spellcastingGroups: spellGroupsToFormValue(template.spellcasting?.spellGroups),
  };
}

/** Seeds an edit draft from an existing creature instance. */
export function creatureToFormValue(creature: Creature): CreatureFormValue {
  return {
    templateName: creature.templateName,
    name: creature.name,
    category: creature.category,
    avatarUrl: creature.avatarUrl ?? "",
    creatureType: creature.creatureType ?? "",
    size: creature.size ?? "",
    alignment: creature.alignment ?? "",
    ac: creature.ac,
    armorDesc: creature.armorDesc ?? "",
    proficiencyBonus: creature.proficiencyBonus !== undefined ? String(creature.proficiencyBonus) : "",
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
    spellcastingAbility: creature.spellcasting?.ability ?? "",
    spellcastingSaveDc: creature.spellcasting ? String(creature.spellcasting.saveDc) : "",
    spellcastingAttackBonus: creature.spellcasting ? String(creature.spellcasting.attackBonus) : "",
    spellcastingGroups: spellGroupsToFormValue(creature.spellcasting?.spellGroups),
    ownerCharacterId: creature.ownerCharacterId ?? "",
    source: creature.source ?? "",
    referenceUrl: creature.referenceUrl ?? "",
    notes: creature.notes ?? "",
  };
}

function cleanSavingThrows(savingThrows: Partial<AbilityScores>): Partial<AbilityScores> | undefined {
  return Object.keys(savingThrows).length > 0 ? savingThrows : undefined;
}

/** Same as `cleanSavingThrows`, but for an *update* — an emptied-out saving-throws map becomes an explicit `null` "clear this" signal instead of `undefined` (see `formValueToCreatureUpdates`'s doc comment for why). */
function cleanSavingThrowsOrClear(savingThrows: Partial<AbilityScores>): Partial<AbilityScores> | null {
  return cleanSavingThrows(savingThrows) ?? null;
}

function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/** Same parsing as `parseOptionalNumber`, but for an *update* — a blank/invalid field becomes an explicit `null` "clear this" signal instead of `undefined` (see `formValueToCreatureUpdates`'s doc comment for why). */
function parseNumberOrClear(text: string): number | null {
  return parseOptionalNumber(text) ?? null;
}

/** `spellcastingAbility` blank = no spellcasting at all, regardless of what's typed into the other `spellcasting*` fields — same "the ability picker is the on/off switch" convention the form's own disabled-inputs use. Each group's comma-separated `spells` text splits into individual names; a group left with no spells (blank text) is dropped rather than saved as an empty bucket. */
function buildSpellcasting(value: CreatureFormValue): CreatureSpellcasting | undefined {
  if (!value.spellcastingAbility) return undefined;
  const spellGroups: CreatureSpellGroup[] = value.spellcastingGroups
    .map((g) => ({
      label: g.label.trim(),
      spells: g.spells
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }))
    .filter((g) => g.spells.length > 0);
  return {
    ability: value.spellcastingAbility,
    saveDc: parseOptionalNumber(value.spellcastingSaveDc) ?? 0,
    attackBonus: parseOptionalNumber(value.spellcastingAttackBonus) ?? 0,
    spellGroups,
  };
}

/** Same as `buildSpellcasting`, but for an *update* — a blank `spellcastingAbility` (spellcasting removed entirely) becomes an explicit `null` "clear this" signal instead of `undefined` (see `formValueToCreatureUpdates`'s doc comment for why). */
function buildSpellcastingOrClear(value: CreatureFormValue): CreatureSpellcasting | null {
  return buildSpellcasting(value) ?? null;
}

/**
 * Everything an edited creature instance needs, shared between the Settings
 * roster editor and the dashboard's own edit modal.
 *
 * Every optional field below sends `null`, not `undefined`, when the form
 * leaves it blank. `JSON.stringify` drops keys whose value is `undefined`
 * entirely, so a PATCH body built with `undefined` could never tell the API
 * "clear this field" apart from "this field wasn't touched" — once it
 * reaches the server, both look identical, and a once-set field could never
 * be cleared again (this is exactly how "can't unassign an owner" happened:
 * `ownerCharacterId: undefined` vanished on the wire). `null` survives
 * `JSON.stringify`, and `updateCreature` in `db.ts` normalizes it back to
 * `undefined` before merging/storing, so the persisted data and the
 * `Creature` type (which never has `| null`) stay consistent — hence the
 * cast on the return below, a deliberate "white lie" to the type checker
 * about a value this function's own callers never need to see as anything
 * but `Partial<Creature>`.
 */
export function formValueToCreatureUpdates(value: CreatureFormValue): Partial<Creature> {
  return {
    templateName: value.templateName.trim() || value.name.trim(),
    name: value.name.trim() || value.templateName.trim(),
    category: value.category,
    avatarUrl: value.avatarUrl || null,
    creatureType: value.creatureType || null,
    size: value.size || null,
    alignment: value.alignment || null,
    ac: value.ac,
    armorDesc: value.armorDesc || null,
    proficiencyBonus: parseNumberOrClear(value.proficiencyBonus),
    hp: value.hp,
    maxHp: value.maxHp,
    hitDice: value.hitDice || null,
    speed: value.speed,
    speedDetail: value.speedDetail || null,
    initiativeBonus: parseNumberOrClear(value.initiativeBonus),
    stats: value.stats,
    savingThrows: cleanSavingThrowsOrClear(value.savingThrows),
    senses: value.senses || null,
    languages: value.languages || null,
    challengeRating: value.challengeRating || null,
    experiencePoints: parseNumberOrClear(value.experiencePoints),
    skills: value.skills || null,
    damageVulnerabilities: value.damageVulnerabilities || null,
    damageResistances: value.damageResistances || null,
    damageImmunities: value.damageImmunities || null,
    conditionImmunities: value.conditionImmunities || null,
    traits: value.traits,
    spellcasting: buildSpellcastingOrClear(value),
    ownerCharacterId: value.ownerCharacterId || null,
    source: value.source || null,
    referenceUrl: value.referenceUrl || null,
    notes: value.notes || null,
  } as Partial<Creature>;
}

/** Payload for creating a brand new creature instance (adds `templateName`/`templateId`, which an update never needs). */
export function formValueToAddCreatureInput(value: CreatureFormValue, templateId?: string): AddCreatureInput {
  return {
    templateName: value.templateName.trim(),
    name: value.name.trim() || undefined,
    category: value.category,
    avatarUrl: value.avatarUrl || undefined,
    creatureType: value.creatureType || undefined,
    size: value.size || undefined,
    alignment: value.alignment || undefined,
    ac: value.ac,
    armorDesc: value.armorDesc || undefined,
    proficiencyBonus: parseOptionalNumber(value.proficiencyBonus),
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
    spellcasting: buildSpellcasting(value),
    ownerCharacterId: value.ownerCharacterId || undefined,
    source: value.source || undefined,
    referenceUrl: value.referenceUrl || undefined,
    templateId,
  };
}
