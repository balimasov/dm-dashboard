"use client";

import { useEffect, useRef, useState } from "react";
import { NotesEditor } from "@/components/NotesEditor";
import { ensureNotesHtml } from "@/lib/journal";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { NoteIcon, PencilIcon } from "./icons";
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
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const isEmpty = html.replace(/<[^>]+>/g, "").trim().length === 0;

  // Measures whether the 4-line clamp below is actually hiding any text —
  // `line-clamp-4` cuts silently, so without this a short note (under 4
  // lines) would carry a dead "Show more" link that expands nothing.
  useEffect(() => {
    if (!bodyRef.current) return;
    setIsTruncated(bodyRef.current.scrollHeight > bodyRef.current.clientHeight + 1);
  }, [html]);
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
    <div className={`${dividerCls} group`.trim()}>
      {/* `items-start` (not `-center`) — the pencil `IconButton` is taller
          than the `text-xs` label next to it (its own `p-1` padding), so
          centering the row pushed the label's own text a few px lower than
          every other tab's first heading ("Melee", "Action", ...), which
          all sit flush at the panel's top with no button beside them
          (confirmed on a live measurement: 230px vs 233px). Top-aligning
          both keeps the label flush with those, at the cost of the button's
          own icon sitting a few px lower inside its box than dead-center. */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Notes</h3>
        <IconButton
          tone="muted"
          onClick={startEditing}
          aria-label="Edit notes"
          title="Edit notes"
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      {isEmpty ? (
        <button
          type="button"
          onClick={startEditing}
          className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/30 py-5 text-center transition hover:border-slate-700 hover:bg-slate-900/50"
        >
          <NoteIcon className="h-5 w-5 text-slate-600" />
          <span className="text-sm text-slate-400">No notes yet</span>
          <span className="text-xs text-slate-600">Click to add</span>
        </button>
      ) : (
        <>
          <div
            ref={bodyRef}
            className={`notes-editor-content text-sm text-slate-300 ${expanded ? "" : "line-clamp-4"}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {!expanded && isTruncated && (
            <button type="button" onClick={() => setExpanded(true)} className="mt-1 text-xs font-medium text-sky-400 hover:underline">
              Show more
            </button>
          )}
        </>
      )}
    </div>
  );
}
