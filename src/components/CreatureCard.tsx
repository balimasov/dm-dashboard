"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { creatureReminders } from "@/lib/reminders";
import { useCardSortable } from "@/hooks/useCardSortable";
import { AiAssistantModal } from "./AiAssistantModal";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { EditCreatureModal } from "./EditCreatureModal";
import { CreatureHeader } from "./CreatureHeader";
import { CreatureHpHistoryModal } from "./CreatureHpHistoryModal";
import { CreatureStatBlock } from "./CreatureStatBlock";
import { AskAiPill } from "./ui/AskAiPill";
import { ENTITY_CARD_BASE_CLS } from "./ui/containerStyles";
import { CreatureReferenceLink } from "./ui/CreatureReferenceLink";
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
 * skipped here (they live in `CreatureDetailsModal`'s own
 * `CreatureAbilitiesPanel`/`NotesSection`, not on this card at all) — with
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
  characters,
  onUpdate,
  onDuplicate,
  onClearHpHistory,
  onRemove,
  dragEnabled = false,
}: {
  creature: Creature;
  owner?: Character;
  characters: Character[];
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  onDuplicate?: () => void;
  onClearHpHistory?: (id: string) => void;
  onRemove?: (id: string) => void;
  /** Reordering is DM-only, matching `/api/creatures/reorder` — a player still sees the same card, just without the drag affordance on its header. */
  dragEnabled?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [hpHistoryOpen, setHpHistoryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { setNodeRef, style, dragHandleProps, isDragging } = useCardSortable(creature.id, dragEnabled);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col gap-4 ${ENTITY_CARD_BASE_CLS} ${
        isDragging
          ? "z-20 border-sky-500 bg-slate-900/60 shadow-2xl shadow-black/40"
          : creature.concentrating
            ? "concentrating-ring border-violet-500 bg-violet-950/10"
            : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <StatusRail
        conditions={creature.conditions}
        exhaustion={creature.exhaustion}
        concentrating={Boolean(creature.concentrating)}
        customConditions={creature.customConditions ?? []}
        onToggleConcentration={onUpdate ? () => onUpdate(creature.id, { concentrating: !creature.concentrating }) : undefined}
        onConditionsChange={onUpdate ? (conditions) => onUpdate(creature.id, { conditions }) : undefined}
        onExhaustionChange={onUpdate ? (exhaustion) => onUpdate(creature.id, { exhaustion }) : undefined}
        onCustomConditionsChange={onUpdate ? (customConditions) => onUpdate(creature.id, { customConditions }) : undefined}
      />

      <CreatureHeader creature={creature} owner={owner} onClick={() => setDetailsOpen(true)} dragHandleProps={dragHandleProps} />

      {/* Reference link (left, when set) + reminder badge (conditional) + AI
          pill + kebab (right) — a creature has no D&D Beyond sync date, and
          its created/edited timestamp turned out not to be worth the row
          space (removed rather than replaced with something else), but an
          optional reference link takes the same left slot `DdbSyncStatus`
          occupies on `CharacterCard`'s equivalent row. */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <CreatureReferenceLink url={creature.referenceUrl} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ReminderBadge
            group={creatureReminders(creature)}
            onRemove={onUpdate ? (name) => onUpdate(creature.id, { flaggedTraits: (creature.flaggedTraits ?? []).filter((n) => n !== name) }) : undefined}
          />
          <AskAiPill onClick={() => setAiOpen(true)} />
          <EntityActionsMenu
            onEdit={() => setEditOpen(true)}
            name={creature.name}
            hidden={creature.hidden}
            onToggleHidden={onUpdate ? () => onUpdate(creature.id, { hidden: !creature.hidden }) : undefined}
            onDuplicate={onDuplicate}
            onShowHpHistory={() => setHpHistoryOpen(true)}
            onRemove={onRemove ? () => onRemove(creature.id) : undefined}
          />
        </div>
      </div>

      <CreatureStatBlock creature={creature} onUpdate={onUpdate} />

      <QuickNotesSection
        notes={creature.quickNotes ?? []}
        onChange={onUpdate ? (quickNotes) => onUpdate(creature.id, { quickNotes }) : undefined}
      />

      {detailsOpen && (
        <CreatureDetailsModal
          creature={creature}
          owner={owner}
          characters={characters}
          onClose={() => setDetailsOpen(false)}
          onUpdate={onUpdate}
          onDuplicate={onDuplicate}
          onClearHpHistory={onClearHpHistory}
          onRemove={onRemove}
        />
      )}

      {editOpen && onUpdate && (
        <EditCreatureModal
          creature={creature}
          characters={characters}
          onClose={() => setEditOpen(false)}
          onUpdate={onUpdate}
        />
      )}

      {hpHistoryOpen && (
        <CreatureHpHistoryModal
          creature={creature}
          onClear={onClearHpHistory ? () => onClearHpHistory(creature.id) : undefined}
          onClose={() => setHpHistoryOpen(false)}
        />
      )}

      {aiOpen && (
        <AiAssistantModal
          name={creature.name}
          target={{ campaignId: creature.campaignId, creatureId: creature.id }}
          entity={creature}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}
