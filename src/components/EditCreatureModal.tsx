"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { CreatureFormFields, CreatureFormValue } from "@/components/CreatureFormFields";
import { creatureToFormValue, formValueToCreatureUpdates } from "@/lib/creatureForm";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";
import { Modal } from "./ui/Modal";
import { INLINE_ERROR_CLS, MODAL_TITLE_CLS } from "./ui/typography";

/**
 * Wide modal replacement for the old dedicated `/creatures/[id]/edit` page —
 * a stat block has a lot of fields, so this deliberately claims as much
 * width as the app's modals go (`max-w-7xl`, vs. `max-w-4xl` for
 * `RosterManagerModal`) rather than the narrower shell used for read-only
 * detail views. Openable from inside another modal (`CreatureDetailsModal`,
 * `CreatureRosterEditor` inside `RosterManagerModal`) — both
 * `useScrollLock`/`useEscapeToClose` are reference-counted/stack-based
 * specifically so that composes correctly instead of double-unlocking or
 * closing the wrong layer on Escape.
 *
 * Saves through the caller's `onUpdate` (the same optimistic
 * `updateCreature` callback every card/modal already uses) instead of a
 * direct `patchCreature` + page navigation — the old page had to force a
 * full route change just to get the dashboard to reflect the save; a modal
 * can just await the update and close itself.
 */
export function EditCreatureModal({
  creature,
  characters,
  onClose,
  onUpdate,
}: {
  creature: Creature;
  characters: Character[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Creature>) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<CreatureFormValue>(() => creatureToFormValue(creature));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEscapeToClose(onClose);
  useScrollLock();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(creature.id, formValueToCreatureUpdates(draft));
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save creature.");
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      header={
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className={MODAL_TITLE_CLS}>Edit Creature</h2>
          <IconButton onClick={onClose} aria-label="Close">
            ✕
          </IconButton>
        </div>
      }
      panelClassName="h-[85vh] w-full max-w-7xl border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
    >
        <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
          <div className="scrollbar-themed flex-1 overflow-y-auto px-5 py-4">
            <CreatureFormFields value={draft} onChange={(u) => setDraft((d) => ({ ...d, ...u }))} characters={characters} />
          </div>

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
