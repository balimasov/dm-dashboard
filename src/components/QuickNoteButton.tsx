"use client";

import { useEffect, useRef, useState } from "react";
import { createJournalEntryApi } from "@/lib/journalApi";
import { plainTextToParagraphHtml } from "@/lib/journal";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { Toast } from "./Toast";
import { PencilIcon } from "./ui/icons";

/**
 * Always-visible fast-entry point for a DM-private journal note — doesn't
 * know about sessions at all (unlike `CampaignJournalModal`/`useJournal`);
 * the server auto-resolves "today's" session for whatever it creates. A
 * plain `<textarea>`, not the full `NotesEditor` — Tiptap's own default
 * keymap binds Enter to "new paragraph", and retrofitting "Enter submits,
 * Shift+Enter newlines" means overriding that keymap for a popup that
 * explicitly wants no toolbar/formatting anyway. The saved text still ends
 * up as the same HTML shape every other journal entry uses (see
 * `plainTextToParagraphHtml`), so it opens and edits identically in the
 * full Journal modal later.
 */
export function QuickNoteButton({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEscapeToClose(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createJournalEntryApi({ campaignId, text: plainTextToParagraphHtml(trimmed) });
      setText("");
      setOpen(false);
      setToast("Note saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick Note"
        title="Quick Note"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      {open && (
        // `fixed` + `inset-x-3` on mobile — anchoring this as an `absolute
        // right-0` dropdown (still used from `sm:` up) let its fixed width
        // run past the left edge of a narrow viewport whenever the trigger
        // button sat close enough to the right edge, clipping the panel.
        // Pinning both side edges to the viewport with a margin sidesteps
        // that regardless of where the button ends up in the header row.
        <div className="fixed inset-x-3 top-24 z-30 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-lg shadow-black/40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 sm:w-80">
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
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
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
    </div>
  );
}
