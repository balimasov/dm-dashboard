import { titleCase } from "./shared";
import { RawDdbModifier } from "./rawTypes";
import { SKILL_ABILITY } from "../types";

/**
 * Standard 5e tool proficiencies — artisan's tools, kits, navigation/
 * vehicle proficiencies, musical instruments, and gaming sets, matching
 * exactly what D&D Beyond's own character sheet groups under its "Tools"
 * heading (confirmed against a real sheet: Drum/Horn/Lute and Dice Set
 * both list there, not separately). Armor and weapon proficiencies share the
 * same `type: "proficiency"` modifier stream — see `computeArmorProficiencies`/
 * `computeWeaponProficiencies` below.
 */
const TOOL_SUBTYPES = new Set([
  "alchemists-supplies",
  "brewers-supplies",
  "calligraphers-supplies",
  "carpenters-tools",
  "cartographers-tools",
  "cobblers-tools",
  "cooks-utensils",
  "glassblowers-tools",
  "jewelers-tools",
  "leatherworkers-tools",
  "masons-tools",
  "painters-supplies",
  "potters-tools",
  "smiths-tools",
  "tinkers-tools",
  "weavers-tools",
  "woodcarvers-tools",
  "disguise-kit",
  "forgery-kit",
  "herbalism-kit",
  "poisoners-kit",
  "thieves-tools",
  "navigators-tools",
  "vehicles-land",
  "vehicles-water",
  "vehicles-air",
  // Musical instruments.
  "bagpipes",
  "birdpipes",
  "drum",
  "dulcimer",
  "flute",
  "glaur",
  "horn",
  "lute",
  "lyre",
  "pan-flute",
  "shawm",
  "viol",
  // Gaming sets.
  "dice-set",
  "dragonchess-set",
  "playing-card-set",
  "three-dragon-ante-set",
]);

/**
 * No `isGranted` filter — same reasoning as `computeSkillProficiencies`:
 * confirmed wrong on real exports. A prior version of this comment claimed
 * languages/tools were the exception that *does* respect `isGranted`, on
 * the theory that an unchosen alternative from a "choose N" pool would sit
 * right next to the granted ones with `isGranted: false`. Direct proof this
 * was never actually the case: cross-referencing every `isGranted: false`
 * language/tool modifier across every real fixture against the export's own
 * `choices` array (matching a modifier's `id` to a `2-<id>` resolved choice
 * entry) shows every single one *was* a resolved pick — e.g. a Half-Elf's
 * two "Select a Standard Language" choices (Elvish, Common Sign Language)
 * both come back `isGranted: false` despite both being genuinely chosen,
 * the same unreliable-flag behavior `computeSkillProficiencies` already
 * works around. There's no real "leftover unchosen option" case to protect
 * against by keeping the filter — it only ever produced false negatives.
 */
export function computeLanguages(mods: RawDdbModifier[]): string[] {
  const names = mods.filter((m) => m.type === "language").map((m) => m.friendlySubtypeName || titleCase(m.subType ?? ""));
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export function computeToolProficiencies(mods: RawDdbModifier[]): string[] {
  const names = mods
    .filter((m) => m.type === "proficiency" && TOOL_SUBTYPES.has(m.subType ?? ""))
    .map((m) => m.friendlySubtypeName || titleCase(m.subType ?? ""));
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

/** The 4 armor-category proficiencies 5e defines — a small, fixed, official set, unlike weapons below. */
const ARMOR_SUBTYPES = new Set(["light-armor", "medium-armor", "heavy-armor", "shields"]);

export function computeArmorProficiencies(mods: RawDdbModifier[]): string[] {
  const names = mods
    .filter((m) => m.type === "proficiency" && ARMOR_SUBTYPES.has(m.subType ?? ""))
    .map((m) => m.friendlySubtypeName || titleCase(m.subType ?? ""));
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

/**
 * Unlike tools/armor above, individual weapon proficiencies (Rapier, Hand
 * Crossbow, a setting-specific weapon that isn't in any fixed PHB list)
 * aren't a closed set worth enumerating one by one — so
 * weapon proficiency is determined by exclusion instead: any `type:
 * "proficiency"` modifier whose `subType` isn't a skill, a saving throw, a
 * tool, an armor category, or an unresolved "choose a..." placeholder is
 * either a broad category (Simple/Martial/Improvised Weapons) or a named
 * weapon, and both render the same way (a plain pill), so there's no need to
 * tell them apart here.
 */
function isNonWeaponProficiencySubtype(subType: string): boolean {
  return (
    subType in SKILL_ABILITY ||
    subType.endsWith("-saving-throws") ||
    TOOL_SUBTYPES.has(subType) ||
    ARMOR_SUBTYPES.has(subType) ||
    subType.startsWith("choose-")
  );
}

export function computeWeaponProficiencies(mods: RawDdbModifier[]): string[] {
  const names = mods
    .filter((m) => m.type === "proficiency" && m.subType && !isNonWeaponProficiencySubtype(m.subType))
    .map((m) => m.friendlySubtypeName || titleCase(m.subType ?? ""));
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}
