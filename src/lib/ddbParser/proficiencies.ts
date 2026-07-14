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
 * Both languages and tool proficiencies are exposed as a "choice pool" —
 * confirmed against real exports where an ungranted alternative (e.g. a
 * High Elf's unchosen extra language, or a background's unchosen tool
 * option) sits right next to the granted ones with the same `subType`
 * shape, differing only in `isGranted`. Unlike `computeSkillProficiencies`
 * (which has to ignore `isGranted` for a documented, separately-confirmed
 * reason), languages and tools both respect it at face value here.
 */
export function computeLanguages(mods: RawDdbModifier[]): string[] {
  const names = mods
    .filter((m) => m.type === "language" && m.isGranted)
    .map((m) => m.friendlySubtypeName || titleCase(m.subType ?? ""));
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export function computeToolProficiencies(mods: RawDdbModifier[]): string[] {
  const names = mods
    .filter((m) => m.type === "proficiency" && m.isGranted && TOOL_SUBTYPES.has(m.subType ?? ""))
    .map((m) => m.friendlySubtypeName || titleCase(m.subType ?? ""));
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}
