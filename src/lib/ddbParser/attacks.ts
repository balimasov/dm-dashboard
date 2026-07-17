import { AbilityScores, Attack, WEAPON_MASTERY_PROPERTIES } from "../types";
import { formatModifier } from "../format";
import { ABILITY_BY_ID, abilityModifier, titleCase } from "./shared";
import { RawDdbAny, RawDdbData, RawDdbModifier } from "./rawTypes";

/** "150" + "600" -> "150/600 ft."; "150" + null/same -> "150 ft." */
function formatRange(range: number, longRange: number | null | undefined): string {
  return `${range}${longRange && longRange !== range ? `/${longRange}` : ""} ft.`;
}

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
 * A weapon's `properties` always lists its one canonical 2024 mastery
 * property regardless of whether this character can actually use it —
 * Weapon Mastery is its own class feature (Barbarian/Fighter/Paladin/
 * Ranger/Rogue), and only a character with it unlocks a limited number of
 * specific weapons for mastery use. D&D Beyond records exactly which
 * weapon+mastery combos are unlocked as a paired `data.actions.*`/
 * `data.options.*` entry named either "Mastery (WeaponType)" or
 * "WeaponType (Mastery)" (confirmed on a real Fighter export: "Nick
 * (Scimitar)" action + "Scimitar (Nick)" option) — a character with no
 * Weapon Mastery feature at all (e.g. a Bard) has neither, for any weapon.
 * Checking either list is enough; both are scanned since which one a given
 * class's mastery grant uses isn't guaranteed identical across classes.
 */
function hasMasteryAccess(weaponType: string, mastery: string, data: RawDdbData): boolean {
  const wanted = new Set([`${mastery} (${weaponType})`, `${weaponType} (${mastery})`]);
  for (const group of ["race", "class", "feat"] as const) {
    if ((data.actions?.[group] ?? []).some((a: RawDdbAny) => wanted.has(a.name))) return true;
    if ((data.options?.[group] ?? []).some((o: RawDdbAny) => wanted.has(o.definition?.name))) return true;
  }
  return false;
}

/**
 * Every creature can make an Unarmed Strike — the 2024 PHB baseline is
 * always-proficient, melee, "1 + Strength modifier" Bludgeoning damage
 * (never below 0), no dice roll involved at all. That baseline needs no
 * D&D Beyond data to compute, so it's always shown.
 *
 * A character can have a *better* unarmed strike from a feat (Tavern
 * Brawler) — D&D Beyond resolves that as its own `actions.*` entry whose
 * `name` contains "Unarmed Strike" and which (unlike the bare "Unarmed
 * Strike" class-feature entry every Monk also carries, whose `dice` is
 * `null` since the actual dice size lives only on the class feature's
 * level-scale table) carries a fully resolved `dice`/`abilityModifierStatId`/
 * `isProficient` — confirmed on a real Monk-with-Tavern-Brawler export
 * ("Enhanced Unarmed Strike": `dice: "1d4"`, `abilityModifierStatId: 1`,
 * `attackTypeRange: 1`, `isProficient: true`). That resolved entry replaces
 * the baseline outright, since a DM wants the character's *best* unarmed
 * option, not the RAW default listed alongside its own upgrade.
 *
 * What this still can't compute: a Monk's Martial Arts die size, which
 * scales by class level and isn't exposed anywhere in `actions.*` — a Monk
 * without a feat like Tavern Brawler shows the plain 2024 baseline here,
 * undercounting their real (better) unarmed damage. Disclosed rather than
 * guessed at.
 */
function computeUnarmedStrike(data: RawDdbData, abilities: AbilityScores, profBonus: number): Attack {
  for (const group of ["feat", "class", "race"] as const) {
    for (const action of (data.actions?.[group] ?? []) as RawDdbAny[]) {
      if (!action.name?.includes("Unarmed Strike") || !action.dice?.diceString || action.attackTypeRange == null) continue;
      const abilityKey = ABILITY_BY_ID[action.abilityModifierStatId as number] ?? "str";
      const abilityMod = abilityModifier(abilities[abilityKey]);
      const proficient = action.isProficient !== false;
      return {
        id: "attack-unarmed",
        name: "Unarmed Strike",
        attackType: "melee",
        attackBonus: abilityMod + (proficient ? profBonus : 0),
        damage: `${action.dice.diceString}${abilityMod !== 0 ? ` ${formatModifier(abilityMod)}` : ""}`,
        damageType: "Bludgeoning",
        properties: [],
        range: "5 ft.",
        proficient,
      };
    }
  }

  const strMod = abilityModifier(abilities.str);
  return {
    id: "attack-unarmed",
    name: "Unarmed Strike",
    attackType: "melee",
    attackBonus: strMod + profBonus,
    damage: String(Math.max(0, 1 + strMod)),
    damageType: "Bludgeoning",
    properties: [],
    range: "5 ft.",
    proficient: true,
  };
}

/**
 * Weapon attacks (plus the baseline Unarmed Strike, see
 * `computeUnarmedStrike`) — everything a character can hit with that isn't
 * a spell, i.e. D&D Beyond's own Actions-tab weapon cards. Weapons are
 * scoped to *equipped* ones: an unequipped rapier sitting in the pack isn't
 * something the character can swing right now, matching D&D Beyond's own
 * Actions tab (no card for gear that's merely carried). Two equipped
 * copies of the exact same weapon (e.g. dual daggers) collapse to one
 * entry — their computed stats are identical, so showing both adds
 * duplicate rows with no new information.
 *
 * Global attack-roll modifiers a Fighting Style could grant (e.g.
 * Archery's +2 to ranged attacks) aren't folded in — none of the real
 * fixtures this was built against exercise that case, and guessing at the
 * modifier shape without one to confirm against isn't worth the risk of a
 * silently wrong attack bonus.
 */
export function computeAttacks(data: RawDdbData, abilities: AbilityScores, profBonus: number, mods: RawDdbModifier[]): Attack[] {
  const profSubtypes = new Set(mods.filter((m) => m.type === "proficiency").map((m) => m.subType));
  const seen = new Set<string>();
  const attacks: Attack[] = [computeUnarmedStrike(data, abilities, profBonus)];

  for (const item of (data.inventory ?? []) as RawDdbAny[]) {
    const df = item.definition ?? {};
    if (!item.equipped || df.filterType !== "Weapon" || !df.damage?.diceString) continue;
    if (seen.has(df.name)) continue;
    seen.add(df.name);

    const isRanged = df.attackType === 2;
    const propertyNames: string[] = (df.properties ?? []).map((p: RawDdbAny) => p.name).filter(Boolean);
    const masteryCandidate = propertyNames.find((p) => WEAPON_MASTERY_PROPERTIES.includes(p));
    const mastery =
      masteryCandidate && hasMasteryAccess(df.type || df.name, masteryCandidate, data) ? masteryCandidate : undefined;
    const properties = propertyNames.filter((p) => p !== masteryCandidate);
    const isFinesse = propertyNames.includes("Finesse");
    const isThrown = propertyNames.includes("Thrown");

    const abilityMod = isRanged
      ? abilityModifier(abilities.dex)
      : isFinesse
        ? Math.max(abilityModifier(abilities.str), abilityModifier(abilities.dex))
        : abilityModifier(abilities.str);

    const grantedMods = (df.grantedModifiers ?? []) as RawDdbAny[];
    const magicBonus = grantedMods
      .filter((gm) => gm.type === "bonus" && gm.subType === "magic")
      .reduce((sum, gm) => sum + (gm.value ?? gm.fixedValue ?? 0), 0);
    // Bonus damage a rune/coating/etc. grants beyond the weapon's own dice
    // (e.g. a poisoned blade) — D&D Beyond's own "Notes" column shows this
    // as "+2d10 Poison" alongside the property list, confirmed on a real
    // export (`type: "damage"`, `dice.diceString`, `friendlySubtypeName`).
    const extraDamageMods = grantedMods.filter((gm) => gm.type === "damage" && gm.dice?.diceString);
    const extraDamage =
      extraDamageMods.length > 0
        ? extraDamageMods
            .map((gm) => `+${gm.dice.diceString} ${gm.friendlySubtypeName || titleCase(gm.subType ?? "")}`)
            .join(", ")
        : undefined;

    const proficient = isProficientWithWeapon(df.type || df.name, df.categoryId, profSubtypes);
    const attackBonus = abilityMod + (proficient ? profBonus : 0) + magicBonus;
    const damageBonus = abilityMod + magicBonus;

    // Every melee weapon's range is its reach (10 ft. only with the Reach
    // property, 5 ft. otherwise) — D&D Beyond's own Range column shows this
    // for every attack, not just ranged/thrown ones, so it's computed the
    // same way here rather than left blank for a plain melee swing.
    const range =
      isRanged || isThrown
        ? df.range
          ? formatRange(df.range, df.longRange)
          : undefined
        : propertyNames.includes("Reach")
          ? "10 ft."
          : "5 ft.";

    attacks.push({
      id: `attack-${attacks.length}`,
      name: df.name,
      attackType: isRanged ? "ranged" : "melee",
      attackBonus,
      damage: `${df.damage.diceString}${damageBonus !== 0 ? ` ${formatModifier(damageBonus)}` : ""}`,
      ...(df.damageType ? { damageType: df.damageType } : {}),
      properties,
      ...(mastery ? { mastery } : {}),
      ...(df.categoryId === 1 ? { category: "Simple" } : df.categoryId === 2 ? { category: "Martial" } : {}),
      ...(extraDamage ? { extraDamage } : {}),
      ...(range ? { range } : {}),
      proficient,
    });
  }

  return attacks;
}
