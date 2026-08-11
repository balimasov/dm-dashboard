"use client";

import { Character } from "@/lib/types";
import { characterInfoLine } from "@/lib/format";
import { useDdbSync } from "@/hooks/useDdbSync";
import { CharacterAvatar } from "./CharacterAvatar";
import { RosterRow } from "./RosterRow";
import { DdbSyncStatus } from "./ui/DdbSyncStatus";
import { EntityActionsMenu } from "./ui/EntityActionsMenu";

/** Same `useDdbSync` hook `CharacterCard`'s own kebab menu uses — this row's "Sync" action used to be missing entirely, having drifted from the card's menu since nothing here ever fed `EntityActionsMenu` an `onSync`. Calling the exact same hook here (instead of hand-rolling a second sync trigger) is what keeps the two menus identical by construction rather than by remembering to update both. */
export function SortableCharacterRow({
  character,
  onUpdate,
  onEdit,
  onRemove,
  onToggleHidden,
}: {
  character: Character;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  onEdit: (character: Character) => void;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string) => void;
}) {
  const { syncing, sync } = useDdbSync(character, onUpdate);

  return (
    <RosterRow
      id={character.id}
      dimmed={character.hidden}
      avatar={<CharacterAvatar character={character} />}
      actions={
        <EntityActionsMenu
          onEdit={() => onEdit(character)}
          name={character.name}
          hidden={character.hidden}
          onToggleHidden={() => onToggleHidden(character.id)}
          onSync={character.dndBeyondUrl ? sync : undefined}
          syncing={syncing}
          onRemove={() => onRemove(character.id)}
        />
      }
    >
      <p
        title={character.name}
        className="truncate text-lg font-semibold text-slate-100 transition-colors hover:text-white"
      >
        {character.name}
        {character.hidden && <span className="ml-2 text-xs font-normal text-slate-500">(hidden)</span>}
      </p>
      <p
        title={characterInfoLine(character)}
        className="truncate text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        {characterInfoLine(character)}
      </p>
      <p className="text-xs text-slate-600">Lvl {character.level}</p>
      <div className="mt-1">
        <DdbSyncStatus
          dndBeyondUrl={character.dndBeyondUrl}
          synced={character.synced}
          lastSyncedAt={character.lastSyncedAt}
          syncing={syncing}
        />
      </div>
    </RosterRow>
  );
}
