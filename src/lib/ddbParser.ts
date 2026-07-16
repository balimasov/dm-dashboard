import { Character } from "./types";
import { abilityModifier, collectModifiers } from "./ddbParser/shared";
import { RawDdbResponse } from "./ddbParser/rawTypes";
import {
  computeAbilityScores,
  computeSavingThrowProficiencies,
  computeSkillProficiencies,
  computePassiveSkill,
  hasArmorStealthDisadvantage,
} from "./ddbParser/abilities";
import {
  computeArmorClass,
  computeClassSummary,
  computeConditionsAndExhaustion,
  computeHp,
  computeInitiative,
  computeSenses,
  computeSpeed,
} from "./ddbParser/combat";
import { computeAttacks } from "./ddbParser/attacks";
import { computeAdvantages, computeDamageModifiers } from "./ddbParser/damage";
import { computeCurrency, computeInventory } from "./ddbParser/inventory";
import { computeLanguages, computeToolProficiencies } from "./ddbParser/proficiencies";
import { computeResources } from "./ddbParser/resources";
import { computeFeatures } from "./ddbParser/features";
import { computeSpellcastingStats, computeSpells, computeSpellSlots } from "./ddbParser/spells";
import { proficiencyBonus } from "./characterMath";

/**
 * Parses the response of D&D Beyond's undocumented character JSON endpoint
 * (character-service.dndbeyond.com/character/v5/character/{id}).
 *
 * Field meanings below come from inspecting a real character export and
 * cross-referencing MrPrimate/ddb-importer (the most complete open-source
 * parser of this API, used by the ddb-importer Foundry VTT module).
 *
 * The implementation is split by domain under `./ddbParser/` (abilities,
 * combat, damage, inventory, resources, features, spells, plus `shared` for
 * cross-cutting helpers); this file is the orchestrator that threads their
 * outputs together into a `Character`.
 *
 * Known limitations (left for manual correction on the edit page):
 * - Free-choice ability score increases ("choose-an-ability-score" with no
 *   fixed ability) aren't resolved — only fixed racial/item stat bonuses are.
 * - AC handles Barbarian/Monk-style Unarmored Defense (10 + Dex + another
 *   ability while unarmored), but not variants that set a different flat
 *   base (e.g. Draconic Sorcery's 13 + Dex) — those aren't modeled the same
 *   way by D&D Beyond and would need separate handling. Natural armor races,
 *   dragon hide, and dual-wielding AC bonuses also aren't accounted for.
 */

export class DdbParseError extends Error {}

/** Maps a raw D&D Beyond `character/v5/character/{id}` response onto our Character shape. */
export function parseDdbCharacter(rawResponse: RawDdbResponse, existing: Character): Character {
  const data = rawResponse?.data;
  if (!rawResponse?.success || !data) {
    throw new DdbParseError("Unexpected D&D Beyond response format.");
  }

  const mods = collectModifiers(data);
  const abilities = computeAbilityScores(data, mods);
  const dexMod = abilityModifier(abilities.dex);
  const wisMod = abilityModifier(abilities.wis);
  const conMod = abilityModifier(abilities.con);
  const intMod = abilityModifier(abilities.int);
  const { level, className, subclass } = computeClassSummary(data);
  const profBonus = proficiencyBonus(level);
  const { hp, maxHp, tempHp } = computeHp(data, mods, conMod, level);
  const { conditions, exhaustion } = computeConditionsAndExhaustion(data);
  const speed = computeSpeed(data, mods);
  const resources = computeResources(data, abilities, profBonus, level, speed);
  const senses = computeSenses(mods);
  const spellSlots = computeSpellSlots(data);

  return {
    ...existing,
    name: data.name || existing.name,
    avatarUrl: data.decorations?.avatarUrl || data.race?.avatarUrl || existing.avatarUrl,
    race: data.race?.fullName || existing.race,
    className: className || existing.className,
    subclass,
    level: level || existing.level,
    heroicInspiration: Boolean(data.inspiration),
    initiative: computeInitiative(dexMod, profBonus, mods),
    combat: {
      hp,
      maxHp,
      tempHp,
      ac: computeArmorClass(data, abilities, mods),
      speed,
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
    resources,
    spellSlots,
    spellcasting: computeSpellcastingStats(data, abilities, profBonus),
    knownSpells: computeSpells(data, abilities, profBonus, level, speed, spellSlots),
    features: computeFeatures(data, resources, abilities, profBonus, level, speed),
    attacks: computeAttacks(data, abilities, profBonus, mods),
    savingThrowProficiencies: computeSavingThrowProficiencies(mods),
    skillProficiencies: computeSkillProficiencies(mods, hasArmorStealthDisadvantage(data), abilities),
    ...computeDamageModifiers(mods, data.customDefenseAdjustments),
    advantages: computeAdvantages(mods),
    senses,
    languages: computeLanguages(mods),
    toolProficiencies: computeToolProficiencies(mods),
    inventory: computeInventory(data),
    currency: computeCurrency(data),
    synced: true,
    lastSyncedAt: new Date().toISOString(),
  };
}
