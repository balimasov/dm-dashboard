"use client";

import { useState } from "react";
import { NotesEditor } from "@/components/NotesEditor";
import { ensureNotesHtml } from "@/lib/journal";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { PencilIcon } from "./icons";
import { SubHeading } from "./SubHeading";

/**
 * The long-form freeform `notes` field shared by `Character`/`Creature` —
 * read-only (and hidden entirely when empty) without an `onChange`, matching
 * how the compact card has only ever shown it. With one, this now follows
 * the same read-by-default/edit-on-demand shape `CampaignDescription`
 * (`DashboardClient.tsx`) already established for campaign notes: a pencil
 * (hover/focus-revealed above `sm`, always visible below it since a phone
 * has no hover to reveal it with — same breakpoint convention as
 * `CampaignDescription`'s own pencil) switches the block into `NotesEditor`
 * with an explicit Save/Cancel pair, rather than the editor sitting open the
 * whole time with save-on-blur — one less always-editable text box
 * mid-session, and one consistent "click to edit a notes field" affordance
 * across the app instead of two slightly different ones. Stored/rendered as
 * HTML via `NotesEditor` (Tiptap), same convention as `Campaign.notes`/
 * `JournalEntry.text` — `ensureNotesHtml` promotes any pre-existing
 * plain-text notes the first time they're touched.
 */
export function NotesSection({
  notes,
  onChange,
  compact = false,
  topDivider = true,
}: {
  notes: string;
  onChange?: (notes: string) => void;
  /** Passed straight through to `SectionDivider` — see its own doc comment. */
  compact?: boolean;
  /** `false` when this is the first thing inside its own container — the
   * details modal's Notes tab, right under `TabStrip` — where a top border
   * here would just duplicate the tab strip's own bottom rule a few pixels
   * below it. Every other call site (stacked after a stat block, after
   * `CreatureAbilitiesPanel`, ...) keeps the default divider. */
  topDivider?: boolean;
}) {
  const html = ensureNotesHtml(notes);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(html);
  const isEmpty = html.replace(/<[^>]+>/g, "").trim().length === 0;
  // Same border-t/padding-top `SectionDivider` renders, computed by hand —
  // `SectionDivider` itself always takes a `compact` prop, which a plain
  // `<div>` can't accept without leaking it onto the DOM node as an invalid
  // attribute, so this can't be a `topDivider ? SectionDivider : "div"`
  // component swap.
  const dividerCls = topDivider ? `border-t border-slate-800 ${compact ? "pt-2.5" : "pt-3"}` : "";

  if (!onChange) {
    if (isEmpty) return null;
    return (
      <div className={dividerCls}>
        <SubHeading>Notes</SubHeading>
        <div className="notes-editor-content text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
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
      <div className={dividerCls}>
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
      </div>
    );
  }

  return (
    <div className={`${dividerCls} group relative`.trim()}>
      <SubHeading>Notes</SubHeading>
      <IconButton
        tone="muted"
        onClick={startEditing}
        aria-label="Edit notes"
        title="Edit notes"
        className={`absolute right-0 ${compact ? "top-2" : "top-3"} opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100`}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </IconButton>
      {/* `pr-8` on mobile reserves the pencil's own footprint out of the
          text's line box — the button is always visible there (no hover to
          time it around, see the class list above), so without this a line
          wrapping to the block's right edge runs straight under it. Not
          needed at `sm`+, where the button is invisible except mid-hover. */}
      {isEmpty ? (
        <p className="pr-8 text-sm italic text-slate-600 sm:pr-0">No notes yet.</p>
      ) : (
        <div
          className="notes-editor-content pr-8 text-sm text-slate-300 sm:pr-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
