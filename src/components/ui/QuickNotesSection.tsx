"use client";

import { useState } from "react";
import { QuickNote } from "@/lib/types";
import { SectionDivider } from "./SectionDivider";
import { PlusIcon } from "./icons";

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A single quick note row — click the text to edit it inline, "×" removes it. Delete stays visible (not hover-only) since this card is used on touch devices too. */
function QuickNoteRow({
  note,
  onSave,
  onDelete,
}: {
  note: QuickNote;
  onSave: (text: string) => void;
  onDelete: () => void;
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
        className="w-full rounded-md border border-sky-700 bg-slate-800 px-1.5 py-0.5 text-sm text-slate-100 outline-none"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-300">
      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-600" />
      <button
        type="button"
        onClick={() => {
          setDraft(note.text);
          setEditing(true);
        }}
        className="min-w-0 flex-1 break-words text-left hover:text-slate-100"
      >
        {note.text}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete note"
        className="flex shrink-0 items-center text-slate-600 hover:text-red-400"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
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
}: {
  notes: QuickNote[];
  onChange?: (notes: QuickNote[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const sorted = notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

  return (
    <SectionDivider>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Quick Notes</h3>
        {onChange && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-label="Add a quick note"
            title="Add a quick note"
            className="rounded p-0.5 text-slate-500 hover:text-sky-400"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
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
          placeholder="Type a note, press Enter..."
          className="mb-1.5 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-600"
        />
      )}
      {sorted.length > 0 ? (
        <div className="space-y-1">
          {sorted.map((note) => (
            <QuickNoteRow
              key={note.id}
              note={note}
              onSave={(text) => saveNote(note.id, text)}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </div>
      ) : (
        !adding && <p className="text-sm italic text-slate-600">No notes yet.</p>
      )}
    </SectionDivider>
  );
}
