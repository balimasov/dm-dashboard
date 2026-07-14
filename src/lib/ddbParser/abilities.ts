import { AbilityScores, SKILL_ABILITY, SkillName, SkillProficiency } from "../types";
import { ABILITY_BY_ID, abilityModifier } from "./shared";
import { RawDdbData, RawDdbModifier } from "./rawTypes";

const ABILITY_SUBTYPE: Record<keyof AbilityScores, string> = {
  str: "strength-score",
  dex: "dexterity-score",
  con: "constitution-score",
  int: "intelligence-score",
  wis: "wisdom-score",
  cha: "charisma-score",
};

/**
 * A whole-ability grant (e.g. a Changeling's advantage "on Charisma ability
 * checks" — confirmed on a real export) is a single modifier keyed by the
 * *ability*, not any one skill, so it never matches a per-skill subType like
 * "deception" directly. Every skill under that ability (Deception,
 * Intimidation, Performance, Persuasion for Charisma) needs to inherit it.
 */
const ABILITY_CHECK_SUBTYPE: Record<keyof AbilityScores, string> = {
  str: "strength-ability-checks",
  dex: "dexterity-ability-checks",
  con: "constitution-ability-checks",
  int: "intelligence-ability-checks",
  wis: "wisdom-ability-checks",
  cha: "charisma-ability-checks",
};

const SAVE_SUBTYPE: Record<keyof AbilityScores, string> = {
  str: "strength-saving-throws",
  dex: "dexterity-saving-throws",
  con: "constitution-saving-throws",
  int: "intelligence-saving-throws",
  wis: "wisdom-saving-throws",
  cha: "charisma-saving-throws",
};

export function computeAbilityScores(data: RawDdbData, mods: RawDdbModifier[]): AbilityScores {
  const result = {} as AbilityScores;
  for (const [idStr, key] of Object.entries(ABILITY_BY_ID)) {
    const id = Number(idStr);
    const base = data.stats?.find((s) => s.id === id)?.value ?? 10;
    const bonus = data.bonusStats?.find((s) => s.id === id)?.value ?? 0;
    const override = data.overrideStats?.find((s) => s.id === id)?.value;
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

export function computeSavingThrowProficiencies(mods: RawDdbModifier[]): Array<keyof AbilityScores> {
  return (Object.keys(SAVE_SUBTYPE) as Array<keyof AbilityScores>).filter((key) =>
    mods.some((m) => m.type === "proficiency" && m.subType === SAVE_SUBTYPE[key] && m.isGranted)
  );
}

/** Equipped armor/shields expose `stealthCheck: 2` when they impose disadvantage on Stealth (1 = normal). */
export function hasArmorStealthDisadvantage(data: RawDdbData): boolean {
  return (data.inventory ?? []).some((i) => i.equipped && i.definition?.stealthCheck === 2);
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
 *
 * A Bard's Jack of All Trades (and similar features) grant half the
 * proficiency bonus, rounded down, on ability checks that don't already
 * include the full bonus — modeled by D&D Beyond as a `type:
 * "half-proficiency"` modifier. Confirmed on a real Bard export: `subType:
 * "ability-checks"` with no `entityId`, meaning it's not scoped to one skill
 * but applies across the board — every skill this character isn't already
 * proficient/expert in still gets the half bonus, so all of them start
 * showing up here (previously only proficient/expertise/advantage skills
 * were surfaced at all, silently dropping this bonus everywhere).
 */
export function computeSkillProficiencies(
  mods: RawDdbModifier[],
  armorStealthDisadvantage: boolean,
  abilities: AbilityScores
): SkillProficiency[] {
  const jackOfAllTrades = mods.some(
    (m) => m.type === "half-proficiency" && m.subType === "ability-checks" && m.isGranted
  );
  const skills: SkillProficiency[] = [];
  for (const name of Object.keys(SKILL_ABILITY) as SkillName[]) {
    const proficient = mods.some((m) => m.type === "proficiency" && m.subType === name);
    const expertise = mods.some((m) => m.type === "expertise" && m.subType === name);
    const halfProficiency =
      !proficient &&
      !expertise &&
      (jackOfAllTrades || mods.some((m) => m.type === "half-proficiency" && m.subType === name && m.isGranted));
    const abilityCheckSubType = ABILITY_CHECK_SUBTYPE[SKILL_ABILITY[name]];
    const advMod = mods.find(
      (m) => m.type === "advantage" && (m.subType === name || m.subType === abilityCheckSubType) && m.isGranted
    );
    const disadvMod = mods.find(
      (m) => m.type === "disadvantage" && (m.subType === name || m.subType === abilityCheckSubType) && m.isGranted
    );
    const fromArmor = name === "stealth" && armorStealthDisadvantage;
    // A flat number (`value`) or "add this other ability's modifier"
    // (`statId`, e.g. a feature that adds Wisdom on top of Nature's normal
    // Intelligence check) — confirmed on a real export granting the latter.
    const bonus = mods
      .filter((m) => m.type === "bonus" && m.subType === name && m.isGranted)
      .reduce((sum, m) => {
        if (typeof m.value === "number") return sum + m.value;
        const ability = m.statId ? ABILITY_BY_ID[m.statId] : undefined;
        return ability ? sum + abilityModifier(abilities[ability]) : sum;
      }, 0);
    if (!proficient && !expertise && !halfProficiency && !advMod && !disadvMod && !fromArmor && !bonus) continue;

    let advantage: "advantage" | "disadvantage" | undefined;
    let advantageNote: string | undefined;
    if (advMod || disadvMod) {
      advantage = advMod ? "advantage" : "disadvantage";
      advantageNote = (advMod ?? disadvMod)!.restriction?.trim() || undefined;
    } else if (fromArmor) {
      advantage = "disadvantage";
      advantageNote = "Wearing armor that imposes disadvantage on Stealth checks.";
    }

    skills.push({
      name,
      proficient,
      expertise,
      ...(halfProficiency ? { halfProficiency: true } : {}),
      ...(advantage ? { advantage, ...(advantageNote ? { advantageNote } : {}) } : {}),
      ...(bonus ? { bonus } : {}),
    });
  }
  return skills;
}

export function computePassiveSkill(abilityMod: number, profBonus: number, skill: string, mods: RawDdbModifier[]): number {
  // No `isGranted` filter on proficiency/expertise — same reasoning as
  // `computeSkillProficiencies` below: confirmed on real exports that a
  // skill's own proficiency modifier can be genuinely active with
  // `isGranted: false` (the flag is unreliable for flexible/choice-driven
  // grants), and this function used to disagree with that one about whether
  // the same skill counted as proficient, undercounting the passive score
  // for any skill made proficient that way.
  const proficient = mods.some((m) => m.type === "proficiency" && m.subType === skill);
  const expert = mods.some((m) => m.type === "expertise" && m.subType === skill);
  // Jack of All Trades / half-proficiency — same detection as
  // `computeSkillProficiencies` above: a blanket `subType: "ability-checks"`
  // grant (e.g. Bard's Jack of All Trades) or a skill-specific one, only
  // relevant when not already proficient/expert. Confirmed on a real Bard
  // export that omitting this undercounted passive Perception/Investigation/
  // Insight by exactly `Math.floor(profBonus / 2)`.
  const halfProficient =
    !proficient &&
    !expert &&
    mods.some(
      (m) => m.type === "half-proficiency" && (m.subType === "ability-checks" || m.subType === skill) && m.isGranted
    );
  const profContribution = expert ? profBonus * 2 : proficient ? profBonus : halfProficient ? Math.floor(profBonus / 2) : 0;
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === `passive-${skill}` && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  return 10 + abilityMod + profContribution + flatBonus;
}
