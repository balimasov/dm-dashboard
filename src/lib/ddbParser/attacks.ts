import { AbilityScores, Attack, WEAPON_MASTERY_PROPERTIES } from "../types";
import { formatModifier } from "../format";
import { abilityModifier } from "./shared";
import { RawDdbAny, RawDdbData, RawDdbModifier } from "./rawTypes";

/** "Crossbow, Hand" -> "crossbow-hand" — matches D&D Beyond's own kebab-casing of a weapon's `type` field when it names a specific-weapon proficiency subType (confirmed on real exports, see `isProficientWithWeapon`). */
function normalizeWeaponType(type: string): string {
  return type
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * D&D Beyond's own weapon-category convention (confirmed on every weapon
 * across every real fixture): `categoryId` 1 = Simple, 2 = Martial —
 * independent of melee/ranged (`attackType` 1/2 handles that split), so the
 * character's blanket "simple-weapons"/"martial-weapons" class proficiency
 * covers a Dagger and a Shortbow (both categoryId 1) the same way. A
 * specific-weapon proficiency (a Monk's "shortswords", a Fighting
 * Initiate's "rapier"...) shows up as its own `type: "proficiency"`
 * modifier whose `subType` is just the weapon's own `type` field
 * kebab-cased — checked directly rather than guessed from a category.
 * No `isGranted` filter, same reasoning as `computeLanguages`/
 * `computeToolProficiencies`: already confirmed unreliable for
 * choice-driven grants elsewhere in this data.
 */
function isProficientWithWeapon(weaponType: string, categoryId: number | undefined, profSubtypes: Set<string | undefined>): boolean {
  if (profSubtypes.has(normalizeWeaponType(weaponType))) return true;
  if (categoryId === 1 && profSubtypes.has("simple-weapons")) return true;
  if (categoryId === 2 && profSubtypes.has("martial-weapons")) return true;
  return false;
}

/**
 * Weapon attacks only — everything a character can hit with that isn't a
 * spell, i.e. D&D Beyond's own Actions-tab weapon cards. Scoped to
 * *equipped* weapons: an unequipped rapier sitting in the pack isn't
 * something the character can swing right now, matching D&D Beyond's own
 * Actions tab (no card for gear that's merely carried). Two equipped
 * copies of the exact same weapon (e.g. dual daggers) collapse to one
 * entry — their computed stats are identical, so showing both adds
 * duplicate rows with no new information.
 *
 * Natural weapons/Unarmed Strike are deliberately not covered: D&D Beyond
 * doesn't expose a reliable damage-dice source for them (a Monk's Martial
 * Arts die lives on a classFeature's level-scale table, not on any
 * `actions.*` entry), so guessing would risk a confidently wrong number.
 * Likewise, global attack-roll modifiers a Fighting Style could grant (e.g.
 * Archery's +2 to ranged attacks) aren't folded in — none of the real
 * fixtures this was built against exercise that case, and guessing at the
 * modifier shape without one to confirm against isn't worth the risk of a
 * silently wrong attack bonus.
 */
export function computeAttacks(data: RawDdbData, abilities: AbilityScores, profBonus: number, mods: RawDdbModifier[]): Attack[] {
  const profSubtypes = new Set(mods.filter((m) => m.type === "proficiency").map((m) => m.subType));
  const seen = new Set<string>();
  const attacks: Attack[] = [];

  for (const item of (data.inventory ?? []) as RawDdbAny[]) {
    const df = item.definition ?? {};
    if (!item.equipped || df.filterType !== "Weapon" || !df.damage?.diceString) continue;
    if (seen.has(df.name)) continue;
    seen.add(df.name);

    const isRanged = df.attackType === 2;
    const propertyNames: string[] = (df.properties ?? []).map((p: RawDdbAny) => p.name).filter(Boolean);
    const mastery = propertyNames.find((p) => WEAPON_MASTERY_PROPERTIES.includes(p));
    const properties = propertyNames.filter((p) => p !== mastery);
    const isFinesse = propertyNames.includes("Finesse");
    const isThrown = propertyNames.includes("Thrown");

    const abilityMod = isRanged
      ? abilityModifier(abilities.dex)
      : isFinesse
        ? Math.max(abilityModifier(abilities.str), abilityModifier(abilities.dex))
        : abilityModifier(abilities.str);

    const magicBonus = ((df.grantedModifiers ?? []) as RawDdbAny[])
      .filter((gm) => gm.type === "bonus" && gm.subType === "magic")
      .reduce((sum, gm) => sum + (gm.value ?? gm.fixedValue ?? 0), 0);

    const proficient = isProficientWithWeapon(df.type || df.name, df.categoryId, profSubtypes);
    const attackBonus = abilityMod + (proficient ? profBonus : 0) + magicBonus;
    const damageBonus = abilityMod + magicBonus;

    attacks.push({
      id: `attack-${attacks.length}`,
      name: df.name,
      attackType: isRanged ? "ranged" : "melee",
      attackBonus,
      damage: `${df.damage.diceString}${damageBonus !== 0 ? ` ${formatModifier(damageBonus)}` : ""}`,
      ...(df.damageType ? { damageType: df.damageType } : {}),
      properties,
      ...(mastery ? { mastery } : {}),
      ...((isRanged || isThrown) && df.range
        ? { range: `${df.range}${df.longRange && df.longRange !== df.range ? `/${df.longRange}` : ""} ft.` }
        : {}),
      proficient,
    });
  }

  return attacks;
}
