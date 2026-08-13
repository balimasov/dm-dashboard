export interface ParsedAdvantageEntry {
  kind: "advantage" | "disadvantage";
  subject: string;
  restriction?: string;
}

/**
 * Parses one `Character.advantages` entry back into its parts —
 * `computeAdvantages` (`ddbParser/damage.ts`) builds each entry as
 * `` `${prefix}: ${subject}` `` or, when there's a restriction, ``
 * `${prefix}: ${subject} — ${restriction}` `` — so this is parsing our own
 * deterministic format, not guessing at free D&D Beyond prose. The same
 * `" — "` split already has a working precedent in
 * `AbilityScoreHintPanel.tsx`'s `findAbilityAdvantage`, which this doesn't
 * replace (it matches by ability name and reshapes `subject` for its own
 * narrower hint) but could build on top of this instead of re-parsing.
 *
 * `matched` is false for a line with no recognized "Advantage: "/
 * "Disadvantage: " prefix — the one case that can happen: a DM hand-typing
 * a line into the free-text edit form without following the convention.
 * `kind`/`subject` still get sane fallback values (kind defaults to
 * "advantage", subject is the whole line) so a caller that must render
 * *something* for every entry (the Advantages section) can use the result
 * as-is; a caller matching on a well-formed subject (`findAbilityAdvantage`)
 * should skip the entry when `matched` is false instead.
 */
export function parseAdvantageEntry(raw: string): ParsedAdvantageEntry & { matched: boolean } {
  const prefixMatch = raw.match(/^(Advantage|Disadvantage): (.+)$/);
  const kind: "advantage" | "disadvantage" = prefixMatch?.[1] === "Disadvantage" ? "disadvantage" : "advantage";
  const rest = prefixMatch ? prefixMatch[2] : raw;
  const dashIndex = rest.indexOf(" — ");
  const subject = dashIndex >= 0 ? rest.slice(0, dashIndex) : rest;
  const restriction = dashIndex >= 0 ? rest.slice(dashIndex + 3) : undefined;
  return { kind, subject, restriction, matched: Boolean(prefixMatch) };
}

/**
 * "Advantages" when every entry is an advantage (the common case, and the
 * section's long-standing name), "Disadvantages" when every entry is a
 * disadvantage, "Advantages & Disadvantages" when the list has both — a
 * heavy armor's Stealth disadvantage and a racial saving-throw advantage
 * can both land in the same `Character.advantages` array, and a section
 * header that always says "Advantages" would be wrong the moment a
 * disadvantage is the only (or an additional) entry in it.
 */
export function advantagesHeading(advantages: string[]): string {
  const kinds = new Set(advantages.map((a) => parseAdvantageEntry(a).kind));
  const hasAdvantage = kinds.has("advantage");
  const hasDisadvantage = kinds.has("disadvantage");
  if (hasAdvantage && hasDisadvantage) return "Advantages & Disadvantages";
  return hasDisadvantage ? "Disadvantages" : "Advantages";
}
