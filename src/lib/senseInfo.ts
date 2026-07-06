/**
 * Short DM-facing reminders of what each sense actually lets a creature
 * perceive, per the 2024 rules. Intentionally condensed — an in-session
 * memory jog, not verbatim rules text.
 */
export const SENSE_INFO: Record<string, string> = {
  darkvision:
    "Sees in dim light within range as if it were bright light, and in darkness as if it were dim light — only shades of gray, no color, in the dark.",
  blindsight:
    "Perceives the area within range without relying on sight — sees exactly as well as with normal vision, including through blindness, darkness, invisibility, and illusions, unless the source specifically says otherwise.",
  tremorsense:
    "Detects and pinpoints anything within range that's in contact with the same surface (usually the ground) via vibrations — can't perceive anything not touching that surface, e.g. a flying creature.",
  truesight:
    "Sees in normal and magical darkness, sees invisible creatures and objects, automatically spots visual illusions and succeeds on saves against them, and perceives the original form of a shapechanged or transmuted creature.",
};

export function getSenseInfo(name: string): string | undefined {
  return SENSE_INFO[name.trim().toLowerCase()];
}
