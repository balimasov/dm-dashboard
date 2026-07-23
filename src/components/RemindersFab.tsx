"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { ReminderGroup, characterReminders, creatureReminders } from "@/lib/reminders";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { Avatar } from "./Avatar";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { ReminderRow } from "./ui/ReminderRow";

/**
 * Floating counterpart to the per-card `ReminderBadge` — where that one
 * answers "what does *this* card have flagged", this answers "what's
 * flagged anywhere right now", for the rarer moment a DM wants the full
 * picture (e.g. a scan before a session starts) without hunting down every
 * card one at a time. A fixed corner button rather than a dashboard block:
 * it costs no scroll space when there's nothing to check, and stays
 * reachable from anywhere on the page instead of requiring a trip back to
 * wherever `RemindersPanel` happens to be docked.
 *
 * Deliberately coexists with `RemindersPanel` for now rather than replacing
 * it — same underlying data and toggle-off behavior, just a second, more
 * situational way to reach it while this round of changes gets tried out.
 */
export function RemindersFab({
  characters,
  creatures,
  onUpdateCharacter,
  onUpdateCreature,
}: {
  characters: Character[];
  creatures: Creature[];
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onUpdateCreature: (id: string, updates: Partial<Creature>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [openCreatureId, setOpenCreatureId] = useState<string | null>(null);
  useEscapeToClose(() => setOpen(false), open);

  // Same hidden-character/creature exclusion as `RemindersPanel` — a card
  // taken off the dashboard for this session shouldn't resurface here.
  const groups = [
    ...characters.filter((c) => !c.hidden).map(characterReminders),
    ...creatures.filter((c) => !c.hidden).map(creatureReminders),
  ].filter((g): g is ReminderGroup => g !== null);
  const totalCount = groups.reduce((sum, g) => sum + g.entries.length, 0);

  const openCharacter = characters.find((c) => c.id === openCharacterId);
  const openCreature = creatures.find((c) => c.id === openCreatureId);

  if (totalCount === 0) return null;

  function toggleOff(group: ReminderGroup, name: string) {
    const character = characters.find((c) => c.id === group.ownerId);
    if (character) {
      onUpdateCharacter(character.id, { flaggedAbilities: (character.flaggedAbilities ?? []).filter((n) => n !== name) });
      return;
    }
    const creature = creatures.find((c) => c.id === group.ownerId);
    if (creature) {
      onUpdateCreature(creature.id, { flaggedTraits: (creature.flaggedTraits ?? []).filter((n) => n !== name) });
    }
  }

  function openOwnerModal(ownerId: string) {
    setOpen(false);
    if (characters.some((c) => c.id === ownerId)) {
      setOpenCharacterId(ownerId);
    } else {
      setOpenCreatureId(ownerId);
    }
  }

  return (
    <>
      {openCharacter && <CharacterDetailsModal character={openCharacter} onClose={() => setOpenCharacterId(null)} onUpdate={onUpdateCharacter} />}
      {openCreature && (
        <CreatureDetailsModal
          creature={openCreature}
          owner={characters.find((c) => c.id === openCreature.ownerCharacterId)}
          onClose={() => setOpenCreatureId(null)}
          onUpdate={onUpdateCreature}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`${totalCount} reminder${totalCount === 1 ? "" : "s"}`}
        title={`${totalCount} reminder${totalCount === 1 ? "" : "s"}`}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-slate-900 text-xl shadow-lg shadow-black/40 hover:bg-slate-800"
      >
        <span aria-hidden="true">🔥</span>
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-slate-950">
          {totalCount}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            className="scrollbar-themed fixed bottom-20 right-5 z-40 max-h-[70vh] w-80 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-slate-50">
              <span aria-hidden="true">🔥</span>
              Reminders
              <span className="font-normal text-slate-500">({totalCount})</span>
            </h2>
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.ownerId} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="mb-1.5 flex min-w-0 items-center gap-2">
                    <Avatar src={group.avatarUrl} label={group.ownerName} size="xs" />
                    <button
                      type="button"
                      onClick={() => openOwnerModal(group.ownerId)}
                      title={`Open ${group.ownerName}`}
                      className="min-w-0 max-w-full truncate text-left text-sm font-semibold text-slate-100 hover:opacity-80"
                    >
                      {group.ownerName}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {group.entries.map((entry) => (
                      <ReminderRow key={entry.name} entry={entry} onRemove={() => toggleOff(group, entry.name)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
