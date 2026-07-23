"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { ReminderGroup, characterReminders, creatureReminders } from "@/lib/reminders";
import { Avatar } from "./Avatar";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { CollapsibleSection } from "./CollapsibleSection";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { ReminderRow } from "./ui/ReminderRow";

/**
 * A quick-glance strip of every ability/trait/item either the DM or a player
 * has flagged with the reminder flame (`FlaggableRow`, used on a character's
 * Weapons/Features/Spells/Consumables and a creature's Traits) — collected
 * from every card into one place, since the whole point of flagging
 * something is not having to remember which specific card it's hiding on
 * mid-session.
 *
 * Renders nothing at all when nobody has flagged anything yet (same
 * convention as `QuickLinksButton`), so it stays invisible for a DM who
 * doesn't use the flame feature. Once there's something to show, it's a
 * `CollapsibleSection` like every other dashboard block — collapsing it is
 * the "off switch" for a session where the reminders aren't needed, without
 * losing what's flagged (it reappears expanded again, same as any other
 * section, the moment there's new content or the cookie says so).
 */
export function RemindersPanel({
  characters,
  creatures,
  onUpdateCharacter,
  onUpdateCreature,
  storageKey,
  initialOpen,
}: {
  characters: Character[];
  creatures: Creature[];
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onUpdateCreature: (id: string, updates: Partial<Creature>) => void;
  storageKey: string;
  initialOpen: boolean;
}) {
  // A hidden character/creature is deliberately off the dashboard for this
  // session — its flagged reminders shouldn't surface here either, since
  // that would defeat the point of hiding it in the first place.
  const groups = [
    ...characters.filter((c) => !c.hidden).map(characterReminders),
    ...creatures.filter((c) => !c.hidden).map(creatureReminders),
  ].filter((g): g is ReminderGroup => g !== null);
  const totalCount = groups.reduce((sum, g) => sum + g.entries.length, 0);

  // Reminders renders its own instance of the details modal rather than
  // reaching into whichever `CharacterCard`/`CreatureCard` happens to be on
  // the dashboard — that card's own `detailsOpen` state is local to it and
  // isn't reachable from here, and a card for a hidden or currently-
  // collapsed section might not even be mounted. Opening a fresh modal
  // instance for the clicked owner's real data sidesteps all of that.
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [openCreatureId, setOpenCreatureId] = useState<string | null>(null);
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
      <CollapsibleSection
        title={
          <>
            <span aria-hidden="true" className="mr-2">
              🔥
            </span>
            Reminders
            <span className="ml-2 whitespace-nowrap text-base font-normal text-slate-500">
              ({totalCount} reminder{totalCount === 1 ? "" : "s"})
            </span>
          </>
        }
        storageKey={storageKey}
        initialOpen={initialOpen}
      >
        <p className="mb-4 px-3 text-sm text-slate-500">
          Abilities flagged with the reminder flame across every character and creature — the ones easy to forget mid-session.
        </p>
        {/* `flex-wrap` instead of the `overflow-x-auto` horizontal-scroll rows
            used elsewhere (Party/Companions/etc.) — originally chosen to dodge
            an `InfoTooltip` hint getting clipped by that kind of container's
            forced `overflow-y` (now fixed at the root in `InfoTooltip` itself,
            which portals its panel out to `document.body` instead of nesting
            it under whatever ancestor happens to scroll). Kept as `flex-wrap`
            anyway — these groups are usually few and short, so wrapping to a
            second line still reads better here than a forced side-scroll. */}
        <div className="flex flex-wrap gap-3 px-3 pb-2">
          {groups.map((group) => (
            <div key={group.ownerId} className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 sm:w-[220px]">
              <div className="mb-2 flex min-w-0 items-center gap-2">
                <Avatar src={group.avatarUrl} label={group.ownerName} size="xs" />
                {/* Deliberately not `flex-1` — the click zone should hug the
                    name text itself, not stretch across whatever blank space
                    is left in the row for a short name (opposite of the
                    ability rows below, which widen the *opposite* direction
                    for exactly the reason explained there). */}
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
      </CollapsibleSection>
    </>
  );
}
