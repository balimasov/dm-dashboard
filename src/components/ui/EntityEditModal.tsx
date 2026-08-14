"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Modal } from "./Modal";
import { INLINE_ERROR_CLS, MODAL_TITLE_CLS } from "./typography";

/**
 * Shared shell for the app's two wide (`max-w-7xl`) full-form edit modals —
 * `EditCharacterModal`/`EditCreatureModal` — title+close header, scrollable
 * form body, and a Cancel/Save footer with inline save-error text, all
 * byte-identical between the two before this (confirmed by a UI-kit audit).
 * Owns the `saving`/`saveError` state and the submit handler's
 * preventDefault/try-await-onSave/catch shape too, not just the markup —
 * each caller only supplies its own `onSave` (already-composed update call)
 * and form fields as `children`.
 */
export function EntityEditModal({
  title,
  onClose,
  onSave,
  saveErrorFallback,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => Promise<void> | void;
  /** Shown when `onSave` rejects with something that isn't an `Error` (or has no `.message`) — each caller's own wording ("Failed to save character."/"Failed to save creature."). */
  saveErrorFallback: string;
  children: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await onSave();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : saveErrorFallback);
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      header={
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className={MODAL_TITLE_CLS}>{title}</h2>
          <IconButton onClick={onClose} aria-label="Close">
            ✕
          </IconButton>
        </div>
      }
      panelClassName="h-[85vh] w-full max-w-7xl border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
    >
      <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
        <div className="scrollbar-themed flex-1 space-y-8 overflow-y-auto px-5 py-4">{children}</div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          {saveError && <p className={`mr-auto ${INLINE_ERROR_CLS}`}>{saveError}</p>}
          <Button type="button" variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
