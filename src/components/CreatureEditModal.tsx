"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { CreatureFormFields, CreatureFormValue } from "@/components/CreatureFormFields";
import { creatureToFormValue, formValueToCreatureUpdates } from "@/lib/creatureForm";

/**
 * Full edit capability for a creature straight from the dashboard card — no
 * detour through Settings, matching the weight of `CharacterCard`'s own
 * "Edit" link (that one navigates to a whole page since a character has far
 * more to edit; a creature's stat block is small enough that a modal covers
 * it without needing a dedicated route).
 */
export function CreatureEditModal({
  creature,
  characters,
  onSave,
  onClose,
}: {
  creature: Creature;
  characters: Character[];
  onSave: (updates: Partial<Creature>) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CreatureFormValue>(() => creatureToFormValue(creature));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formValueToCreatureUpdates(draft));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="scrollbar-themed flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-50">Edit Creature</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:text-slate-200">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CreatureFormFields value={draft} onChange={(u) => setDraft((d) => ({ ...d, ...u }))} characters={characters} />
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
