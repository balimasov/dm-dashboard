"use client";

import { useState } from "react";
import { Character, Creature, CreatureTrait } from "@/lib/types";
import { CONTENT_KIND_ICON, ContentKind } from "@/lib/contentKindIcons";
import { Avatar } from "./Avatar";
import { CharacterDetailsModal } from "./CharacterDetailsModal";
import { CollapsibleSection } from "./CollapsibleSection";
import { CreatureDetailsModal } from "./CreatureDetailsModal";
import { InfoTooltip } from "./InfoTooltip";
import { AbilityHintPanel } from "./ui/AbilityHintPanel";
import { AttackName } from "./ui/AttackDisplay";
import { FlaggableRow } from "./ui/FlaggableRow";

const TRAIT_GROUP_LABELS: Record<NonNullable<CreatureTrait["group"]>, string> = {
  trait: "Trait",
  action: "Action",
  bonusAction: "Bonus Action",
  reaction: "Reaction",
  legendary: "Legendary Action",
};

interface ReminderEntry {
  /** Identity key — used for `flaggedAbilities`/`flaggedTraits` matching and the toggle-off click, never rendered directly (see `content`). */
  name: string;
  /** The fully-rendered row content — a plain hinted name for a feature/spell, or the shared, rarity-colored `AttackName` for a weapon attack. */
  content: React.ReactNode;
  /** Which `CONTENT_KIND_ICON` glyph this row gets — same one shown on the matching tab, so a DM can tell a weapon reminder from a feature/spell one at a glance in a group that mixes all three. A creature trait uses "features", the closest match (same "ability with a description" shape as a character's own Features and Traits tab). */
  kind: ContentKind;
}

interface ReminderGroup {
  ownerId: string;
  ownerName: string;
  avatarUrl?: string;
  entries: ReminderEntry[];
}

function characterReminders(character: Character): ReminderGroup | null {
  const flagged = character.flaggedAbilities ?? [];
  if (flagged.length === 0) return null;
  const entries: ReminderEntry[] = [
    ...character.attacks
      .filter((a) => flagged.includes(a.name))
      .map((a) => ({
        name: a.name,
        content: <AttackName attack={a} />,
        kind: "weapons" as const,
      })),
    ...character.features
      .filter((f) => flagged.includes(f.name))
      .map((f) => ({
        name: f.name,
        content: (
          <InfoTooltip
            panel={<AbilityHintPanel name={f.name} metaLines={[f.source]} description={f.description} emptyDescription="No description." />}
          >
            {f.name}
          </InfoTooltip>
        ),
        kind: "features" as const,
      })),
    ...character.knownSpells
      .filter((s) => flagged.includes(s.name))
      .map((s) => ({
        name: s.name,
        content: (
          <InfoTooltip
            panel={
              <AbilityHintPanel
                name={s.name}
                subtitle={s.school}
                metaLines={[[s.source, s.components].filter(Boolean).join(" · ")]}
                note={s.materialComponent && `Material: ${s.materialComponent}`}
                description={s.description}
                emptyDescription="No description."
              />
            }
          >
            {s.name}
          </InfoTooltip>
        ),
        kind: "spells" as const,
      })),
  ];
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { ownerId: character.id, ownerName: character.name, avatarUrl: character.avatarUrl, entries };
}

function creatureReminders(creature: Creature): ReminderGroup | null {
  const flagged = creature.flaggedTraits ?? [];
  if (flagged.length === 0) return null;
  const entries: ReminderEntry[] = creature.traits
    .filter((t) => flagged.includes(t.name))
    .map((t) => ({
      name: t.name,
      content: (
        <InfoTooltip
          panel={
            <AbilityHintPanel
              name={t.name}
              metaLines={[TRAIT_GROUP_LABELS[t.group ?? "trait"]]}
              description={t.description}
              emptyDescription="No description."
            />
          }
        >
          {t.name}
        </InfoTooltip>
      ),
      kind: "features" as const,
    }));
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { ownerId: creature.id, ownerName: creature.name, avatarUrl: creature.avatarUrl, entries };
}

/**
 * A quick-glance strip of every ability/trait either the DM or a player has
 * flagged with the reminder flame (`FlaggableRow`, used on a character's
 * Features/Spells and a creature's Traits) — collected from every card into
 * one place, since the whole point of flagging something is not having to
 * remember which specific card it's hiding on mid-session.
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
              <button
                type="button"
                onClick={() => openOwnerModal(group.ownerId)}
                title={`Open ${group.ownerName}`}
                className="mb-2 flex w-full items-center gap-2 text-left hover:opacity-80"
              >
                <Avatar src={group.avatarUrl} label={group.ownerName} size="xs" />
                <p title={group.ownerName} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                  {group.ownerName}
                </p>
              </button>
              <div className="space-y-0.5">
                {group.entries.map((entry) => (
                  <FlaggableRow key={entry.name} flagged onToggleFlag={() => toggleOff(group, entry.name)}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span aria-hidden="true" className="shrink-0 text-xs leading-none">
                        {CONTENT_KIND_ICON[entry.kind]}
                      </span>
                      <span className="min-w-0 flex-1">{entry.content}</span>
                    </span>
                  </FlaggableRow>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </>
  );
}
