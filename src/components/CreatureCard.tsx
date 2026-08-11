"use client";

import { useState } from "react";
import { Character, Creature, CustomConditionTemplate } from "@/lib/types";
import { creatureReminders } from "@/lib/reminders";
import { useCardSortable } from "@/hooks/useCardSortable";
import { AiAssistantModal } from "./AiAssistantModal";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { EditCreatureModal } from "./EditCreatureModal";
import { CreatureHeader } from "./CreatureHeader";
import { CreatureHpHistoryModal } from "./CreatureHpHistoryModal";
import { CreatureStatBlock } from "./CreatureStatBlock";
import { AskAiPill } from "./ui/AskAiPill";
import { ENTITY_CARD_BASE_CLS, TOOLBAR_SHELL_CLS } from "./ui/containerStyles";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { ReminderBadge } from "./ui/ReminderBadge";
import { StatusRail } from "./ui/StatusRail";

/**
 * A deliberately lighter sibling of `CharacterCard` for companions/summoned
 * creatures (a Find Steed mount, a Wild Shape form, a familiar...) — same
 * combat-stat/tooltip/flame-flag conventions as the character card, but no
 * skills/spells/inventory. Clicking the header opens `CreatureDetailsModal`
 * (same gesture as `CharacterHeader`); `onUpdate` drives inline HP editing
 * and the flame-flag toggle on traits/actions. "Edit" links to a dedicated
 * `/creatures/[id]/edit` page (same convention as `CharacterCard`'s own Edit
 * link), `onRemove` deletes it, `onDuplicate` clones it (see
 * `useCreatures.duplicateCreature`).
 *
 * Deliberately shorter than the modal: Traits/Actions/Bonus Actions/
 * Reactions/Legendary Actions and the long-form Notes preview are both
 * skipped here (they live in `CreatureDetailsModal`'s own
 * `CreatureAbilitiesPanel`/`NotesSection`, not on this card at all) — with
 * several creature cards open side by side, that tail end of the stat block
 * was pushing cards tall enough that it got hard to tell which card's HP/
 * traits belonged to which name at a glance. Both still show in full in
 * `CreatureDetailsModal` (one click away via the header). Quick Notes are
 * hidden here too for now (same reasoning, kept only in the modal) — worth
 * revisiting if that turns out to lose a real workflow, not a permanent
 * removal.
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
  customConditionLibrary = [],
  onCustomConditionLibraryChange,
}: {
  creature: Creature;
  owner?: Character;
  characters: Character[];
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  onDuplicate?: (count: number) => void;
  onClearHpHistory?: (id: string) => void;
  onRemove?: (id: string) => void;
  /** Reordering is DM-only, matching `/api/creatures/reorder` — a player still sees the same card, just without the drag affordance on its header. */
  dragEnabled?: boolean;
  /** The campaign's shared custom-conditions library — see `CustomConditionTemplate`'s own doc comment. */
  customConditionLibrary?: CustomConditionTemplate[];
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
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
      className={`relative flex flex-col gap-3.5 p-3.5 ${ENTITY_CARD_BASE_CLS} ${
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
        customConditionIds={creature.customConditionIds ?? []}
        customConditionLibrary={customConditionLibrary}
        onToggleConcentration={onUpdate ? () => onUpdate(creature.id, { concentrating: !creature.concentrating }) : undefined}
        onConditionsChange={onUpdate ? (conditions) => onUpdate(creature.id, { conditions }) : undefined}
        onExhaustionChange={onUpdate ? (exhaustion) => onUpdate(creature.id, { exhaustion }) : undefined}
        onCustomConditionIdsChange={onUpdate ? (customConditionIds) => onUpdate(creature.id, { customConditionIds }) : undefined}
        onCustomConditionLibraryChange={onCustomConditionLibraryChange}
      />

      {/* Header — Reference link now lives inline on its own "CR N" line
          (see `CreatureHeader`). */}
      <CreatureHeader creature={creature} owner={owner} onClick={() => setDetailsOpen(true)} dragHandleProps={dragHandleProps} />

      {/* Reminder badge (conditional) + AI pill + kebab — one bordered
          toolbar (same `TOOLBAR_SHELL_CLS` as `CharacterCard`'s equivalent
          row) instead of a bare flex row. `-mb-2` trims the leftover gap
          before the stat block — see `CharacterCard`'s own comment. */}
      <div className={`-mx-2 -mb-2 flex items-center gap-1.5 px-2 py-1.5 ${TOOLBAR_SHELL_CLS}`}>
        <ReminderBadge
          group={creatureReminders(creature)}
          onRemove={onUpdate ? (name) => onUpdate(creature.id, { flaggedTraits: (creature.flaggedTraits ?? []).filter((n) => n !== name) }) : undefined}
        />
        <AskAiPill onClick={() => setAiOpen(true)} />
        <div className="ml-auto">
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

      <CreatureStatBlock creature={creature} onUpdate={onUpdate} compact />

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
          customConditionLibrary={customConditionLibrary}
          onCustomConditionLibraryChange={onCustomConditionLibraryChange}
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
          customConditionLibrary={customConditionLibrary}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}
