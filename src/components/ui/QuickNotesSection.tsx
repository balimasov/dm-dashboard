"use client";

import { useState } from "react";
import { QuickNote } from "@/lib/types";
import { inputCls } from "./Field";
import { FlameToggle } from "./FlaggableRow";
import { IconButton } from "./IconButton";
import { PlusIcon, TrashOutlineIcon } from "./icons";

/**
 * A single quick note row — click the text to edit it inline, "×" removes
 * it. Delete stays visible (not hover-only) since this card is used on
 * touch devices too. The flame reuses `FlaggableRow`'s own toggle so marking
 * a quick note as a reminder looks and behaves identically to flagging a
 * spell/feature/weapon — flipping `note.flagged` is what makes it (and its
 * full text, via a hint) show up in `RemindersPanel`/`RemindersFab`/
 * `ReminderBadge` (see `quickNoteReminderEntries` in `lib/reminders.tsx`).
 */
function QuickNoteRow({
  note,
  onSave,
  onDelete,
  onToggleFlag,
}: {
  note: QuickNote;
  onSave: (text: string) => void;
  onDelete: () => void;
  onToggleFlag: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const trimmed = draft.trim();
            if (trimmed) onSave(trimmed);
            setEditing(false);
          } else if (e.key === "Escape") {
            setDraft(note.text);
            setEditing(false);
          }
        }}
        onBlur={() => {
          setDraft(note.text);
          setEditing(false);
        }}
        className={`${inputCls} w-full`}
      />
    );
  }

  return (
    <div className={`-mx-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-sm ${note.flagged ? "bg-amber-500/10" : ""}`}>
      <FlameToggle active={Boolean(note.flagged)} onToggle={onToggleFlag} />
      <button
        type="button"
        onClick={() => {
          setDraft(note.text);
          setEditing(true);
        }}
        className={`min-w-0 flex-1 break-words text-left hover:text-slate-100 ${note.flagged ? "text-amber-300" : "text-slate-300"}`}
      >
        {note.text}
      </button>
      <IconButton tone="danger" onClick={onDelete} aria-label="Delete note">
        <TrashOutlineIcon className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

/**
 * Short, dashboard-added reminders — separate from a single long-form `notes`
 * field (edited only on a character's/creature's own edit page) so a DM can
 * jot something down and clear it again without leaving the dashboard.
 * Shared between `CharacterCard` and `CreatureCard` so the two never drift
 * out of sync in how quick notes look or behave — the caller owns the actual
 * `quickNotes` array (on a `Character` or `Creature`) and just hands it in
 * plus a setter. Always shows its header (with the add button) so the
 * section itself never shifts the rest of the card when notes are
 * added/removed.
 */
export function QuickNotesSection({
  notes,
  onChange,
  compact = false,
  topDivider = true,
}: {
  notes: QuickNote[];
  onChange?: (notes: QuickNote[]) => void;
  /** Same border-t/padding-top recipe `SectionDivider` renders — see its own doc comment. */
  compact?: boolean;
  /** `false` right under `NotesSection` in the details modal's Notes tab, where a border here would just repeat the gap already separating the two blocks. Every other call site keeps the default divider. */
  topDivider?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const sorted = notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const dividerCls = topDivider ? `border-t border-slate-800 ${compact ? "pt-2.5" : "pt-3"}` : "";

  function commitAdd() {
    const text = draft.trim();
    if (!text) return;
    const note: QuickNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdAt: new Date().toISOString(),
    };
    onChange?.([note, ...notes]);
    setDraft("");
  }

  function saveNote(id: string, text: string) {
    onChange?.(notes.map((n) => (n.id === id ? { ...n, text } : n)));
  }

  function deleteNote(id: string) {
    onChange?.(notes.filter((n) => n.id !== id));
  }

  function toggleFlag(id: string) {
    onChange?.(notes.map((n) => (n.id === id ? { ...n, flagged: !n.flagged } : n)));
  }

  return (
    <div className={dividerCls}>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Quick Notes</h3>
        {onChange && (
          <IconButton
            tone="accent"
            // Without this, clicking the button while the input is focused
            // fires the input's own `onBlur` first (closing it), then this
            // `onClick` re-opens it right back — `preventDefault` on
            // mousedown keeps focus in the input so blur never fires, and
            // the toggle below runs exactly once.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAdding((v) => !v)}
            aria-label="Add a quick note"
            title="Add a quick note"
          >
            <PlusIcon className="h-4 w-4" />
          </IconButton>
        )}
      </div>
      {adding && (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitAdd();
            } else if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          // Clicking anywhere else abandons the draft, same as changing
          // your mind mid-edit on an existing note (`QuickNoteRow`'s own
          // input does the same) — the simplest possible way to back out.
          onBlur={() => {
            setDraft("");
            setAdding(false);
          }}
          placeholder="Type a note, press Enter..."
          className={`${inputCls} mb-1.5 w-full`}
        />
      )}
      {sorted.length > 0 && (
        <div className="space-y-1">
          {sorted.map((note) => (
            <QuickNoteRow
              key={note.id}
              note={note}
              onSave={(text) => saveNote(note.id, text)}
              onDelete={() => deleteNote(note.id)}
              onToggleFlag={() => toggleFlag(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
