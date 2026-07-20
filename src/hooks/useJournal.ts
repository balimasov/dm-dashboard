"use client";

import { useCallback, useState } from "react";
import { JournalEntry, JournalEntryAudience, JournalSessionSummary } from "@/lib/types";
import {
  createJournalEntryApi,
  deleteJournalEntryApi,
  listJournalEntriesApi,
  listJournalSessionsApi,
  patchJournalEntryApi,
  startNewSessionApi,
  updateSessionApi,
} from "@/lib/journalApi";

/**
 * Owned by `CampaignJournalModal` only — Quick Note doesn't need to know
 * about sessions at all (the server auto-resolves "today's" session for
 * it), so it calls `createJournalEntryApi` directly instead of going
 * through this hook. Journal data isn't preloaded server-side the way
 * characters/creatures are (it's only fetched once the modal is actually
 * opened), so callers trigger `loadSessions`/`selectSession` themselves.
 */
export function useJournal(campaignId: string) {
  const [sessions, setSessions] = useState<JournalSessionSummary[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const loadEntries = useCallback(async (sessionId: string) => {
    setEntries(null);
    setEntriesError(null);
    try {
      setEntries(await listJournalEntriesApi(sessionId));
    } catch (err) {
      setEntriesError(err instanceof Error ? err.message : "Failed to load journal entries.");
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsError(null);
    try {
      const list = await listJournalSessionsApi(campaignId);
      setSessions(list);
      // Newest-first, but the newest one isn't necessarily open — a DM sees
      // archived sessions in this list too (a player never does, so this is
      // a no-op filter for them), and auto-selecting an archived session
      // left the modal looking like it opened nothing at all.
      const defaultSession = list.find((s) => !s.archived);
      if (defaultSession) {
        setSelectedSessionId((prev) => prev ?? defaultSession.id);
        if (!selectedSessionId) void loadEntries(defaultSession.id);
      }
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load journal sessions.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-created when campaignId changes; selectedSessionId is read for a one-time "auto-select first session" check, not something a change to it should re-trigger this callback for.
  }, [campaignId, loadEntries]);

  const selectSession = useCallback(
    (id: string) => {
      setSelectedSessionId(id);
      void loadEntries(id);
    },
    [loadEntries]
  );

  const createEntry = useCallback(
    async (text: string, sessionId: string, audience: JournalEntryAudience) => {
      const entry = await createJournalEntryApi({ campaignId, sessionId, text, audience });
      setEntries((prev) => (prev ? [...prev, entry] : [entry]));
      setSessions((prev) => prev?.map((s) => (s.id === sessionId ? { ...s, entryCount: s.entryCount + 1 } : s)) ?? prev);
    },
    [campaignId]
  );

  /** DM-only in practice (the server rejects a non-DM caller) — inserts the new session at the top and switches to it, same as picking a session from the list. */
  const startNewSession = useCallback(async () => {
    const session = await startNewSessionApi(campaignId, Intl.DateTimeFormat().resolvedOptions().timeZone);
    setSessions((prev) => [{ ...session, entryCount: 0 }, ...(prev ?? [])]);
    setSelectedSessionId(session.id);
    void loadEntries(session.id);
  }, [campaignId, loadEntries]);

  /** DM-only in practice (the server rejects a non-DM caller). */
  const renameSession = useCallback(async (id: string, title: string) => {
    const updated = await updateSessionApi(id, { title });
    setSessions((prev) => prev?.map((s) => (s.id === id ? { ...s, title: updated.title } : s)) ?? prev);
  }, []);

  /** DM-only in practice (the server rejects a non-DM caller). */
  const toggleSessionArchived = useCallback(async (id: string, archived: boolean) => {
    const updated = await updateSessionApi(id, { archived });
    setSessions((prev) => prev?.map((s) => (s.id === id ? { ...s, archived: updated.archived } : s)) ?? prev);
  }, []);

  const updateEntry = useCallback(async (id: string, text: string) => {
    const updated = await patchJournalEntryApi(id, text);
    setEntries((prev) => prev?.map((e) => (e.id === id ? updated : e)) ?? prev);
  }, []);

  const removeEntry = useCallback(
    async (id: string) => {
      await deleteJournalEntryApi(id);
      setEntries((prev) => prev?.filter((e) => e.id !== id) ?? prev);
      setSessions(
        (prev) =>
          prev?.map((s) => (s.id === selectedSessionId ? { ...s, entryCount: Math.max(0, s.entryCount - 1) } : s)) ?? prev
      );
    },
    [selectedSessionId]
  );

  return {
    sessions,
    sessionsError,
    loadSessions,
    selectedSessionId,
    selectSession,
    entries,
    entriesError,
    createEntry,
    updateEntry,
    removeEntry,
    startNewSession,
    renameSession,
    toggleSessionArchived,
  };
}
