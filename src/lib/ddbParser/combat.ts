/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbilityScores, Sense } from "../types";
import { ABILITY_BY_ID, abilityModifier, titleCase } from "./shared";

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

const SENSE_SUBTYPES = ["darkvision", "blindsight", "tremorsense", "truesight"];

export function computeConditionsAndExhaustion(data: any): { conditions: string[]; exhaustion: number } {
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

/**
 * Additional senses (Darkvision, Blindsight, Tremorsense, Truesight) appear as
 * modifiers keyed by `subType`, split across two distinct `type`s that must
 * be combined differently:
 *  - `"set-base"` — a flat grant (race, feat...); when more than one source
 *    sets the same sense, the largest one wins (they're alternatives, not
 *    stacking).
 *  - `"sense"` — an *additive* bonus on top of an existing sense, e.g. the
 *    Goggles of Night ("if you already have darkvision, increases its range
 *    by 60 feet") or the Gloom Stalker's Umbral Sight. These stack with the
 *    base grant instead of replacing it — treating them as another
 *    max-candidate (as an earlier version of this code did) silently drops
 *    the bonus whenever it's less-or-equal to the base range, e.g. an Elf's
 *    innate 60 ft plus a 60 ft item bonus should read 120 ft, not 60 ft.
 */
export function computeSenses(mods: any[]): Sense[] {
  const senses: Sense[] = [];
  for (const subType of SENSE_SUBTYPES) {
    const base = mods
      .filter((m) => m.type === "set-base" && m.subType === subType && m.isGranted)
      .reduce((max, m) => Math.max(max, m.value ?? 0), 0);
    const bonus = mods
      .filter((m) => m.type === "sense" && m.subType === subType && m.isGranted)
      .reduce((sum, m) => sum + (m.value ?? 0), 0);
    const range = base + bonus;
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
 * Recomputed fresh on every sync — an explicit D&D Beyond HP override always
 * wins outright.
 */
export function computeHp(data: any, mods: any[], conMod: number, totalLevel: number) {
  const perLevelBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points-per-level" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0) * totalLevel, 0);
  const flatBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "hit-points" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);

  const computedMax =
    conMod * totalLevel + (data.baseHitPoints ?? 0) + (data.bonusHitPoints ?? 0) + perLevelBonus + flatBonus;
  const maxHp = data.overrideHitPoints ?? computedMax;
  const hp = Math.max(0, maxHp - (data.removedHitPoints ?? 0));
  return { hp, maxHp, tempHp: data.temporaryHitPoints ?? 0 };
}

export function computeClassSummary(data: any) {
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

/**
 * A Monk's Unarmored Movement (2024: +10 ft at level 2, scaling up to +30 ft
 * at 18, only while not wearing armor or wielding a shield) isn't exposed as
 * a `type: "bonus"` modifier at all — confirmed on a real level 8 Monk
 * export where `modifiers.*` had no "speed" entry whatsoever despite the
 * feature being active, undercounting speed by the full 15 ft it should
 * have added. The current value is already resolved for this character's
 * level on the class feature's own `levelScale.fixedValue`, the same
 * generic per-level-scaling field D&D Beyond attaches to any class feature
 * that scales this way (rather than hardcoding the level breakpoints here).
 */
function computeUnarmoredMovementBonus(data: any): number {
  const wearingArmorOrShield = (data.inventory ?? []).some(
    (i: any) => i.equipped && i.definition?.filterType === "Armor"
  );
  if (wearingArmorOrShield) return 0;
  for (const c of data.classes ?? []) {
    const feature = (c.classFeatures ?? []).find((f: any) => f.definition?.name === "Unarmored Movement");
    if (feature?.levelScale?.fixedValue) return feature.levelScale.fixedValue;
  }
  return 0;
}

/**
 * The race's base walking speed alone misses class/feat/item bonuses like a
 * Barbarian's Fast Movement (+10 ft while not wearing Heavy armor) —
 * confirmed on a real level-5 Barbarian export undercounting speed by
 * exactly that 10, since it only ever read `weightSpeeds`. These show up as
 * ordinary `type: "bonus", subType: "speed"` modifiers alongside AC/ability
 * bonuses; `isGranted` is D&D Beyond's own pre-computed signal for whether a
 * conditional bonus like this currently applies (e.g. the Heavy-armor
 * restriction), the same flag Unarmored Defense's bonus relies on below.
 */
export function computeSpeed(data: any, mods: any[]): number {
  const base = data.race?.weightSpeeds?.normal?.walk ?? 30;
  const bonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "speed" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? 0), 0);
  return base + bonus + computeUnarmoredMovementBonus(data);
}

/**
 * Barbarian's/Monk's Unarmored Defense (10 + Dex + another ability, only
 * while wearing no armor) is modeled by D&D Beyond as a `type: "set",
 * subType: "unarmored-armor-class"` modifier whose `statId` names the extra
 * ability (3 = Con for Barbarian, 5 = Wis for Monk) — confirmed on a real
 * Barbarian export, where omitting this was undercounting AC by exactly the
 * Con modifier. A shield can still be worn under Unarmored Defense, so
 * `shieldBonus` still applies on top.
 */
function computeUnarmoredAbilityBonus(mods: any[], abilities: AbilityScores): number {
  const seen = new Set<number>();
  let bonus = 0;
  for (const m of mods) {
    if (m.type !== "set" || m.subType !== "unarmored-armor-class" || !m.isGranted || !m.statId) continue;
    if (seen.has(m.statId)) continue;
    seen.add(m.statId);
    const key = ABILITY_BY_ID[m.statId];
    if (key) bonus += abilityModifier(abilities[key]);
  }
  return bonus;
}

/**
 * `characterValues` holds the misc-bonus text boxes a player can type a flat
 * number into directly on the D&D Beyond sheet (separate from computed
 * modifiers) — `typeId: 2` is the Armor Class box. Confirmed on a real
 * Sorcerer export: her AC of 14 (10 + 1 Dex, no armor) only resolves once
 * this +3 sheet value is added on top; every `modifiers` group was empty of
 * any armor-class entry, so this is D&D Beyond's only record of that bonus.
 */
function computeCustomAcBonus(data: any): number {
  return (data.characterValues ?? [])
    .filter((v: any) => v.typeId === 2 && typeof v.value === "number")
    .reduce((sum: number, v: any) => sum + v.value, 0);
}

export function computeArmorClass(data: any, abilities: AbilityScores, mods: any[]): number {
  const dexMod = abilityModifier(abilities.dex);
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
  const customBonus = computeCustomAcBonus(data);

  if (equippedArmor.length === 0) {
    const unarmoredBonus = computeUnarmoredAbilityBonus(mods, abilities);
    return 10 + dexMod + unarmoredBonus + shieldBonus + flatBonus + customBonus;
  }

  const armor = equippedArmor[0];
  const base = armor.definition?.armorClass ?? 10;
  // `definition.armorTypeId` (1 = Light, 2 = Medium, 3 = Heavy, 4 = Shield —
  // the same field already used above to separate shields) is the reliable
  // signal for the Dex cap. The human-readable `definition.type` string
  // ("Heavy Armor") isn't always populated — confirmed on a real Paladin
  // export where it was an empty string despite armorTypeId correctly being
  // 3, which silently let the full Dex mod through on Heavy Armor and
  // overcounted her AC by exactly that modifier.
  const armorTypeId = armor.definition?.armorTypeId;
  let dexContribution = dexMod;
  if (armorTypeId === 2) dexContribution = Math.min(dexMod, 2);
  else if (armorTypeId === 3) dexContribution = 0;

  return base + dexContribution + shieldBonus + flatBonus + customBonus;
}

/**
 * The Alert feat's 2024 "add your Proficiency Bonus to Initiative" grant is
 * modeled with `value: null` (there's no flat number to read) and instead
 * `bonusTypes: [1]` marking it as a proficiency-bonus-based bonus — confirmed
 * on a real export where reading only `value` silently treated this as +0.
 */
export function computeInitiative(dexMod: number, profBonus: number, mods: any[]): number {
  const bonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "initiative" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? (m.bonusTypes?.includes(1) ? profBonus : 0)), 0);
  return dexMod + bonus;
}
