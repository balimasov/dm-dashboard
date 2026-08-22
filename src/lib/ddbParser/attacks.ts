import { AbilityScores, Attack, WEAPON_MASTERY_PROPERTIES } from "../types";
import { formatModifier } from "../format";
import {
  ABILITY_BY_ID,
  abilityModifier,
  isUnarmoredAndShieldless,
  rarityFromDdb,
  shortDescription,
  titleCase,
} from "./shared";
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

/** D&D Beyond's `filterType` for a rod, staff, or wand — none of these carry their own `damage` field, but the 2024 PHB lets any of them be wielded as an Improvised Weapon with a Quarterstaff's statistics, and D&D Beyond's own client computes exactly that (confirmed on a real export: Ferol's Staff of Acid, no `damage` of its own, shown with Quarterstaff's 1d6 Bludgeoning/Versatile/Topple/Simple stats). Nothing in the raw JSON names this rule — it's a fixed PHB rule, not per-character data — so it's hardcoded here rather than read off a field that doesn't exist. */
const ROD_STAFF_WAND_TYPES = new Set(["Rod", "Staff", "Wand"]);

/** The stat block a rod/staff/wand borrows when swung as a melee weapon — see `ROD_STAFF_WAND_TYPES`. Spread over the item's own `definition` (keeping its real name/rarity/description/grantedModifiers) so a magic rod/staff/wand's melee attack still shows the item's own flavor and any magic bonus, just with Quarterstaff's combat stats standing in for the missing weapon fields. */
const QUARTERSTAFF_STATS = {
  damage: { diceString: "1d6" },
  damageType: "Bludgeoning",
  properties: [{ name: "Versatile" }, { name: "Topple" }],
  attackType: 1,
  categoryId: 1,
  type: "Quarterstaff",
  range: 5,
  longRange: 5,
};

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
 * A Monk's Martial Arts die (2024: 1d6 at level 1, scaling up to 1d12 at
 * level 17+, only while unarmed or wielding Monk weapons and not wearing
 * armor or wielding a Shield) is exposed the same way Unarmored Movement's
 * per-level value is (see `computeUnarmoredMovementBonus` in `combat.ts`):
 * already resolved for this character's level on the class feature's own
 * `levelScale`, just under `.dice` instead of `.fixedValue`. Confirmed on a
 * real level-20 Monk export (`levelScale.dice.diceString === "1d12"`) — not
 * exposed anywhere under `actions.*`, so neither `computeUnarmedStrike`'s
 * resolved-action branch nor a Monk weapon's own `damage.diceString` ever
 * reflects it on their own; both fold this in separately below.
 */
function martialArtsDie(data: RawDdbData): string | undefined {
  for (const c of data.classes ?? []) {
    const feature = (c.classFeatures ?? []).find((f: RawDdbAny) => f.definition?.name === "Martial Arts");
    const diceString = feature?.levelScale?.dice?.diceString;
    if (diceString) return diceString;
  }
  return undefined;
}

/** "1d12" -> 6.5, "2d6" -> 7 — lets a Monk's weapon/unarmed damage compare its own die against the Martial Arts die and keep whichever rolls higher on average, matching the RAW wording ("in place of the normal damage") rather than always preferring one over the other. */
function diceStringAverage(diceString: string): number {
  const match = /^(\d+)d(\d+)$/.exec(diceString);
  if (!match) return 0;
  return (Number(match[1]) * (Number(match[2]) + 1)) / 2;
}

/**
 * 2024 Martial Arts weapon eligibility, confirmed on the feature's own
 * description text in a real Monk export: Simple Melee weapons, or Martial
 * Melee weapons that have the Light property. Unarmed strikes are always
 * eligible and handled separately in `computeUnarmedStrike`.
 */
function isMonkWeapon(weapon: RawDdbAny, propertyNames: string[]): boolean {
  if (weapon.attackType !== 1) return false;
  if (weapon.categoryId === 1) return true;
  return weapon.categoryId === 2 && propertyNames.includes("Light");
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
 * `attackTypeRange: 1`, `isProficient: true`). That resolved entry's own
 * numbers are just this feat's RAW baseline though, not the character's
 * actual best unarmed strike — a Monk's Martial Arts (Dexterous Attacks +
 * the scaling Martial Arts die, see `martialArtsDie`) still applies on top
 * whenever it's active, confirmed against a real level-20 Monk export where
 * D&D Beyond's own displayed Unarmed Strike (+12, 1d12+6) matched the
 * Martial-Arts-boosted result, not this feat action's raw 1d4/STR alone.
 *
 * The resolved entry keeps its own real name (e.g. "Enhanced Unarmed
 * Strike") rather than being relabeled "Unarmed Strike" — D&D Beyond's own
 * Actions tab lists it as a second, separate row alongside the plain
 * "Unarmed Strike" (confirmed on a real level-20 Warlock/Tavern Brawler
 * export: DDB shows both "Unarmed Strike" at the flat 1+Str baseline *and*
 * "Enhanced Unarmed Strike" at 1d4+Str side by side). Silently showing the
 * better numbers under the plain name was misleading — it read as if the
 * character's *baseline* Unarmed Strike had that damage.
 *
 * The Unarmed Fighting feat (2024 PHB) is a third, different case: its
 * `type: "set", subType: "unarmed-damage-die"` modifier (e.g. `1d6`)
 * unconditionally replaces the flat "1 + Str" baseline die on this same
 * "Unarmed Strike" row — confirmed on a real level-20 Fighter export whose
 * D&D Beyond Actions tab shows "Unarmed Strike" at `1d6 +3`, not the flat
 * baseline, despite having weapons equipped. This is still the *same* row
 * (unlike Tavern Brawler's resolved action above), just with a better die —
 * the feat's *other*, better-still `1d8` die (usable only with a hand free)
 * is D&D Beyond's own separate resolved action, added as its own row by
 * `computeUnarmedFightingAttack` below rather than folded in here.
 */
function computeUnarmedStrike(data: RawDdbData, abilities: AbilityScores, profBonus: number, mods: RawDdbModifier[]): Attack {
  const monkDie = martialArtsDie(data);
  const martialArtsActive = monkDie !== undefined && isUnarmoredAndShieldless(data);

  for (const group of ["feat", "class", "race"] as const) {
    for (const action of (data.actions?.[group] ?? []) as RawDdbAny[]) {
      if (!action.name?.includes("Unarmed Strike") || !action.dice?.diceString || action.attackTypeRange == null) continue;
      const abilityKey = ABILITY_BY_ID[action.abilityModifierStatId as number] ?? "str";
      const baseAbilityMod = abilityModifier(abilities[abilityKey]);
      const abilityMod = martialArtsActive ? Math.max(baseAbilityMod, abilityModifier(abilities.dex)) : baseAbilityMod;
      const proficient = action.isProficient !== false;
      const dieString =
        martialArtsActive && monkDie && diceStringAverage(monkDie) > diceStringAverage(action.dice.diceString)
          ? monkDie
          : action.dice.diceString;
      return {
        id: "attack-unarmed",
        name: action.name,
        attackType: "melee",
        attackBonus: abilityMod + (proficient ? profBonus : 0),
        damage: `${dieString}${abilityMod !== 0 ? ` ${formatModifier(abilityMod)}` : ""}`,
        damageType: "Bludgeoning",
        properties: [],
        range: "5 ft.",
        proficient,
      };
    }
  }

  const strMod = abilityModifier(abilities.str);
  if (martialArtsActive && monkDie) {
    const abilityMod = Math.max(strMod, abilityModifier(abilities.dex));
    return {
      id: "attack-unarmed",
      name: "Unarmed Strike",
      attackType: "melee",
      attackBonus: abilityMod + profBonus,
      damage: `${monkDie}${abilityMod !== 0 ? ` ${formatModifier(abilityMod)}` : ""}`,
      damageType: "Bludgeoning",
      properties: [],
      range: "5 ft.",
      proficient: true,
    };
  }

  const featDie = (mods.find((m) => m.type === "set" && m.subType === "unarmed-damage-die") as RawDdbAny)?.dice
    ?.diceString;
  if (featDie) {
    return {
      id: "attack-unarmed",
      name: "Unarmed Strike",
      attackType: "melee",
      attackBonus: strMod + profBonus,
      damage: `${featDie}${strMod !== 0 ? ` ${formatModifier(strMod)}` : ""}`,
      damageType: "Bludgeoning",
      properties: [],
      range: "5 ft.",
      proficient: true,
    };
  }

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
 * The Unarmed Fighting feat's *other* benefit — a better `1d8` unarmed-
 * strike die usable only "if you aren't holding any weapons or a Shield" —
 * D&D Beyond exposes this as its own separate resolved action ("Unarmed
 * Fighting (no weapons/shield)") rather than folding it into the "Unarmed
 * Strike" row `computeUnarmedStrike` already upgrades to `1d6` above, so it
 * shows as a second, separate row alongside it, the same "second, separate
 * row" treatment `computeUnarmedStrike`'s own Tavern Brawler case documents
 * for a different feat's resolved unarmed-strike action. D&D Beyond's own
 * resolved action is static per-feat data — confirmed present in a real
 * export's raw JSON with that exact name/dice regardless of whether the
 * character currently has a weapon or Shield equipped — so it's shown as-is
 * rather than re-derived from the character's current gear.
 * `attackTypeRange != null` excludes this feat's *other* resolved action
 * ("Unarmed Fighting (grapple)", a start-of-turn damage tick with no attack
 * roll of its own, not a second attack option).
 */
function computeUnarmedFightingAttack(data: RawDdbData, abilities: AbilityScores, profBonus: number): Attack | undefined {
  const action = (["feat", "class", "race"] as const)
    .flatMap((g) => (data.actions?.[g] ?? []) as RawDdbAny[])
    .find((a) => /unarmed fighting/i.test(a.name ?? "") && a.dice?.diceString && a.attackTypeRange != null);
  if (!action) return undefined;

  const abilityKey = ABILITY_BY_ID[action.abilityModifierStatId as number] ?? "str";
  const abilityMod = abilityModifier(abilities[abilityKey]);
  const proficient = action.isProficient !== false;
  return {
    id: "attack-unarmed-fighting",
    name: action.name,
    attackType: "melee",
    attackBonus: abilityMod + (proficient ? profBonus : 0),
    damage: `${action.dice.diceString}${abilityMod !== 0 ? ` ${formatModifier(abilityMod)}` : ""}`,
    damageType: "Bludgeoning",
    properties: [],
    range: "5 ft.",
    proficient,
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
 * Global attack-roll/damage modifiers a Fighting Style grants are folded in
 * below (Dueling, Thrown Weapon Fighting, Archery) — see each one's own
 * comment for the confirmed real subType behind it.
 */
export function computeAttacks(data: RawDdbData, abilities: AbilityScores, profBonus: number, mods: RawDdbModifier[]): Attack[] {
  const profSubtypes = new Set(mods.filter((m) => m.type === "proficiency").map((m) => m.subType));
  const seen = new Set<string>();
  const attacks: Attack[] = [computeUnarmedStrike(data, abilities, profBonus, mods)];
  const unarmedFightingAttack = computeUnarmedFightingAttack(data, abilities, profBonus);
  if (unarmedFightingAttack) attacks.push(unarmedFightingAttack);
  const monkDie = martialArtsDie(data);
  const martialArtsActive = monkDie !== undefined && isUnarmoredAndShieldless(data);
  // The Thrown Weapon Fighting style ("when you hit with a ranged attack
  // roll using a weapon that has the Thrown property, you gain a +2 bonus
  // to the damage roll") is modeled as a flat `type: "damage", subType:
  // "thrown-weapon-attacks"` modifier — confirmed on a real level-20
  // Paladin export whose Javelin (Thrown) undercounted damage by exactly
  // this +2 while every non-Thrown weapon's damage already matched. This
  // app shows one row per weapon rather than separate melee/thrown attack
  // modes, so it's applied whenever the weapon has Thrown, matching D&D
  // Beyond's own single-row display for the same weapon.
  const thrownWeaponDamageBonus = mods
    .filter((m) => m.type === "damage" && m.subType === "thrown-weapon-attacks" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? m.fixedValue ?? 0), 0);
  // Dueling ("while holding a Melee weapon in one hand and no other
  // weapons, +2 to damage rolls with that weapon") is modeled as `type:
  // "damage", subType: "one-handed-melee-attacks"` — confirmed on a real
  // level-20 Fighter (Eldritch Knight) export. There's no per-hand/stance
  // tracking in this data (which weapon is "currently" held one-handed vs.
  // just sitting equipped), so — same simplification `thrownWeaponDamageBonus`
  // above already applies — it's granted to any equipped melee weapon that
  // isn't Two-Handed, matching this file's one-row-per-weapon, static-
  // eligibility approach rather than trying to track real-time stance.
  const duelingDamageBonus = mods
    .filter((m) => m.type === "damage" && m.subType === "one-handed-melee-attacks" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? m.fixedValue ?? 0), 0);
  // Archery ("+2 bonus to attack rolls you make with Ranged weapons") is
  // modeled as `type: "bonus", subType: "ranged-weapon-attacks"` (matching
  // this file's `damage`/`bonus` naming split elsewhere: a damage-roll
  // grant vs. an attack-roll grant of the same shape). Gated on the
  // weapon's own Ranged category (`attackType === 2`), not just "isThrown"
  // — a thrown Melee weapon used at range doesn't qualify for Archery RAW,
  // only an actual Ranged weapon (bow/crossbow/sling) does.
  const archeryAttackBonus = mods
    .filter((m) => m.type === "bonus" && m.subType === "ranged-weapon-attacks" && m.isGranted)
    .reduce((sum, m) => sum + (m.value ?? m.fixedValue ?? 0), 0);

  for (const item of (data.inventory ?? []) as RawDdbAny[]) {
    const df = item.definition ?? {};
    const isRealWeapon = df.filterType === "Weapon" && Boolean(df.damage?.diceString);
    const isImprovisedRodStaffWand = !isRealWeapon && ROD_STAFF_WAND_TYPES.has(df.filterType);
    if (!item.equipped || (!isRealWeapon && !isImprovisedRodStaffWand)) continue;
    if (seen.has(df.name)) continue;
    seen.add(df.name);

    // For a rod/staff/wand, every stat field below comes from
    // `QUARTERSTAFF_STATS` instead of the item's own `definition` (which has
    // none) — everything else (name, rarity, description, grantedModifiers)
    // still comes from the real item, so a magic staff's melee attack still
    // shows its own flavor text and rarity, just with borrowed combat stats.
    const weapon = isRealWeapon ? df : { ...df, ...QUARTERSTAFF_STATS };

    const isRanged = weapon.attackType === 2;
    const propertyNames: string[] = (weapon.properties ?? []).map((p: RawDdbAny) => p.name).filter(Boolean);
    const masteryCandidate = propertyNames.find((p) => WEAPON_MASTERY_PROPERTIES.includes(p));
    const mastery =
      masteryCandidate && hasMasteryAccess(weapon.type || weapon.name, masteryCandidate, data) ? masteryCandidate : undefined;
    const properties = propertyNames.filter((p) => p !== masteryCandidate);
    const isFinesse = propertyNames.includes("Finesse");
    const isThrown = propertyNames.includes("Thrown");
    const isEligibleForDueling = !isRanged && !propertyNames.includes("Two-Handed");
    // Dexterous Attacks: a Monk's Martial Arts lets Dex stand in for Str on
    // an eligible weapon exactly like Finesse does — folded into the same
    // ternary rather than a separate branch, since both grants resolve the
    // same way (better of the two ability modifiers).
    const isMonkEligible = !isRanged && martialArtsActive && isMonkWeapon(weapon, propertyNames);

    const abilityMod = isRanged
      ? abilityModifier(abilities.dex)
      : isFinesse || isMonkEligible
        ? Math.max(abilityModifier(abilities.str), abilityModifier(abilities.dex))
        : abilityModifier(abilities.str);

    const grantedMods = (weapon.grantedModifiers ?? []) as RawDdbAny[];
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

    const proficient = isProficientWithWeapon(weapon.type || weapon.name, weapon.categoryId, profSubtypes);
    const attackBonus = abilityMod + (proficient ? profBonus : 0) + magicBonus + (isRanged ? archeryAttackBonus : 0);
    const damageBonus =
      abilityMod +
      magicBonus +
      (isThrown ? thrownWeaponDamageBonus : 0) +
      (isEligibleForDueling ? duelingDamageBonus : 0);
    // The RAW wording ("in place of the normal damage") lets the die roll
    // the Martial Arts die *or* the weapon's own — whichever is bigger —
    // rather than unconditionally overriding it, matching the same
    // average-roll comparison `computeUnarmedStrike` applies.
    const damageDie =
      isMonkEligible && monkDie && diceStringAverage(monkDie) > diceStringAverage(weapon.damage.diceString)
        ? monkDie
        : weapon.damage.diceString;

    // Every melee weapon's range is its reach (10 ft. only with the Reach
    // property, 5 ft. otherwise) — D&D Beyond's own Range column shows this
    // for every attack, not just ranged/thrown ones, so it's computed the
    // same way here rather than left blank for a plain melee swing.
    const range =
      isRanged || isThrown
        ? weapon.range
          ? formatRange(weapon.range, weapon.longRange)
          : undefined
        : propertyNames.includes("Reach")
          ? "10 ft."
          : "5 ft.";

    // Every weapon has *some* description text on D&D Beyond, even a mundane
    // one (a generic "how proficiency/mastery works" blurb, confirmed on a
    // plain Scimitar) — same source `computeInventory` reads for the
    // matching inventory entry, computed the same way here regardless of
    // rarity. It's `attack.rarity`, not description-presence, that gates
    // whether the hint actually surfaces this text (see `AttackHintPanel`).
    const description = shortDescription(weapon.snippet, weapon.description);

    attacks.push({
      id: `attack-${attacks.length}`,
      name: weapon.name,
      attackType: isRanged ? "ranged" : "melee",
      attackBonus,
      damage: `${damageDie}${damageBonus !== 0 ? ` ${formatModifier(damageBonus)}` : ""}`,
      ...(weapon.damageType ? { damageType: weapon.damageType } : {}),
      properties,
      ...(mastery ? { mastery } : {}),
      ...(weapon.categoryId === 1 ? { category: "Simple" } : weapon.categoryId === 2 ? { category: "Martial" } : {}),
      ...(extraDamage ? { extraDamage } : {}),
      ...(range ? { range } : {}),
      proficient,
      ...(weapon.type ? { weaponType: weapon.type } : {}),
      rarity: rarityFromDdb(weapon.rarity),
      ...(description ? { description } : {}),
    });
  }

  return attacks;
}
