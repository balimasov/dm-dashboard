export type SummaryToken = { type: "text"; text: string } | { type: "ability"; sourceId: string; displayName: string };

/**
 * Matches either a well-formed `[[ability:<source_id>|<display_name>]]`
 * token (groups 1/2) or a stray shorthand the model sometimes emits instead
 * — e.g. `[[feature-0]]` right before the plain name, with no `ability:`
 * prefix and no `|<display_name>` half at all (observed in chat replies,
 * where the model seems to echo the sheet context's own `[source_id]`
 * markers verbatim instead of building the real token). The alternation's
 * second branch has no capture groups, so `parseSummaryTokens` tells them
 * apart by checking whether group 1 is defined.
 */
const TOKEN_RE = /\[\[ability:([^|\]]+)\|([^\]]+)\]\]|\[\[(?!ability:)[^\]]*\]\]\s*/g;

/**
 * Splits text on `[[ability:<source_id>|<display_name>]]` tokens (see the
 * assistant's `SYSTEM_PROMPT`) into an ordered list of plain-text and
 * ability-reference segments — used on `game_plan.summary`, and (since the
 * model doesn't always confine the token syntax to just that field) an
 * option's own `description`/`conditions` too, via `AiResponseText`'s
 * `renderTokenizedText`. Pure/no React so it's testable on its own;
 * `AiResponseText` turns each `"ability"` token into an `InfoTooltip` keyed
 * by `sourceId` and each `"text"` segment through the existing
 * universal-term (condition/ability-score) scan.
 *
 * A malformed shorthand token (see `TOKEN_RE`'s own comment) is matched but
 * dropped entirely rather than kept as a `"text"` segment — otherwise its
 * raw `[[...]]` bracket leaks to the user unparsed. The plain name that
 * (almost always) immediately follows it still gets its own hint, since
 * that name still goes through the ordinary sheet-term/universal-term scan
 * `AiResponseText` runs on every plain-text segment regardless.
 */
export function parseSummaryTokens(text: string): SummaryToken[] {
  const tokens: SummaryToken[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ type: "text", text: text.slice(lastIndex, index) });
    if (match[1] !== undefined) tokens.push({ type: "ability", sourceId: match[1], displayName: match[2] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) tokens.push({ type: "text", text: text.slice(lastIndex) });
  return tokens;
}
