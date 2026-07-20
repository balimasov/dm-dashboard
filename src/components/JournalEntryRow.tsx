"use client";

import { useState } from "react";
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
  onUpdate: (id: string, text: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);

  async function saveAndExit() {
    setEditing(false);
    if (draft === entry.text) return;
    await onUpdate(entry.id, draft);
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
          value={draft}
          onChange={setDraft}
          onBlur={() => {
            void saveAndExit();
          }}
        />
      ) : (
        <div className="notes-editor-content text-sm text-slate-100" dangerouslySetInnerHTML={{ __html: entry.text }} />
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          {entry.authorRole === "dm" ? "DM" : "Player"} · <SyncTimestamp iso={entry.createdAt} />
          {entry.updatedAt !== entry.createdAt && (
            <>
              {" "}
              · edited <SyncTimestamp iso={entry.updatedAt} />
            </>
          )}
        </span>
        {canManage && !editing && (
          <span className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="hover:text-slate-300">
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
