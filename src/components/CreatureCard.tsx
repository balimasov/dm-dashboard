"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { creatureReminders } from "@/lib/reminders";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { CreatureHeader } from "./CreatureHeader";
import { CreatureHpHistoryModal } from "./CreatureHpHistoryModal";
import { CreatureStatBlock } from "./CreatureStatBlock";
import { CreatureTimestampStatus } from "./ui/CreatureTimestampStatus";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { ReminderBadge } from "./ui/ReminderBadge";
import { StatusRail } from "./ui/StatusRail";

/**
 * A deliberately lighter sibling of `CharacterCard` for companions/summoned
 * creatures (a Find Steed mount, a Wild Shape form, a familiar...) — same
 * combat-stat/tooltip/flame-flag conventions as the character card, but no
 * skills/spells/inventory. Clicking the header opens `CreatureDetailsModal`
 * (same gesture as `CharacterHeader`); `onUpdate` drives inline HP editing,
 * the flame-flag toggle on traits/actions, and quick notes. "Edit" links to
 * a dedicated `/creatures/[id]/edit` page (same convention as `CharacterCard`
 * 's own Edit link), `onRemove` deletes it, `onDuplicate` clones it (see
 * `useCreatures.duplicateCreature`).
 *
 * Deliberately shorter than the modal: Traits/Actions/Bonus Actions/
 * Reactions/Legendary Actions and the long-form Notes preview are both
 * skipped here (`showActionGroups={false}`, no `NotesSection`) — with
 * several creature cards open side by side, that tail end of the stat block
 * was pushing cards tall enough that it got hard to tell which card's HP/
 * traits belonged to which name at a glance. Both still show in full in
 * `CreatureDetailsModal` (one click away via the header); Quick Notes stay
 * on the card since those are the short, glanceable reminders the whole
 * point of a compact card is to surface.
 */
export function CreatureCard({
  creature,
  owner,
  onUpdate,
  onDuplicate,
  onClearHpHistory,
  onRemove,
}: {
  creature: Creature;
  owner?: Character;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  onDuplicate?: () => void;
  onClearHpHistory?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hpHistoryOpen, setHpHistoryOpen] = useState(false);

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

      {/* Created/edited timestamp (left) + kebab actions menu (right) share
          one row — same placement as `CharacterCard`'s own sync+actions row,
          just with a last-edited stamp standing in for the D&D Beyond sync
          line a creature has no equivalent of. */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <CreatureTimestampStatus createdAt={creature.createdAt} updatedAt={creature.updatedAt} />
        </div>
        {/* Badge sits right next to the kebab (own tighter `gap-1.5`, vs.
            the row's own `gap-3` to the timestamp block) — same convention
            as `CharacterCard`'s equivalent row. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <ReminderBadge
            group={creatureReminders(creature)}
            onRemove={onUpdate ? (name) => onUpdate(creature.id, { flaggedTraits: (creature.flaggedTraits ?? []).filter((n) => n !== name) }) : undefined}
          />
          <EntityActionsMenu
            editHref={`/creatures/${creature.id}/edit`}
            name={creature.name}
            hidden={creature.hidden}
            onToggleHidden={onUpdate ? () => onUpdate(creature.id, { hidden: !creature.hidden }) : undefined}
            onDuplicate={onDuplicate}
            onShowHpHistory={() => setHpHistoryOpen(true)}
            onRemove={onRemove ? () => onRemove(creature.id) : undefined}
          />
        </div>
      </div>

      <CreatureStatBlock creature={creature} onUpdate={onUpdate} showActionGroups={false} />

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
          onDuplicate={onDuplicate}
          onClearHpHistory={onClearHpHistory}
          onRemove={onRemove}
        />
      )}

      {hpHistoryOpen && (
        <CreatureHpHistoryModal
          creature={creature}
          onClear={onClearHpHistory ? () => onClearHpHistory(creature.id) : undefined}
          onClose={() => setHpHistoryOpen(false)}
        />
      )}
    </div>
  );
}
