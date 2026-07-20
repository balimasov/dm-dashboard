import { JournalEntry, JournalEntryAudience, JournalSession, JournalSessionSummary } from "./types";
import { apiFetch, parseJsonOrThrow } from "./apiClient";

/**
 * `parseJsonOrThrow` (`apiClient.ts`) collapses every non-ok response into a
 * plain `Error`, discarding the status code — fine for every other route,
 * but a 409 here carries the entry as it now stands server-side, and the
 * caller (`JournalEntryRow`) needs that to offer "Reload" without a second
 * request. Kept local to this file rather than widening `apiClient.ts`'s
 * shared helper for a shape only Journal conflicts produce.
 */
export class JournalConflictError extends Error {
  current: JournalEntry;
  constructor(current: JournalEntry) {
    super("This entry was changed by someone else.");
    this.name = "JournalConflictError";
    this.current = current;
  }
}

export async function listJournalSessionsApi(campaignId: string): Promise<JournalSessionSummary[]> {
  const res = await apiFetch(`/api/journal/sessions?campaignId=${encodeURIComponent(campaignId)}`);
  return parseJsonOrThrow<JournalSessionSummary[]>(res, "Failed to load journal sessions.");
}

export async function listJournalEntriesApi(sessionId: string): Promise<JournalEntry[]> {
  const res = await apiFetch(`/api/journal/entries?sessionId=${encodeURIComponent(sessionId)}`);
  return parseJsonOrThrow<JournalEntry[]>(res, "Failed to load journal entries.");
}

/**
 * `sessionId` omitted → the server auto-resolves the campaign's current
 * session (Quick Note's path) — in practice, whichever session was most
 * recently created for it, regardless of which device or timezone is
 * asking. Still sends this browser's own live-computed IANA zone; the
 * server only uses it to title a session the very first time one is
 * created for a campaign (see `journalEntryCreateSchema`'s doc comment in
 * `schemas.ts`), never to decide which existing session to reuse.
 */
export async function createJournalEntryApi(input: {
  campaignId: string;
  sessionId?: string;
  text: string;
  audience?: JournalEntryAudience;
}): Promise<JournalEntry> {
  const res = await apiFetch("/api/journal/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });
  return parseJsonOrThrow<JournalEntry>(res, "Failed to save journal entry.");
}

/**
 * `expectedUpdatedAt` omitted → unconditional save (Quick Note's editor
 * never passes one). Given (the full `JournalEntryRow` editor's path) → the
 * server rejects with 409 if the entry moved on since the caller last saw
 * it; that's handled here, before `parseJsonOrThrow`, since a 409 body
 * shape (`{ error, entry }`) differs from every other error response.
 */
export async function patchJournalEntryApi(id: string, text: string, expectedUpdatedAt?: string): Promise<JournalEntry> {
  const res = await apiFetch(`/api/journal/entries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, expectedUpdatedAt }),
  });
  if (res.status === 409) {
    const data = (await res.json().catch(() => null)) as { entry?: JournalEntry } | null;
    if (data?.entry) throw new JournalConflictError(data.entry);
  }
  return parseJsonOrThrow<JournalEntry>(res, "Failed to save journal entry.");
}

export async function deleteJournalEntryApi(id: string): Promise<void> {
  const res = await apiFetch(`/api/journal/entries/${id}`, { method: "DELETE" });
  await parseJsonOrThrow<{ ok: true }>(res, "Failed to delete journal entry.");
}

/** DM-only manual "start a new session" — server enforces the role check regardless of who calls this. */
export async function startNewSessionApi(campaignId: string, timeZone: string): Promise<JournalSession> {
  const res = await apiFetch("/api/journal/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId, timeZone }),
  });
  return parseJsonOrThrow<JournalSession>(res, "Failed to start a new session.");
}

/** DM-only rename/archive/unarchive — server enforces the role check regardless of who calls this. */
export async function updateSessionApi(id: string, updates: { title?: string; archived?: boolean }): Promise<JournalSession> {
  const res = await apiFetch(`/api/journal/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return parseJsonOrThrow<JournalSession>(res, "Failed to update the session.");
}

/** DM-only cascade delete — server enforces the role check regardless of who calls this. */
export async function deleteSessionApi(id: string): Promise<void> {
  const res = await apiFetch(`/api/journal/sessions/${id}`, { method: "DELETE" });
  await parseJsonOrThrow<{ ok: true }>(res, "Failed to delete the session.");
}
