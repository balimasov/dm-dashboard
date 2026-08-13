import { titleCase } from "./shared";
import { RawDdbModifier } from "./rawTypes";

/**
 * Standard 5e tool proficiencies — artisan's tools, kits, navigation/
 * vehicle proficiencies, musical instruments, and gaming sets, matching
 * exactly what D&D Beyond's own character sheet groups under its "Tools"
 * heading (confirmed against a real sheet: Drum/Horn/Lute and Dice Set
 * both list there, not separately). Weapon and armor proficiencies share
 * the same `type: "proficiency"` modifier stream but are excluded — those
 * already show elsewhere (attacks, AC) rather than needing their own list
 * here.
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
  "drum",
  "dulcimer",
  "flute",
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
