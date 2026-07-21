"use client";

import { useState } from "react";
import { NotesEditor } from "@/components/NotesEditor";
import { ensureNotesHtml } from "@/lib/journal";
import { SectionDivider } from "./SectionDivider";
import { SubHeading } from "./SubHeading";

/**
 * The long-form freeform `notes` field shared by `Character`/`Creature` —
 * read-only (and hidden entirely when empty) without an `onChange`, matching
 * how the compact card has only ever shown it; editable with local state and
 * save-on-blur when one is given, same lightweight pattern as the campaign
 * notes editor (`CampaignNotes` in `DashboardClient.tsx`) — no dedicated save
 * button, and no per-keystroke save either, so typing doesn't hammer the API.
 * Stored/rendered as HTML via `NotesEditor` (Tiptap), same convention as
 * `Campaign.notes`/`JournalEntry.text` — `ensureNotesHtml` promotes any
 * pre-existing plain-text notes the first time they're touched.
 */
export function NotesSection({
  notes,
  onChange,
}: {
  notes: string;
  onChange?: (notes: string) => void;
}) {
  const html = ensureNotesHtml(notes);
  const [draft, setDraft] = useState(html);

  if (!onChange) {
    if (!notes) return null;
    return (
      <SectionDivider>
        <SubHeading>Notes</SubHeading>
        <div
          className="notes-editor-content text-sm text-slate-400"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </SectionDivider>
    );
  }

  return (
    <SectionDivider>
      <SubHeading>Notes</SubHeading>
      <NotesEditor
        value={draft}
        onChange={setDraft}
        onBlur={() => {
          if (draft !== html) onChange(draft);
        }}
        placeholder="Add notes..."
      />
    </SectionDivider>
  );
}
