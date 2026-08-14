"use client";

import { useState } from "react";
import { Character, CustomConditionTemplate } from "@/lib/types";
import { characterReminders } from "@/lib/reminders";
import { characterSyncIssue } from "@/lib/sync";
import { useCardSortable } from "@/hooks/useCardSortable";
import { useDdbSync } from "@/hooks/useDdbSync";
import { AiAssistantModal } from "./AiAssistantModal";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { CharacterStatBlock } from "./CharacterStatBlock";
import { CharacterStatusRail } from "./CharacterStatusRail";
import { EditCharacterModal } from "./EditCharacterModal";
import { CharacterHeader } from "./CharacterHeader";
import { AskAiPill } from "./ui/AskAiPill";
import { ENTITY_CARD_BASE_CLS, TOOLBAR_ROW_CLS } from "./ui/containerStyles";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";
import { ReminderBadge } from "./ui/ReminderBadge";
import { SyncIssuePill } from "./ui/SyncIssuePill";
import { SyncStatusChip } from "./ui/SyncStatusChip";
import { NotesSection } from "./ui/NotesSection";

export function CharacterCard({
  character,
  onRemove,
  onUpdate,
  dragEnabled = false,
  customConditionLibrary = [],
  onCustomConditionLibraryChange,
}: {
  character: Character;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Character>) => void;
  /** Reordering is DM-only, matching `/api/characters/reorder` — a player still sees the same card, just without the drag affordance on its header. */
  dragEnabled?: boolean;
  /** The campaign's shared custom-conditions library — see `CustomConditionTemplate`'s own doc comment. */
  customConditionLibrary?: CustomConditionTemplate[];
  onCustomConditionLibraryChange?: (library: CustomConditionTemplate[]) => void;
}) {
  const c = character;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { syncing, sync } = useDdbSync(c, onUpdate);
  const syncIssue = characterSyncIssue(c);
  const { setNodeRef, style, dragHandleProps, isDragging } = useCardSortable(c.id, dragEnabled);
  // Advantage display is temporarily hidden (parsing/data model stays intact) — see c.advantages.

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col gap-3.5 p-3.5 ${ENTITY_CARD_BASE_CLS} ${
        isDragging
          ? "z-20 border-sky-500 bg-slate-900/60 shadow-2xl shadow-black/40"
          : c.concentrating
            ? "concentrating-ring border-violet-500 bg-violet-950/10"
            : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <CharacterStatusRail
        character={c}
        onUpdate={onUpdate}
        customConditionLibrary={customConditionLibrary}
        onCustomConditionLibraryChange={onCustomConditionLibraryChange}
      />

      {/* Header — D&D Beyond link now lives inline on its own "Lvl N" line
          (see `CharacterHeader`), and any sync problem shows as the
          toolbar's own `SyncIssuePill` below plus the header's avatar-corner
          dot — no separate banner needed here anymore (a prior version had
          both at once, confirmed redundant against a real screenshot: the
          old amber "Not synced"/error text sat right next to the new pill
          saying the same thing). */}
      <CharacterHeader character={c} onClick={() => setDetailsOpen(true)} dragHandleProps={dragHandleProps} />

      {/* Reminder/AI/kebab — one bordered toolbar instead of a bare flex
          row (the row used to read as controls scattered in a spot, not a
          panel). No internal dividers — reminder/AI stay their established
          pill look, the kebab its own icon button, grouped only by the
          shared border/background. */}
      <div className={TOOLBAR_ROW_CLS}>
        <AskAiPill onClick={() => setAiOpen(true)} />
        <SyncStatusChip
          dndBeyondUrl={c.dndBeyondUrl}
          syncing={syncing}
          lastSyncedAt={c.lastSyncedAt}
          onSync={onUpdate && c.dndBeyondUrl ? sync : undefined}
        />
        <ReminderBadge
          group={characterReminders(c)}
          onRemove={onUpdate ? (name) => onUpdate(c.id, { flaggedAbilities: (c.flaggedAbilities ?? []).filter((n) => n !== name) }) : undefined}
        />
        {syncIssue && (
          <SyncIssuePill
            label={syncIssue.label}
            message={syncIssue.message}
            onRetry={onUpdate ? sync : undefined}
            syncing={syncing}
          />
        )}
        <div className="ml-auto">
          <EntityActionsMenu
            onEdit={() => setEditOpen(true)}
            name={c.name}
            hidden={c.hidden}
            onToggleHidden={onUpdate ? () => onUpdate(c.id, { hidden: !c.hidden }) : undefined}
            linkUrl={c.dndBeyondUrl}
            linkLabel="Open D&D Beyond"
            onSync={onUpdate && c.dndBeyondUrl ? sync : undefined}
            syncing={syncing}
            onRemove={onRemove ? () => onRemove(c.id) : undefined}
          />
        </div>
      </div>

      <CharacterStatBlock character={c} compact alwaysShowSenses showAllSkills={false} />

      <NotesSection notes={c.notes} compact />

      {detailsOpen && (
        <CharacterDetailsModal
          character={c}
          onClose={() => setDetailsOpen(false)}
          onUpdate={onUpdate}
          onRemove={onRemove}
          customConditionLibrary={customConditionLibrary}
          onCustomConditionLibraryChange={onCustomConditionLibraryChange}
        />
      )}

      {editOpen && onUpdate && (
        <EditCharacterModal character={c} onClose={() => setEditOpen(false)} onUpdate={onUpdate} />
      )}

      {aiOpen && (
        <AiAssistantModal
          name={c.name}
          target={{ campaignId: c.campaignId, characterId: c.id }}
          entity={c}
          customConditionLibrary={customConditionLibrary}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}
