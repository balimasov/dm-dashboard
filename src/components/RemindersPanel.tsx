"use client";

import { Character, Creature, CreatureTrait } from "@/lib/types";
import { Avatar } from "./Avatar";
import { CollapsibleSection } from "./CollapsibleSection";
import { InfoTooltip } from "./InfoTooltip";
import { RichText } from "./RichText";
import { FlaggableRow } from "./ui/FlaggableRow";

const TRAIT_GROUP_LABELS: Record<NonNullable<CreatureTrait["group"]>, string> = {
  trait: "Trait",
  action: "Action",
  bonusAction: "Bonus Action",
  reaction: "Reaction",
  legendary: "Legendary Action",
};

/** Same shape as `FeaturePanel`/`SpellPanel` (`CharacterDetailsModal.tsx`) — a source/origin line plus the rules description — generalized across a character's Features/Spells and a creature's Traits, so every entry here gets the same standard hover-hint regardless of where it actually came from. */
function AbilityHint({ source, description }: { source?: string; description?: string }) {
  return (
    <div className="space-y-1">
      {source && <p className="text-xs uppercase tracking-wide text-slate-500">{source}</p>}
      {description ? (
        <p>
          <RichText text={description} />
        </p>
      ) : (
        <p className="text-slate-500">No description.</p>
      )}
    </div>
  );
}

interface ReminderEntry {
  name: string;
  hint: React.ReactNode;
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
    ...character.features
      .filter((f) => flagged.includes(f.name))
      .map((f) => ({ name: f.name, hint: <AbilityHint source={f.source} description={f.description} /> })),
    ...character.knownSpells
      .filter((s) => flagged.includes(s.name))
      .map((s) => ({ name: s.name, hint: <AbilityHint source={s.source} description={s.description} /> })),
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
      hint: <AbilityHint source={TRAIT_GROUP_LABELS[t.group ?? "trait"]} description={t.description} />,
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

  return (
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
          used elsewhere (Party/Companions/etc.) — an `overflow-x` container
          also forces its own `overflow-y` to compute as clipped rather than
          "visible" regardless of what's set (the same quirk documented on
          the Party row below), which cut off an `InfoTooltip` hint the
          moment it popped out past a short reminder card's own box. These
          groups are usually few and short, so wrapping to a second line
          reads better here anyway than a forced side-scroll. */}
      <div className="flex flex-wrap gap-3 px-3 pb-2">
        {groups.map((group) => (
          <div key={group.ownerId} className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 sm:w-[220px]">
            <div className="mb-2 flex items-center gap-2">
              <Avatar src={group.avatarUrl} label={group.ownerName} size="xs" />
              <p title={group.ownerName} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                {group.ownerName}
              </p>
            </div>
            <div className="space-y-0.5">
              {group.entries.map((entry) => (
                <FlaggableRow key={entry.name} flagged onToggleFlag={() => toggleOff(group, entry.name)}>
                  <InfoTooltip panel={entry.hint}>{entry.name}</InfoTooltip>
                </FlaggableRow>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
