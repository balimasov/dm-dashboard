/** Parses/validates a D&D Beyond character-sheet URL — split out of `types.ts` as its own concern (URL parsing, not a type or a formula). */
export function extractDndBeyondCharacterId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.endsWith("dndbeyond.com")) return null;
    const match = parsed.pathname.match(/\/characters\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
