import type { UserRole } from "../auth";

/** Which "tab" of the journal an entry belongs to — "dm" is the DM's private journal (never visible to a player), "party" is the shared journal both roles can read and write. Kept on the entry (not a second table) so one `journal_entries` table supports both audiences without a schema change. */
export type JournalEntryAudience = "dm" | "party";

/**
 * A logical bucket of journal entries. Auto-resolution (see
 * `resolveOrCreateSessionForDate` in `db.ts`) is one session per calendar
 * day: it reuses the non-archived session whose `dateKey` matches "today",
 * only creating a new one when none matches (including when today's own
 * session exists but is archived) — a DM can also start a new one manually
 * at any time (`createJournalSession`), rename it, or archive/unarchive it
 * (`updateJournalSession`), all DM-only actions.
 */
export interface JournalSession {
  id: string;
  campaignId: string;
  /**
   * ISO calendar date (YYYY-MM-DD) — both the auto-resolution lookup key
   * (see `resolveOrCreateSessionForDate` in `db.ts`) and the seed for
   * `title` on creation. Computed differently depending on how the session
   * was created: auto-resolution (`entries/route.ts`) always uses a single
   * canonical UTC "today", not the caller's own local timezone, so devices
   * in different real time zones (or with a misconfigured system clock)
   * still land in the same session; a DM's manual "+ New session"
   * (`sessions/route.ts`) uses the caller's own local day instead, since
   * that path always creates a fresh row regardless of matching and the
   * date is purely cosmetic (the title) there.
   */
  dateKey: string;
  /** Display title. Seeded from `dateKey` on creation (see `formatSessionTitle` in `src/lib/journal.ts`); DM-editable afterward via `updateJournalSession`. */
  title: string;
  /** When this session row was created — the sort key for "newest first" (two same-day sessions would share `dateKey` but never `startedAt`). */
  startedAt: string;
  /** Still unused — reserved for a later iteration (pairs naturally with conflict detection: "this session ended, are you sure?"). Nothing reads it yet. */
  endedAt?: string;
  /** DM-only toggle (`updateJournalSession`) — hides the session from the default list without deleting it (same convention as `Character.hidden`/`Creature.hidden`), and makes it and its entries invisible to a player entirely (not just restricted). */
  archived?: boolean;
}

/** `JournalSession` plus its entry count, for the journal modal's session list — same "summary adds one derived field" shape `Campaign`/`CampaignSummary` already uses for `characterCount`. */
export interface JournalSessionSummary extends JournalSession {
  entryCount: number;
}

/**
 * One journal note. `text` is an HTML string — same convention as
 * `Campaign.notes`, and deliberately the same shape `NotesEditor` (Tiptap)
 * already reads/writes, so an entry created via the plain-textarea Quick
 * Note and one created/edited via the full Journal modal's rich editor are
 * indistinguishable in storage — either can be opened and continued in the
 * other (see `plainTextToParagraphHtml` in `src/lib/journal.ts`).
 */
export interface JournalEntry {
  id: string;
  campaignId: string;
  sessionId: string;
  text: string;
  /** Which tab this entry belongs to — "dm" for the DM's private journal, "party" for the shared journal both roles can read/write. Set once at creation from the author's own role/chosen tab, never client-editable afterward (see `journalEntryUpdateSchema`). */
  audience: JournalEntryAudience;
  /** Who wrote it. There's no per-player identity (see `UserRole`'s own doc comment in `auth.ts`), so a party entry just says "Player", not which one. Set once at creation, never changed by an edit. */
  authorRole: UserRole;
  createdAt: string;
  /** Bumped on every edit — set server-side in `updateJournalEntryText`, never trusted from the client. */
  updatedAt: string;
  /** Who made the most recent edit — written on every save (`updateJournalEntryText` in `db.ts`), display-only (`JournalEntryRow` shows it next to the timestamp). Conflict detection itself compares `updatedAt`, not this field — see `updateJournalEntryText`'s own doc comment. */
  updatedByRole?: UserRole;
}
