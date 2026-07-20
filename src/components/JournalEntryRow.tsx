"use client";

import { useState } from "react";
import { JournalConflictError } from "@/lib/journalApi";
import { JournalEntry } from "@/lib/types";
import { NotesEditor } from "./NotesEditor";
import { SyncTimestamp } from "./SyncTimestamp";

/**
 * View mode reuses `NotesEditor`'s own `.notes-editor-content` class so a
 * rendered entry looks exactly like what the editor itself would produce
 * (same heading/list/link styling) — the only styling difference between
 * "editing this entry" and "looking at it" is whether the toolbar/textbox
 * chrome is present at all. Edit mode is save-on-blur, same pattern
 * `CampaignNotes` already uses for `Campaign.notes`.
 */
export function JournalEntryRow({
  entry,
  canManage,
  onUpdate,
  onRemove,
}: {
  entry: JournalEntry;
  /** Whether the current viewer is allowed to Edit/Delete this specific entry — the caller computes it (`role === "dm" || entry.authorRole === "player"`), since there's no per-player identity to check ownership more precisely than "some player wrote it". */
  canManage: boolean;
  onUpdate: (id: string, text: string, expectedUpdatedAt?: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  // Snapshotted the moment editing starts — the compare-and-swap token sent
  // with the save, so the server can tell whether someone else saved this
  // same entry in the meantime.
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(entry.updatedAt);
  const [conflict, setConflict] = useState<JournalEntry | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // `NotesEditor` deliberately never re-syncs its Tiptap document to a
  // changed `value` prop after mount (see its own doc comment) — bumping
  // this key forces a clean remount whenever the draft needs to jump to a
  // value the already-mounted editor didn't type itself (entering edit mode
  // fresh already gets a new mount via `editing`'s own false→true toggle,
  // but "Reload" below replaces `draft` while the editor stays mounted).
  const [editorKey, setEditorKey] = useState(0);

  function startEditing() {
    setDraft(entry.text);
    setExpectedUpdatedAt(entry.updatedAt);
    setConflict(null);
    setSaveError(null);
    setEditing(true);
  }

  async function saveAndExit() {
    if (draft === entry.text) {
      setEditing(false);
      return;
    }
    setSaveError(null);
    try {
      await onUpdate(entry.id, draft, expectedUpdatedAt);
      setEditing(false);
    } catch (err) {
      if (err instanceof JournalConflictError) {
        setConflict(err.current);
      } else {
        setSaveError(err instanceof Error ? err.message : "Failed to save.");
      }
      // Stays in editing mode either way — the draft would otherwise be
      // silently lost, which is exactly the unhandled-rejection gap this
      // banner exists to close.
    }
  }

  function reloadFromServer() {
    if (!conflict) return;
    setDraft(conflict.text);
    setExpectedUpdatedAt(conflict.updatedAt);
    setConflict(null);
    setEditorKey((k) => k + 1);
  }

  async function overwriteAnyway() {
    if (!conflict) return;
    setSaveError(null);
    try {
      // The conflict response already carries the entry's current
      // `updatedAt` — reusing it as this retry's own CAS token means the
      // overwrite succeeds against whatever's there now, deliberately
      // accepting the race instead of looping through another conflict.
      await onUpdate(entry.id, draft, conflict.updatedAt);
      setConflict(null);
      setEditing(false);
    } catch (err) {
      if (err instanceof JournalConflictError) {
        setConflict(err.current);
      } else {
        setSaveError(err instanceof Error ? err.message : "Failed to save.");
      }
    }
  }

  function handleRemove() {
    if (window.confirm("Delete this journal entry? This can't be undone.")) {
      void onRemove(entry.id);
    }
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      {editing ? (
        <NotesEditor
          key={editorKey}
          value={draft}
          onChange={setDraft}
          onBlur={() => {
            void saveAndExit();
          }}
        />
      ) : (
        <div className="notes-editor-content text-sm text-slate-100" dangerouslySetInnerHTML={{ __html: entry.text }} />
      )}
      {conflict && (
        <div className="mt-2 rounded-lg border border-amber-700/60 bg-amber-950/40 p-2 text-xs text-amber-200">
          <p className="mb-1.5">This entry was changed by someone else while you were editing.</p>
          <div className="flex gap-3">
            <button type="button" onClick={reloadFromServer} className="font-semibold hover:text-amber-100">
              Reload
            </button>
            <button type="button" onClick={() => void overwriteAnyway()} className="font-semibold hover:text-amber-100">
              Overwrite anyway
            </button>
          </div>
        </div>
      )}
      {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          {entry.authorRole === "dm" ? "DM" : "Player"} ·{" "}
          {entry.updatedAt !== entry.createdAt ? (
            <>
              <SyncTimestamp iso={entry.updatedAt} /> <span className="italic">(edited)</span>
            </>
          ) : (
            <SyncTimestamp iso={entry.createdAt} />
          )}
        </span>
        {canManage && !editing && (
          <span className="flex gap-2">
            <button type="button" onClick={startEditing} className="hover:text-slate-300">
              Edit
            </button>
            <button type="button" onClick={handleRemove} className="hover:text-red-400">
              Delete
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
