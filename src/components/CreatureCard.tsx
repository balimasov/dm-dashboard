"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { CreatureHeader } from "./CreatureHeader";
import { CreatureStatBlock } from "./CreatureStatBlock";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { NotesSection } from "./ui/NotesSection";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { StatusRail } from "./ui/StatusRail";

/**
 * A deliberately lighter sibling of `CharacterCard` for companions/summoned
 * creatures (a Find Steed mount, a Wild Shape form, a familiar...) — same
 * combat-stat/tooltip/flame-flag conventions as the character card, but no
 * skills/spells/inventory. Clicking the header opens `CreatureDetailsModal`
 * (same gesture as `CharacterHeader`); `onUpdate` drives inline HP editing,
 * the flame-flag toggle on traits/actions, and quick notes. "Edit" links to
 * a dedicated `/creatures/[id]/edit` page (same convention as `CharacterCard`
 * 's own Edit link), `onRemove` deletes it.
 */
export function CreatureCard({
  creature,
  owner,
  onUpdate,
  onRemove,
}: {
  creature: Creature;
  owner?: Character;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  onRemove?: (id: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-xl border p-4 shadow-lg shadow-black/20 ${
        creature.concentrating
          ? "concentrating-ring border-violet-500 bg-violet-950/10"
          : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <StatusRail
        conditions={creature.conditions}
        exhaustion={creature.exhaustion}
        concentrating={Boolean(creature.concentrating)}
        onToggleConcentration={onUpdate ? () => onUpdate(creature.id, { concentrating: !creature.concentrating }) : undefined}
        onConditionsChange={onUpdate ? (conditions) => onUpdate(creature.id, { conditions }) : undefined}
        onExhaustionChange={onUpdate ? (exhaustion) => onUpdate(creature.id, { exhaustion }) : undefined}
      />

      <CreatureHeader creature={creature} owner={owner} onClick={() => setDetailsOpen(true)} />

      {/* Kebab actions menu — own thin row right below the header (no sync
          line to share it with, unlike `CharacterCard`), right-aligned so it
          doesn't crowd the owner-avatar badge at the header row's edge. */}
      <div className="flex items-center justify-end gap-1">
        <EntityActionsMenu
          editHref={`/creatures/${creature.id}/edit`}
          name={creature.name}
          hidden={creature.hidden}
          onToggleHidden={onUpdate ? () => onUpdate(creature.id, { hidden: !creature.hidden }) : undefined}
          onRemove={onRemove ? () => onRemove(creature.id) : undefined}
        />
      </div>

      <CreatureStatBlock creature={creature} onUpdate={onUpdate} />

      <NotesSection notes={creature.notes ?? ""} />

      <QuickNotesSection
        notes={creature.quickNotes ?? []}
        onChange={onUpdate ? (quickNotes) => onUpdate(creature.id, { quickNotes }) : undefined}
      />

      {detailsOpen && (
        <CreatureDetailsModal
          creature={creature}
          owner={owner}
          onClose={() => setDetailsOpen(false)}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}
