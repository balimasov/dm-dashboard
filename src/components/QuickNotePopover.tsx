"use client";

import { useEffect, useRef, useState } from "react";
import { createJournalEntryApi } from "@/lib/journalApi";
import { plainTextToParagraphHtml } from "@/lib/journal";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { Toast } from "./Toast";
import { POPOVER_SHELL_CLS } from "./ui/containerStyles";
import { INLINE_ERROR_XS_CLS, MUTED_LABEL_CLS } from "./ui/typography";

/**
 * Always-reachable fast-entry point for a DM-private journal note — doesn't
 * know about sessions at all (unlike `CampaignJournalModal`/`useJournal`);
 * the server auto-resolves "today's" session for whatever it creates. A
 * plain `<textarea>`, not the full `NotesEditor` — Tiptap's own default
 * keymap binds Enter to "new paragraph", and retrofitting "Enter submits,
 * Shift+Enter newlines" means overriding that keymap for a popup that
 * explicitly wants no toolbar/formatting anyway. The saved text still ends
 * up as the same HTML shape every other journal entry uses (see
 * `plainTextToParagraphHtml`), so it opens and edits identically in the
 * full Journal modal later.
 *
 * Controlled (`open`/`onClose`) rather than owning its own trigger — the
 * trigger is now a "Quick Note" row inside `DashboardClient`'s campaign
 * menu, which closes itself on any inner click; a popover nested inside
 * that menu's own conditionally-rendered panel would unmount the instant
 * it opened. Rendered as a sibling of that menu instead, `fixed` near the
 * top-right of the viewport rather than anchored to a specific trigger
 * element, since the row that opens it no longer exists once the menu
 * that contained it has closed.
 */
export function QuickNotePopover({
  campaignId,
  open,
  onClose,
}: {
  campaignId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEscapeToClose(onClose, open);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = textareaRef.current;
    if (!el) return;
    // A reopened popup can carry over a draft left over from before it was
    // last closed without submitting (this component stays mounted, so
    // `text` state survives the close) — plain `.focus()` alone leaves the
    // caret wherever the browser's default selection lands, which for a
    // textarea that already has a value is its start, not its end. Placing
    // the selection explicitly at the end matches what anyone resuming a
    // draft actually expects: keep typing where they left off.
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [open]);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createJournalEntryApi({ campaignId, text: plainTextToParagraphHtml(trimmed) });
      setText("");
      onClose();
      setToast("Note saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {open && (
        // `fixed` on every breakpoint (not just mobile, like the old
        // trigger-anchored version) — there's no longer a trigger element to
        // anchor an `absolute` panel to, since the row that opens this lives
        // inside a menu that's already closed by the time this renders.
        <div
          ref={panelRef}
          className={`fixed inset-x-3 top-20 z-30 p-3 sm:inset-x-auto sm:right-4 sm:top-16 sm:w-80 ${POPOVER_SHELL_CLS}`}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Quick note..."
            rows={6}
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
          {error && <p className={`mt-1 ${INLINE_ERROR_XS_CLS}`}>{error}</p>}
          <div className={`mt-2 flex items-center justify-between ${MUTED_LABEL_CLS}`}>
            <span>Enter to save · Shift+Enter for a new line</span>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving || !text.trim()}
              className="rounded px-2 py-1 text-sky-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
            >
              Save
            </button>
          </div>
        </div>
      )}
      {toast && <Toast variant="success" message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
