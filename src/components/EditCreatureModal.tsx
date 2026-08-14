"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { CreatureFormFields, CreatureFormValue } from "@/components/CreatureFormFields";
import { creatureToFormValue, formValueToCreatureUpdates } from "@/lib/creatureForm";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";
import { EntityEditModal } from "./ui/EntityEditModal";

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

  useEscapeToClose(onClose);
  useScrollLock();

  return (
    <EntityEditModal
      title="Edit Creature"
      onClose={onClose}
      onSave={() => onUpdate(creature.id, formValueToCreatureUpdates(draft))}
      saveErrorFallback="Failed to save creature."
    >
      <CreatureFormFields value={draft} onChange={(u) => setDraft((d) => ({ ...d, ...u }))} characters={characters} />
    </EntityEditModal>
  );
}
