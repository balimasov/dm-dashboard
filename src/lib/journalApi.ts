import { JournalEntry, JournalEntryAudience, JournalSession, JournalSessionSummary } from "./types";
import { apiFetch, parseJsonOrThrow } from "./apiClient";

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

export async function patchJournalEntryApi(id: string, text: string): Promise<JournalEntry> {
  const res = await apiFetch(`/api/journal/entries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
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
