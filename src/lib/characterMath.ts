/** Pure D&D 5e numeric formulas — split out of `types.ts` so that file stays interfaces/constants only. */
import { AbilityScores, Character, Currency, SkillProficiency } from "./types";
import { SKILL_ABILITY } from "./types";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(level, 1) - 1) / 4);
}

/** Ability-mod + proficiency bonus if proficient in that save, else the plain ability mod. */
export function savingThrowBonus(character: Character, ability: keyof AbilityScores): number {
  const mod = abilityModifier(character.stats[ability]);
  return character.savingThrowProficiencies.includes(ability)
    ? mod + proficiencyBonus(character.level)
    : mod;
}

/** Ability-mod + proficiency bonus (doubled for expertise) — plain ability mod if not actually proficient. */
export function skillBonus(character: Character, skill: SkillProficiency): number {
  const mod = abilityModifier(character.stats[SKILL_ABILITY[skill.name]]);
  const extra = skill.bonus ?? 0;
  if (skill.proficient || skill.expertise) {
    const multiplier = skill.expertise ? 2 : 1;
    return mod + proficiencyBonus(character.level) * multiplier + extra;
  }
  if (skill.halfProficiency) return mod + Math.floor(proficiencyBonus(character.level) / 2) + extra;
  return mod + extra;
}

/** Standard 5e coin conversion (10 cp = 1 sp, 10 sp = 1 gp, 2 gp = 1 ep... expressed directly in GP). */
export function currencyToGp(currency: Currency): number {
  return currency.pp * 10 + currency.gp + currency.ep * 0.5 + currency.sp * 0.1 + currency.cp * 0.01;
}
