"use client";

import { useState } from "react";
import { NotesEditor } from "@/components/NotesEditor";
import { ensureNotesHtml } from "@/lib/journal";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { PencilIcon } from "./icons";
import { SectionDivider } from "./SectionDivider";
import { SubHeading } from "./SubHeading";

/**
 * The long-form freeform `notes` field shared by `Character`/`Creature` —
 * read-only (and hidden entirely when empty) without an `onChange`, matching
 * how the compact card has only ever shown it. With one, this now follows
 * the same read-by-default/edit-on-demand shape `CampaignDescription`
 * (`DashboardClient.tsx`) already established for campaign notes: a
 * hover-revealed pencil switches the block into `NotesEditor` with an
 * explicit Save/Cancel pair, rather than the editor sitting open the whole
 * time with save-on-blur — one less always-editable text box mid-session,
 * and one consistent "click to edit a notes field" affordance across the
 * app instead of two slightly different ones. Stored/rendered as HTML via
 * `NotesEditor` (Tiptap), same convention as `Campaign.notes`/
 * `JournalEntry.text` — `ensureNotesHtml` promotes any pre-existing
 * plain-text notes the first time they're touched.
 */
export function NotesSection({
  notes,
  onChange,
}: {
  notes: string;
  onChange?: (notes: string) => void;
}) {
  const html = ensureNotesHtml(notes);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(html);
  const isEmpty = html.replace(/<[^>]+>/g, "").trim().length === 0;

  if (!onChange) {
    if (isEmpty) return null;
    return (
      <SectionDivider>
        <SubHeading>Notes</SubHeading>
        <div className="notes-editor-content text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: html }} />
      </SectionDivider>
    );
  }

  function startEditing() {
    setDraft(html);
    setEditing(true);
  }

  function save() {
    if (draft !== html) onChange!(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <SectionDivider>
        <SubHeading>Notes</SubHeading>
        <NotesEditor value={draft} onChange={setDraft} placeholder="Add notes..." autoFocus />
        <div className="mt-2 flex justify-end gap-2 text-sm">
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="px-3 py-1.5">
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={save} className="px-3 py-1.5 font-semibold">
            Save
          </Button>
        </div>
      </SectionDivider>
    );
  }

  return (
    <SectionDivider className="group relative">
      <SubHeading>Notes</SubHeading>
      <IconButton
        tone="muted"
        onClick={startEditing}
        aria-label="Edit notes"
        title="Edit notes"
        className="absolute right-0 top-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </IconButton>
      {isEmpty ? (
        <p className="text-sm italic text-slate-600">No notes yet.</p>
      ) : (
        <div className="notes-editor-content text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </SectionDivider>
  );
}
