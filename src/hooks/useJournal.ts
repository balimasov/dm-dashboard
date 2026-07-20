"use client";

import { useCallback, useState } from "react";
import { JournalEntry, JournalSessionSummary } from "@/lib/types";
import {
  createJournalEntryApi,
  deleteJournalEntryApi,
  listJournalEntriesApi,
  listJournalSessionsApi,
  patchJournalEntryApi,
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
      if (list.length > 0) {
        setSelectedSessionId((prev) => prev ?? list[0].id);
        if (!selectedSessionId) void loadEntries(list[0].id);
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
    async (text: string, sessionId: string) => {
      const entry = await createJournalEntryApi({ campaignId, sessionId, text });
      setEntries((prev) => (prev ? [...prev, entry] : [entry]));
      setSessions((prev) => prev?.map((s) => (s.id === sessionId ? { ...s, entryCount: s.entryCount + 1 } : s)) ?? prev);
    },
    [campaignId]
  );

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
  };
}
