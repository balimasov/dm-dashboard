export type SummaryToken = { type: "text"; text: string } | { type: "ability"; sourceId: string; displayName: string };

/**
 * Matches either a real ability token (groups 1/2) or a bare bracket with no
 * display name at all, e.g. `[[feature-0]]` (dropped — see below).
 *
 * The first branch's `(?:ability:)?` prefix is *optional* — the model has
 * been observed dropping just the literal word "ability:" while still
 * writing the rest of the token correctly (`[[spell-7|Fireball]]` instead of
 * `[[ability:spell-7|Fireball]]`). That still carries a real display name
 * and must be kept, not stripped — an earlier version of this regex
 * required the `ability:` prefix even for the "does this have a name at
 * all" check, so a token like that fell through to the second branch (any
 * `[[...]]`) and lost its display name entirely, which is worse than the
 * original raw-bracket bug it was meant to fix. Requiring only `id|name`
 * shape (with or without the "ability:" label) for the first branch, and
 * reserving the second branch for brackets with no `|` at all, keeps every
 * token that actually names something.
 */
const TOKEN_RE = /\[\[(?:ability:)?([^|\]]+)\|([^\]]+)\]\]|\[\[[^\]]*\]\]\s*/g;

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
