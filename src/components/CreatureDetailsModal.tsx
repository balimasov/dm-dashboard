"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { creatureReminders } from "@/lib/reminders";
import { AiAssistantModal } from "./AiAssistantModal";
import { CreatureAbilitiesPanel } from "./CreatureAbilitiesPanel";
import { CreatureHeader } from "./CreatureHeader";
import { CreatureHpHistoryModal } from "./CreatureHpHistoryModal";
import { CreatureStatBlock } from "./CreatureStatBlock";
import { EditCreatureModal } from "./EditCreatureModal";
import { AskAiPill } from "./ui/AskAiPill";
import { CreatureTimestampStatus } from "./ui/CreatureTimestampStatus";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { IconButton } from "./ui/IconButton";
import { Modal } from "./ui/Modal";
import { NotesSection } from "./ui/NotesSection";
import { QuickNotesSection } from "./ui/QuickNotesSection";
import { ReminderBadge } from "./ui/ReminderBadge";
import { StatusRail } from "./ui/StatusRail";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useScrollLock } from "@/hooks/useScrollLock";

/**
 * Same shape as `CharacterDetailsModal` — opened by clicking a creature's
 * header, same shell (top-aligned scroll container, Escape-to-close,
 * backdrop-scroll lock). Unlike the character modal, the stat-block part
 * isn't a superset of the compact card's content: a creature's card already
 * shows its full stat block with nothing hidden, so `CreatureStatBlock` is
 * the exact same shared body in both places — this modal just gives it more
 * room. Notes/Quick Notes do appear in both places (same as
 * `CharacterDetailsModal`) — the compact card keeps its own copies (Notes
 * read-only, Quick Notes editable) for a quick glance/jot without opening
 * anything, while this modal makes Notes itself editable too, a faster path
 * than the full `/creatures/[id]/edit` page for a quick mid-session update.
 */
export function CreatureDetailsModal({
  creature,
  owner,
  characters,
  onClose,
  onUpdate,
  onDuplicate,
  onClearHpHistory,
  onRemove,
}: {
  creature: Creature;
  owner?: Character;
  characters: Character[];
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Creature>) => void;
  onDuplicate?: () => void;
  onClearHpHistory?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [hpHistoryOpen, setHpHistoryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEscapeToClose(onClose);
  useScrollLock();

  return (
    <>
    <Modal
      variant="scrollable"
      onClose={onClose}
      // Deliberately not `items-center` — see the same note in
      // `CharacterDetailsModal`: a long stat block (many traits/legendary
      // actions) would otherwise clip its top above the viewport with no way
      // to scroll back up to it.
      header={
        <>
          <StatusRail
            conditions={creature.conditions}
            exhaustion={creature.exhaustion}
            concentrating={Boolean(creature.concentrating)}
            onToggleConcentration={onUpdate ? () => onUpdate(creature.id, { concentrating: !creature.concentrating }) : undefined}
            onConditionsChange={onUpdate ? (conditions) => onUpdate(creature.id, { conditions }) : undefined}
            onExhaustionChange={onUpdate ? (exhaustion) => onUpdate(creature.id, { exhaustion }) : undefined}
          />

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <CreatureHeader creature={creature} owner={owner} />
            </div>
            <IconButton onClick={onClose} aria-label="Close">
              ✕
            </IconButton>
          </div>
        </>
      }
      panelClassName={`relative my-4 w-full max-w-lg gap-4 p-4 shadow-2xl shadow-black/40 ${
        creature.concentrating
          ? "concentrating-ring border-violet-500 bg-slate-950 bg-gradient-to-b from-violet-950/60 to-slate-950"
          : "border-slate-800 bg-slate-950"
      }`}
    >
        {/* Created/edited timestamp (left) + reminder badge/AI pill/kebab
            (right) share one row — same placement, chips, and order as
            `CharacterDetailsModal`'s own sync+actions row, just with a
            last-edited stamp standing in for the D&D Beyond sync line a
            creature has no equivalent of. Same cluster as the compact card's
            own row (`CreatureCard`) — this modal is a superset of the card. */}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <CreatureTimestampStatus createdAt={creature.createdAt} updatedAt={creature.updatedAt} />
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
        <CreatureAbilitiesPanel creature={creature} onUpdate={onUpdate} />

        <NotesSection
          notes={creature.notes ?? ""}
          onChange={onUpdate ? (notes) => onUpdate(creature.id, { notes }) : undefined}
        />
        <QuickNotesSection
          notes={creature.quickNotes ?? []}
          onChange={onUpdate ? (quickNotes) => onUpdate(creature.id, { quickNotes }) : undefined}
        />
    </Modal>

    {hpHistoryOpen && (
      <CreatureHpHistoryModal
        creature={creature}
        onClear={onClearHpHistory ? () => onClearHpHistory(creature.id) : undefined}
        onClose={() => setHpHistoryOpen(false)}
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

    {aiOpen && (
      <AiAssistantModal
        name={creature.name}
        target={{ campaignId: creature.campaignId, creatureId: creature.id }}
        entity={creature}
        onClose={() => setAiOpen(false)}
      />
    )}
    </>
  );
}
