export type SummaryToken = { type: "text"; text: string } | { type: "ability"; sourceId: string; displayName: string };

const ABILITY_TOKEN_RE = /\[\[ability:([^|\]]+)\|([^\]]+)\]\]/g;

/**
 * Splits `game_plan.summary` on `[[ability:<source_id>|<display_name>]]`
 * tokens (see the assistant's `SYSTEM_PROMPT`) into an ordered list of
 * plain-text and ability-reference segments. Pure/no React so it's testable
 * on its own; `AiResponseText` turns each `"ability"` token into an
 * `InfoTooltip` keyed by `sourceId` and each `"text"` segment through the
 * existing universal-term (condition/ability-score) scan.
 */
export function parseSummaryTokens(text: string): SummaryToken[] {
  const tokens: SummaryToken[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(ABILITY_TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ type: "text", text: text.slice(lastIndex, index) });
    tokens.push({ type: "ability", sourceId: match[1], displayName: match[2] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) tokens.push({ type: "text", text: text.slice(lastIndex) });
  return tokens;
}
