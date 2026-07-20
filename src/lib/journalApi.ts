import { JournalEntry, JournalSessionSummary } from "./types";
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
 * `sessionId` omitted → the server auto-resolves "today's" session (Quick
 * Note's path). Always sends this browser's own live-computed IANA zone —
 * see `journalEntryCreateSchema`'s doc comment in `schemas.ts` for why that
 * beats relying on the (separately synced, occasionally stale) timezone
 * cookie alone: two devices hitting this within the same real day should
 * always land in the same session, not split across two depending on
 * which one's cookie happened to be current.
 */
export async function createJournalEntryApi(input: { campaignId: string; sessionId?: string; text: string }): Promise<JournalEntry> {
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
