"use client";

import { useState } from "react";
import { Character, Creature } from "@/lib/types";
import { ReminderGroup, characterReminders, creatureReminders } from "@/lib/reminders";
import { useDismissiblePopover } from "@/hooks/useDismissiblePopover";
import { Avatar } from "./Avatar";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { ROW_CARD_CLS } from "./ui/containerStyles";
import { QuickMenuPanel } from "./ui/QuickMenuPanel";
import { ReminderRow } from "./ui/ReminderRow";
import { REMINDER_LINK_TITLE_CLS } from "./ui/typography";

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
 *
 * Stacked directly above `QuickLinksButton` (same `right-5`, one button-
 * height-plus-gap higher) rather than sharing its `bottom-5` spot — the two
 * used to sit at the exact same fixed position, so this one silently covered
 * the quick-links button any session that had at least one reminder flagged.
 * That stacked position is conditional on `QuickLinksButton` actually being
 * there to stack above, though — a campaign with zero quick links renders
 * that button as `null` entirely (see its own early return), which used to
 * leave this one still floating at `bottom-20` over an empty gap where the
 * other button would have been. `hasQuickLinks` (the caller already knows
 * whether `QuickLinksButton` will render, from the same `links` prop) drops
 * this one down to that now-vacant `bottom-5` spot instead. Same
 * self-anchoring `absolute bottom-full` popover pattern as `QuickLinksButton`
 * too, so it opens upward from *this* button specifically instead of a
 * viewport-fixed offset that would need updating by hand if the stack order
 * ever changes again.
 */
export function RemindersFab({
  characters,
  creatures,
  onUpdateCharacter,
  onUpdateCreature,
  hasQuickLinks,
}: {
  characters: Character[];
  creatures: Creature[];
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onUpdateCreature: (id: string, updates: Partial<Creature>) => void;
  /** Whether `QuickLinksButton` is also rendered this session — see this component's own doc comment for why that decides which fixed slot this one takes. */
  hasQuickLinks: boolean;
}) {
  const { open, setOpen, containerRef } = useDismissiblePopover();
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [openCreatureId, setOpenCreatureId] = useState<string | null>(null);

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
          characters={characters}
          onClose={() => setOpenCreatureId(null)}
          onUpdate={onUpdateCreature}
        />
      )}

      <div ref={containerRef} className={`fixed right-5 z-40 ${hasQuickLinks ? "bottom-20" : "bottom-5"}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Reminders"
          title="Reminders"
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-slate-900 text-xl shadow-lg shadow-black/40 hover:bg-slate-800"
        >
          <span aria-hidden="true">🔥</span>
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-slate-950">
            {totalCount}
          </span>
        </button>

        {/* `overscroll-contain` — without it, dragging past this list's own
            top/bottom edge on a touch screen fell through to the dashboard
            page underneath and started scrolling *that* instead, since a
            nested scroller's "no more room to scroll" bounce chains to the
            next scrollable ancestor by default. This list is meant to be a
            self-contained overlay, not a window into the page behind it. */}
        {open && (
          <QuickMenuPanel
            icon={<span aria-hidden="true">🔥</span>}
            title="Reminders"
            count={totalCount}
            className="scrollbar-themed absolute bottom-full right-0 mb-2 max-h-[70vh] w-80 max-w-[calc(100vw-2.5rem)] overflow-y-auto overscroll-contain"
          >
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.ownerId} className={`${ROW_CARD_CLS} p-2`}>
                  <div className="mb-1.5 flex min-w-0 items-center gap-2">
                    <Avatar src={group.avatarUrl} label={group.ownerName} size="xs" />
                    <button
                      type="button"
                      onClick={() => openOwnerModal(group.ownerId)}
                      title={`Open ${group.ownerName}`}
                      className={REMINDER_LINK_TITLE_CLS}
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
          </QuickMenuPanel>
        )}
      </div>
    </>
  );
}
