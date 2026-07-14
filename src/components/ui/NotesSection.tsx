"use client";

import { useState } from "react";
import { SectionDivider } from "./SectionDivider";
import { SubHeading } from "./SubHeading";

/**
 * The long-form freeform `notes` field shared by `Character`/`Creature` —
 * read-only (and hidden entirely when empty) without an `onChange`, matching
 * how the compact card has only ever shown it; editable with local state and
 * save-on-blur when one is given, same lightweight pattern as the campaign
 * notes editor (`CampaignNotes` in `DashboardClient.tsx`) — no dedicated save
 * button, and no per-keystroke save either, so typing doesn't hammer the API.
 */
export function NotesSection({
  notes,
  onChange,
}: {
  notes: string;
  onChange?: (notes: string) => void;
}) {
  const [draft, setDraft] = useState(notes);

  if (!onChange) {
    if (!notes) return null;
    return (
      <SectionDivider>
        <SubHeading>Notes</SubHeading>
        <p className="text-sm text-slate-400 leading-snug">{notes}</p>
      </SectionDivider>
    );
  }

  return (
    <SectionDivider>
      <SubHeading>Notes</SubHeading>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== notes) onChange(draft);
        }}
        rows={3}
        placeholder="Add notes..."
        className="w-full rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm leading-snug text-slate-300 outline-none placeholder:text-slate-600 focus:border-sky-600"
      />
    </SectionDivider>
  );
}
