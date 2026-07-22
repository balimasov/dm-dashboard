"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Character, Creature } from "@/lib/types";
import { CreatureFormFields, CreatureFormValue } from "@/components/CreatureFormFields";
import { creatureToFormValue, formValueToCreatureUpdates } from "@/lib/creatureForm";
import { patchCreature } from "@/lib/creatureApi";
import { Breadcrumbs } from "./Breadcrumbs";
import { Button } from "./ui/Button";

/**
 * Full-page creature edit, same shape as `EditCharacterForm` — a dedicated
 * route reached via the "Edit" link on the dashboard card or the roster
 * editor row, rather than a modal, so a creature's stat block gets the same
 * amount of room and the same save/back conventions a character's does.
 */
export function EditCreatureForm({
  creature,
  campaignName,
  characters,
}: {
  creature: Creature;
  campaignName: string;
  characters: Character[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CreatureFormValue>(() => creatureToFormValue(creature));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await patchCreature(creature.id, formValueToCreatureUpdates(draft));
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save creature.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Campaigns", href: "/" },
          { label: campaignName, href: `/campaigns/${creature.campaignId}` },
          { label: creature.name },
        ]}
        className="mb-4"
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50">Edit Creature</h1>
        <button type="button" onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
          ← Back to dashboard
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <CreatureFormFields value={draft} onChange={(u) => setDraft((d) => ({ ...d, ...u }))} characters={characters} />

        {saveError && <p className="text-sm text-red-400">{saveError}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
