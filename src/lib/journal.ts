/**
 * Pure helpers for the Campaign Journal feature — no DB/server dependency
 * (unlike `db.ts`), so these are trivially unit-testable in isolation.
 */

/**
 * "YYYY-MM-DD" in the given IANA zone — the DM's local calendar day, not
 * the server's/UTC's. A game session can easily run past midnight
 * server-time (or past midnight UTC while it's still evening locally);
 * bucketing by the wrong day would silently split one real session into
 * two "date sessions". `en-CA`'s locale date format is the one built-in
 * `Intl` option that already comes out in exactly this "YYYY-MM-DD" order.
 */
export function dateKeyForTimeZone(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** e.g. "July 20, 2026" — the auto-created session's only title until a rename UI exists. Parsed as UTC midnight (matching `dateKey`'s own "no time-of-day" meaning) so formatting never shifts the date a day off in a different display timezone. */
export function formatSessionTitle(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * Quick Note's plain-textarea input → the same HTML-paragraph shape
 * `NotesEditor`/`JournalEntry.text` already use everywhere else. Splits on
 * "\n" (each Shift+Enter-inserted line becomes its own `<p>`), HTML-escapes
 * reserved characters, and drops blank lines — so an entry created via
 * Quick Note is byte-for-byte the same kind of HTML a Tiptap edit would
 * have produced, and can be opened and continued in the full editor with
 * no format conversion.
 */
export function plainTextToParagraphHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
}
