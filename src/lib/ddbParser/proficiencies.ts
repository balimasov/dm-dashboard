import { titleCase } from "./shared";
import { RawDdbModifier } from "./rawTypes";

/**
 * Standard 5e tool proficiencies — artisan's tools, kits, and navigation/
 * vehicle proficiencies. Deliberately excludes musical instruments and
 * gaming sets: those share the same `type: "proficiency"` modifier stream
 * (alongside weapon and armor proficiencies, which are excluded too) but
 * don't come up as mid-session DM utility the way a lockpicking or
 * herbalism proficiency does.
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
