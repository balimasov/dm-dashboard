export type SummaryToken = { type: "text"; text: string } | { type: "ability"; sourceId: string; displayName: string };

/**
 * Matches either a real ability token (groups 1/2) or a bare bracket with no
 * `|<display_name>` half at all, e.g. `[[feature-0]]` or `[[Religion]]`
 * (group 3 — see `parseSummaryTokens`'s own comment for how the two are
 * told apart).
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
const TOKEN_RE = /\[\[(?:ability:)?([^|\]]+)\|([^\]]+)\]\]|\[\[([^\]]*)\]\](\s*)/g;

/**
 * A bare bracket's inner text (group 3 of `TOKEN_RE`) is one of three
 * things:
 *
 * - a stray `source_id` the model echoed without ever building the full
 *   token (e.g. `feature-0`, `spell_fireball`) — nothing worth keeping,
 *   drop the whole bracket;
 * - an invented "namespace:Name" pseudo-tag for something that was never a
 *   real sheet item at all (e.g. `skill:Religion`, `sense:Darkvision`) —
 *   the model aping the real `ability:id|name` syntax for a term that has
 *   no source_id to give it, one colon short of a well-formed token. The
 *   fix isn't to drop the whole thing (that already tried once — see the
 *   `Religion` regression below); it's to strip the invented label and
 *   keep the name;
 * - an ordinary display name/phrase it over-eagerly bracketed with no id
 *   at all (e.g. `Religion`, `Fireball`) — keep as plain text.
 *
 * Only the first kind is safe to drop outright — a real id has no other
 * copy of itself anywhere in the text, but a plain display name usually
 * doesn't either (unlike the `[[feature-0]] Blinded` shape, where the real
 * word sits *outside* the bracket and survives regardless). Dropping a
 * bare `[[Religion]]` the same way silently deletes the only occurrence of
 * that word from the reply — this is the bug that first lost "Religion"
 * from an otherwise-complete answer; naively keeping the raw
 * `skill:Religion` text verbatim afterward was the very next regression
 * (a real technical-looking label leaking into an otherwise clean
 * sentence). `ability:` itself is excluded from the generic namespace
 * strip — a bare `[[ability:spell-7]]` (missing its `|name` half) is a
 * broken real token, not an invented category tag, and has nothing to
 * salvage either.
 *
 * Source ids in this app are always lowercase and either hyphen- or
 * underscore-joined with a trailing word/number (`feature-0`,
 * `spell_fireball`, `trait-2`); an ordinary capitalized word or a phrase
 * with spaces never matches that shape.
 */
function looksLikeSourceId(inner: string): boolean {
  return /^[a-z][a-z0-9]*[-_][a-z0-9]+$/.test(inner.trim());
}

/** Returns the text to keep for a bare bracket, or `null` if it should be dropped entirely — see `looksLikeSourceId`'s own comment for the three cases this tells apart. */
function bareBracketText(inner: string): string | null {
  const namespaced = inner.trim().match(/^([a-z]+):(.+)$/);
  if (namespaced) return namespaced[1] === "ability" ? null : namespaced[2].trim();
  return looksLikeSourceId(inner) ? null : inner;
}

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
 * A bare bracket (see `TOKEN_RE`'s own comment) is handled by
 * `bareBracketText`: an id-shaped one is dropped entirely (the raw
 * `[[...]]` bracket would otherwise leak to the user unparsed, and any real
 * word it was meant to label typically sits right outside it anyway); a
 * namespaced or display-name-shaped one is kept as an ordinary `"text"`
 * segment instead — unwrapped (and un-namespaced), not deleted — so it
 * still gets picked up by the plain-text sheet-term/universal-term scan
 * `AiResponseText` runs on every text segment, same as if the model had
 * never bracketed it at all.
 */
export function parseSummaryTokens(text: string): SummaryToken[] {
  const tokens: SummaryToken[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ type: "text", text: text.slice(lastIndex, index) });
    if (match[1] !== undefined) {
      tokens.push({ type: "ability", sourceId: match[1], displayName: match[2] });
    } else if (match[3] !== undefined) {
      const kept = bareBracketText(match[3]);
      // `match[4]` (the whitespace `\s*` also consumed) has to come along —
      // otherwise the kept word glues directly onto whatever follows it.
      if (kept !== null) tokens.push({ type: "text", text: kept + match[4] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) tokens.push({ type: "text", text: text.slice(lastIndex) });
  return tokens;
}
