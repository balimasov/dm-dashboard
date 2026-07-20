"use client";

import { useEffect, useState } from "react";
import { useJournal } from "@/hooks/useJournal";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { JournalEntryRow } from "./JournalEntryRow";
import { NotesEditor } from "./NotesEditor";
import { TabBar } from "./ui/TabBar";

type JournalTab = "dm";

function Composer({ onSubmit }: { onSubmit: (html: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const isEmpty = draft.replace(/<[^>]+>/g, "").trim().length === 0;

  async function handleAdd() {
    if (isEmpty || saving) return;
    setSaving(true);
    try {
      await onSubmit(draft);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <NotesEditor value={draft} onChange={setDraft} placeholder="Write a journal entry..." />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={isEmpty || saving}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Add entry
        </button>
      </div>
    </div>
  );
}

/**
 * Large two-pane modal — same shell conventions as `CampaignFormModal`
 * (`useScrollLock`, `useEscapeToClose`, backdrop click-outside-closes,
 * `max-h-[90vh]`) but wider (`max-w-4xl`) for the session list + entry pane
 * layout, which no existing modal in this app needed before. The `TabBar`
 * here only ever has one "DM" tab in this iteration — it renders nothing
 * (see `TabBar`'s own single-tab behavior) until a "Party" tab exists
 * alongside it, at which point this same layout just starts showing a
 * switcher with no restructuring.
 */
export function CampaignJournalModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  useScrollLock();
  useEscapeToClose(onClose);
  const [tab] = useState<JournalTab>("dm");
  const journal = useJournal(campaignId);
  const { sessions, sessionsError, loadSessions, selectedSessionId, selectSession, entries, entriesError, createEntry, updateEntry, removeEntry } =
    journal;

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount, same as every other "fetch when this modal opens" pattern in this app
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-800 bg-slate-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-50">Campaign Journal</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="scrollbar-themed w-64 shrink-0 overflow-y-auto border-r border-slate-800 pr-3">
            {sessions === null && sessionsError === null && <p className="text-sm text-slate-500">Loading sessions...</p>}
            {sessionsError && (
              <div className="text-sm text-red-400">
                <p className="mb-2">{sessionsError}</p>
                <button type="button" onClick={() => void loadSessions()} className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800">
                  Retry
                </button>
              </div>
            )}
            {sessions?.length === 0 && <p className="text-sm text-slate-500">No sessions yet — write a note to start one.</p>}
            {sessions && sessions.length > 0 && (
              <ul className="space-y-1">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => selectSession(session.id)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                        selectedSessionId === session.id ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {session.title}
                      <span className="ml-1 text-xs text-slate-500">({session.entryCount})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <TabBar tabs={[{ key: "dm", icon: "🔒", text: "DM" }]} current={tab} onChange={() => {}} className="mb-3" />

            {selectedSessionId && <Composer onSubmit={(html) => createEntry(html, selectedSessionId)} />}

            <div className="scrollbar-themed flex-1 space-y-2 overflow-y-auto">
              {!selectedSessionId && <p className="text-sm text-slate-500">Select a session to see its entries.</p>}
              {selectedSessionId && entries === null && entriesError === null && (
                <p className="text-sm text-slate-500">Loading entries...</p>
              )}
              {entriesError && (
                <div className="text-sm text-red-400">
                  <p className="mb-2">{entriesError}</p>
                  <button
                    type="button"
                    onClick={() => selectSession(selectedSessionId!)}
                    className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
                  >
                    Retry
                  </button>
                </div>
              )}
              {entries?.length === 0 && <p className="text-sm text-slate-500">No entries in this session yet.</p>}
              {entries?.map((entry) => (
                <JournalEntryRow key={entry.id} entry={entry} onUpdate={updateEntry} onRemove={removeEntry} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
